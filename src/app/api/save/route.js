import { NextResponse } from 'next/server';
import { sanitizeUserId } from '../../../lib/db/connection.js';
import { saveUserData } from '../../../lib/db/user-repository.js';
import { authErrorResponse, verifyRequestUser } from '../../../lib/auth/verify-api-request.js';

export async function POST(request) {
  try {
    const payload = await request.json();
    const { data, credential } = payload;

    if (!data || !data.profile || !data.links) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    const user = await verifyRequestUser(request, { credential });
    const userId = sanitizeUserId(user.sub);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid user identity' }, { status: 400 });
    }

    const saved = saveUserData(userId, data);

    return NextResponse.json({
      success: true,
      message: 'Saved successfully',
      slug: saved.slug,
    });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return authErrorResponse(error);
    }

    console.error('Failed to save links configuration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save configuration', code: error.code || 'SAVE_FAILED' },
      { status: 400 }
    );
  }
}

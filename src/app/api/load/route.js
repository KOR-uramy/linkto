import { NextResponse } from 'next/server';
import { sanitizeUserId } from '../../../lib/db/connection.js';
import { loadOrCreateUser, resolvePublicHandle } from '../../../lib/db/user-repository.js';
import { authErrorResponse, verifyRequestUser } from '../../../lib/auth/verify-api-request.js';

function toPublicPayload(data) {
  const { id, ...publicData } = data;
  return publicData;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get('handle');

    if (handle) {
      const data = resolvePublicHandle(handle);
      if (!data) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(toPublicPayload(data));
    }

    const user = await verifyRequestUser(request);
    const userId = sanitizeUserId(user.sub);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid user identity' }, { status: 400 });
    }

    const name = searchParams.get('name') || user.name || '';
    const picture = searchParams.get('picture') || user.picture || '';
    const data = loadOrCreateUser(userId, { name, picture });
    return NextResponse.json(data);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return authErrorResponse(error);
    }

    console.error('Failed to load user configuration:', error);
    return NextResponse.json(
      { error: 'Failed to load configuration', details: error.message },
      { status: 500 }
    );
  }
}

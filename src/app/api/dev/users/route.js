import { NextResponse } from 'next/server';
import { verifyGoogleToken } from '../../../../lib/auth/verify-google-token';
import { isDeveloperUser } from '../../../../config/developer.js';
import { listUsersSummary } from '../../../../lib/db/user-repository.js';

export async function POST(request) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json({ error: 'credential is required' }, { status: 400 });
    }

    const user = await verifyGoogleToken(credential);

    if (!isDeveloperUser(user, { server: true })) {
      return NextResponse.json({ error: 'Developer access required' }, { status: 403 });
    }

    const users = listUsersSummary().map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Developer users API failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load users' },
      { status: 401 }
    );
  }
}

import { NextResponse } from 'next/server';
import { verifyGoogleToken } from '../../../../lib/auth/verify-google-token';

export async function POST(request) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json({ error: 'credential is required' }, { status: 400 });
    }

    const user = await verifyGoogleToken(credential);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Google auth verification failed:', error);
    return NextResponse.json(
      { error: 'Google login verification failed', details: error.message },
      { status: 401 }
    );
  }
}

import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID_SERVER } from '../../config/google';

const client = GOOGLE_CLIENT_ID_SERVER ? new OAuth2Client(GOOGLE_CLIENT_ID_SERVER) : null;

export async function verifyGoogleToken(credential) {
  if (!client || !GOOGLE_CLIENT_ID_SERVER) {
    throw new Error('Google OAuth client ID is not configured');
  }

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID_SERVER,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub) {
    throw new Error('Invalid Google token payload');
  }

  return {
    sub: payload.sub,
    name: payload.name || '구글 유저',
    email: payload.email || '',
    picture: payload.picture || '',
  };
}

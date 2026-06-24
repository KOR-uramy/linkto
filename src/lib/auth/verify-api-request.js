import { verifyGoogleToken } from './verify-google-token.js';

export function getBearerCredential(request) {
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return '';
}

export async function verifyRequestUser(request, { credential } = {}) {
  const token = credential || getBearerCredential(request);
  if (!token) {
    const error = new Error('인증이 필요합니다.');
    error.status = 401;
    throw error;
  }

  return verifyGoogleToken(token);
}

export function authErrorResponse(error) {
  const status = error.status === 403 ? 403 : 401;
  return Response.json(
    {
      error: error.message || '인증에 실패했습니다.',
      code: status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
    },
    { status }
  );
}

import { apiUrl } from './api';
import { getAuthHeaders } from './auth/api-headers';

/** 로그인 사용자 프로필·링크·slug를 서버에서 불러옵니다. */
export async function fetchAuthenticatedProfile({ signal } = {}) {
  const res = await fetch(apiUrl('/api/load'), {
    headers: getAuthHeaders(),
    signal,
  });

  if (!res.ok) {
    return { ok: false, status: res.status, data: null };
  }

  const data = await res.json();
  return { ok: true, status: res.status, data };
}

import { apiUrl } from '../api';
import { getAuthHeaders } from './api-headers';

const USER_STORAGE_KEY = 'linkto_user';

export async function signInWithGoogleCredential(credential) {
  const res = await fetch(apiUrl('/api/auth/google'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Google login failed');
  }

  const user = data.user;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  sessionStorage.setItem('linkto_google_credential', credential);

  const loadRes = await fetch(
    apiUrl(
      `/api/load?name=${encodeURIComponent(user.name)}&picture=${encodeURIComponent(user.picture)}`
    ),
    { headers: getAuthHeaders() }
  );

  if (loadRes.ok) {
    const profile = await loadRes.json();
    const withSlug = { ...user, slug: profile.slug || '' };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(withSlug));
    return withSlug;
  }

  return user;
}

export function updateStoredUser(updates) {
  const current = getStoredUser();
  if (!current) {
    return null;
  }
  const next = { ...current, ...updates };
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function getStoredUser() {
  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function signOutUser() {
  localStorage.removeItem(USER_STORAGE_KEY);
  sessionStorage.removeItem('linkto_google_credential');
}

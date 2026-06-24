const USER_STORAGE_KEY = 'linkto_user';

export async function signInWithGoogleCredential(credential) {
  const res = await fetch('/api/auth/google', {
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

  await fetch(
    `/api/load?userId=${user.sub}&name=${encodeURIComponent(user.name)}&picture=${encodeURIComponent(user.picture)}`
  );

  return user;
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
}

export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

export function getPublicAppUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return APP_URL;
}

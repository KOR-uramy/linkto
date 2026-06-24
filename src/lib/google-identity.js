import { GOOGLE_CLIENT_ID, isGoogleLoginConfigured } from '../config/google';

let initialized = false;
let activeCallback = null;

export function isGoogleIdentityAvailable() {
  return isGoogleLoginConfigured() && typeof window !== 'undefined' && Boolean(window.google);
}

export function registerGoogleCredentialHandler(callback) {
  activeCallback = callback;
}

export function initGoogleIdentityOnce() {
  if (!isGoogleLoginConfigured() || typeof window === 'undefined' || !window.google) {
    return false;
  }

  if (!initialized) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        activeCallback?.(response);
      },
    });
    initialized = true;
  }

  return true;
}

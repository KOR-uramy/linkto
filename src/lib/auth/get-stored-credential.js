const CREDENTIAL_KEY = 'linkto_google_credential';

export function getStoredCredential() {
  if (typeof window === 'undefined') {
    return '';
  }
  return sessionStorage.getItem(CREDENTIAL_KEY) || '';
}

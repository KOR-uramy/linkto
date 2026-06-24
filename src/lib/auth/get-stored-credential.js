const CREDENTIAL_KEY = 'linkto_google_credential';

export function storeCredential(credential) {
  if (typeof window === 'undefined' || !credential) {
    return;
  }
  localStorage.setItem(CREDENTIAL_KEY, credential);
  sessionStorage.setItem(CREDENTIAL_KEY, credential);
}

export function getStoredCredential() {
  if (typeof window === 'undefined') {
    return '';
  }

  const fromLocal = localStorage.getItem(CREDENTIAL_KEY) || '';
  if (fromLocal) {
    return fromLocal;
  }

  const fromSession = sessionStorage.getItem(CREDENTIAL_KEY) || '';
  if (fromSession) {
    localStorage.setItem(CREDENTIAL_KEY, fromSession);
    return fromSession;
  }

  return '';
}

export function clearStoredCredential() {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(CREDENTIAL_KEY);
  sessionStorage.removeItem(CREDENTIAL_KEY);
}

export function hasStoredCredential() {
  return !!getStoredCredential();
}

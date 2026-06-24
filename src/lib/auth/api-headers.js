import { getStoredCredential } from './get-stored-credential';

export function getAuthHeaders(extra = {}) {
  const credential = getStoredCredential();
  if (!credential) {
    return { ...extra };
  }

  return {
    ...extra,
    Authorization: `Bearer ${credential}`,
  };
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GOOGLE_OAUTH_SECRETS_PATH = path.join(ROOT, 'secrets', 'google-oauth-client.json');

export function loadGoogleOAuthSecrets() {
  try {
    if (!fs.existsSync(GOOGLE_OAUTH_SECRETS_PATH)) {
      return null;
    }

    const data = JSON.parse(fs.readFileSync(GOOGLE_OAUTH_SECRETS_PATH, 'utf8'));
    const web = data.web || data.installed;
    if (!web?.client_id) {
      return null;
    }

    return {
      clientId: web.client_id,
      clientSecret: web.client_secret || '',
      projectId: web.project_id || '',
    };
  } catch {
    return null;
  }
}

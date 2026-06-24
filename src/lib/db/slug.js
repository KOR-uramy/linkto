import { getSlugValidationError, normalizeSlugInput } from '../slug-utils.js';
import { getDb } from './connection.js';

export { normalizeSlugInput as normalizeSlug };

function randomSlug(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function isUniqueConstraintError(error) {
  return error?.code === 'SQLITE_CONSTRAINT_UNIQUE' || error?.code === 'SQLITE_CONSTRAINT';
}

function findUserIdBySlug(slug) {
  const database = getDb();
  return database.prepare('SELECT id FROM users WHERE slug = ? COLLATE NOCASE').get(slug)?.id || null;
}

export function generateUniqueSlug() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = randomSlug(attempt < 20 ? 6 : 8);
    if (getSlugValidationError(candidate)) {
      continue;
    }
    if (!findUserIdBySlug(candidate)) {
      return candidate;
    }
  }
  throw new Error('Failed to generate unique slug');
}

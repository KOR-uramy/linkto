import { DEFAULT_PROFILE } from '../../config/database.js';
import {
  generateUniqueSlug,
  isUniqueConstraintError,
  normalizeSlug,
} from './slug.js';
import { getDb } from './connection.js';

function rowToPayload(row) {
  return {
    id: row.id,
    slug: row.slug,
    profile: {
      name: row.name,
      bio: row.bio,
      avatar: row.avatar,
      socials: JSON.parse(row.socials_json || '[]'),
    },
    links: JSON.parse(row.links_json || '[]'),
  };
}

function assignSlugWithRetry(userId) {
  const database = getDb();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = generateUniqueSlug();
    try {
      database.prepare('UPDATE users SET slug = ? WHERE id = ?').run(slug, userId);
      return slug;
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }
  throw new Error('Failed to assign unique slug');
}

function ensureSlug(row) {
  if (row.slug) {
    return row;
  }
  const slug = assignSlugWithRetry(row.id);
  return { ...row, slug };
}

export function getUserById(userId) {
  const database = getDb();
  const row = database.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  return row ? rowToPayload(ensureSlug(row)) : null;
}

export function getUserBySlug(slug) {
  const database = getDb();
  const normalized = normalizeSlug(slug);
  const row = database
    .prepare('SELECT * FROM users WHERE slug = ? COLLATE NOCASE')
    .get(normalized);
  return row ? rowToPayload(row) : null;
}

export function resolvePublicHandle(handle) {
  if (!handle) {
    return null;
  }
  return getUserBySlug(handle) || getUserById(handle);
}

export function listPublicSlugs() {
  const database = getDb();
  return database
    .prepare("SELECT slug FROM users WHERE slug IS NOT NULL AND slug != ''")
    .all()
    .map((row) => row.slug);
}

export function listUsersSummary() {
  const database = getDb();
  return database
    .prepare(
      `SELECT id, slug, name, updated_at
       FROM users
       ORDER BY datetime(updated_at) DESC`
    )
    .all();
}

export function createUserData(userId, { name = '', picture = '' } = {}) {
  const database = getDb();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = generateUniqueSlug();
    const payload = {
      id: userId,
      slug,
      profile: {
        ...DEFAULT_PROFILE,
        name: name || DEFAULT_PROFILE.name,
        avatar: picture || DEFAULT_PROFILE.avatar,
      },
      links: [],
    };

    try {
      database
        .prepare(
          `INSERT INTO users (id, slug, name, bio, avatar, socials_json, links_json)
           VALUES (@id, @slug, @name, @bio, @avatar, @socials_json, @links_json)`
        )
        .run({
          id: userId,
          slug,
          name: payload.profile.name,
          bio: payload.profile.bio,
          avatar: payload.profile.avatar,
          socials_json: JSON.stringify(payload.profile.socials),
          links_json: JSON.stringify(payload.links),
        });
      return payload;
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  throw new Error('Failed to create user with unique slug');
}

export function loadOrCreateUser(userId, { name = '', picture = '' } = {}) {
  const existing = getUserById(userId);
  if (existing) {
    return existing;
  }
  return createUserData(userId, { name, picture });
}

export function incrementLinkClick(handle, linkId) {
  const row = resolvePublicHandle(handle);
  if (!row) {
    return null;
  }

  const hasLink = row.links.some((link) => link.id === linkId);
  if (!hasLink) {
    return null;
  }

  const updatedLinks = row.links.map((link) =>
    link.id === linkId ? { ...link, clicks: (link.clicks || 0) + 1 } : link
  );

  saveUserData(row.id, { profile: row.profile, links: updatedLinks });
  return updatedLinks.find((link) => link.id === linkId)?.clicks ?? null;
}

export function saveUserData(userId, data) {
  const database = getDb();
  const profile = data.profile || {};
  const links = data.links || [];

  const persist = database.transaction(() => {
    if (!getUserById(userId)) {
      createUserData(userId);
    }

    database
      .prepare(
        `UPDATE users SET
           name = @name,
           bio = @bio,
           avatar = @avatar,
           socials_json = @socials_json,
           links_json = @links_json,
           updated_at = datetime('now')
         WHERE id = @id`
      )
      .run({
        id: userId,
        name: profile.name || DEFAULT_PROFILE.name,
        bio: profile.bio ?? DEFAULT_PROFILE.bio,
        avatar: profile.avatar || '',
        socials_json: JSON.stringify(profile.socials ?? []),
        links_json: JSON.stringify(links),
      });
  });

  persist();
  return getUserById(userId);
}

export function upsertUserFromJson(userId, jsonData) {
  saveUserData(userId, jsonData);
  const row = getUserById(userId);
  if (!row?.slug) {
    assignSlugWithRetry(userId);
  }
}

export const getUserData = getUserById;

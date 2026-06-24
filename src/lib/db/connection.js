import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DB_PATH } from '../../config/database.js';

let db;

function ensureSlugColumn(database) {
  const columns = database.prepare('PRAGMA table_info(users)').all();
  const hasSlug = columns.some((column) => column.name === 'slug');
  if (!hasSlug) {
    database.exec('ALTER TABLE users ADD COLUMN slug TEXT');
  }
  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_slug ON users(slug);
  `);
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'My LinkTo',
      bio TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL DEFAULT '',
      socials_json TEXT NOT NULL DEFAULT '[]',
      links_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);
  `);

  ensureSlugColumn(database);
}

export function getDb() {
  if (db) {
    return db;
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  initSchema(db);
  return db;
}

export function sanitizeUserId(userId) {
  if (!userId) {
    return '';
  }
  return userId.replace(/[^a-zA-Z0-9_-]/g, '');
}

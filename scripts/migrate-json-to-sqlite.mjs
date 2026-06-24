import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../src/lib/db/connection.js';
import { getUserData, upsertUserFromJson } from '../src/lib/db/user-repository.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const USERS_DIR = path.join(ROOT, 'src', 'data', 'users');

function migrateJsonFile(filePath) {
  const userId = path.basename(filePath, '.json');
  if (getUserData(userId)) {
    console.log(`skip (exists): ${userId}`);
    return 'skipped';
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  upsertUserFromJson(userId, data);
  console.log(`migrated: ${userId}`);
  return 'migrated';
}

console.log('==> SQLite migration from JSON');
getDb();

if (!fs.existsSync(USERS_DIR)) {
  console.log('No src/data/users directory — nothing to migrate.');
  process.exit(0);
}

const files = fs.readdirSync(USERS_DIR).filter((file) => file.endsWith('.json'));
let migrated = 0;
let skipped = 0;

for (const file of files) {
  const result = migrateJsonFile(path.join(USERS_DIR, file));
  if (result === 'migrated') migrated += 1;
  else skipped += 1;
}

console.log(`==> Done: ${migrated} migrated, ${skipped} skipped`);

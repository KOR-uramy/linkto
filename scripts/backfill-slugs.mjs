import { getDb } from '../src/lib/db/connection.js';
import { generateUniqueSlug } from '../src/lib/db/slug.js';

console.log('==> Backfill missing slugs');
const database = getDb();
const rows = database.prepare("SELECT id FROM users WHERE slug IS NULL OR slug = ''").all();

for (const row of rows) {
  const slug = generateUniqueSlug();
  database.prepare('UPDATE users SET slug = ? WHERE id = ?').run(slug, row.id);
  console.log(`assigned ${slug} -> ${row.id}`);
}

console.log(`==> Done (${rows.length} users updated)`);

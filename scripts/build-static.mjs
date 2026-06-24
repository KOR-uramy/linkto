import { execSync } from 'child_process';
import { existsSync, mkdirSync, renameSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const API_DIR = path.join(ROOT, 'src', 'app', 'api');
const API_BAK = path.join(ROOT, '.static-build', 'api');

function moveApiAside() {
  if (existsSync(API_DIR)) {
    if (existsSync(API_BAK)) {
      throw new Error('Stale api backup exists. Remove .static-build/api first.');
    }
    mkdirSync(path.dirname(API_BAK), { recursive: true });
    renameSync(API_DIR, API_BAK);
  }
}

function restoreApi() {
  if (existsSync(API_BAK)) {
    if (existsSync(API_DIR)) {
      renameSync(API_DIR, `${API_DIR}.__orphan__`);
    }
    renameSync(API_BAK, API_DIR);
  }
}

moveApiAside();

try {
  execSync('npm run build', {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, BUILD_TARGET: 'static' },
  });
  console.log('Static export ready in out/');
} finally {
  restoreApi();
}

/**
 * Build Search Engine Frontend (React/Vite) into search-engine/public
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SEARCH_DIR = path.join(ROOT_DIR, 'search-engine');

try {
  console.log('[BUILD-SEARCH] 🚀 Building Search Engine frontend with Vite...');
  execSync('npx vite build', { cwd: SEARCH_DIR, stdio: 'inherit' });
  console.log('[BUILD-SEARCH] ✅ Search Engine client built successfully!');
} catch (err) {
  console.error('[BUILD-SEARCH] ❌ Failed to build search engine client:', err.message);
  process.exit(1);
}

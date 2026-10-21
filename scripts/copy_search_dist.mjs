/**
 * Copy Search Engine Frontend Build to dist/search for Unified Vercel CDN Hosting
 * 
 * Ensures that both DeeperNova AI (dist/) and DeeperNova Search Engine (dist/search/)
 * are hosted completely on Vercel's Edge CDN without touching the user's home server!
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const SEARCH_PUBLIC_DIR = path.join(ROOT_DIR, 'search-engine', 'public');
const DIST_SEARCH_DIR = path.join(ROOT_DIR, 'dist', 'search');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  console.log('[BUILD] 🔍 Preparing Search Engine UI for Vercel CDN deployment...');
  
  if (!fs.existsSync(SEARCH_PUBLIC_DIR)) {
    console.warn(`[BUILD] ⚠️  ${SEARCH_PUBLIC_DIR} does not exist. Skipping search copy.`);
    process.exit(0);
  }

  // Ensure dist exists
  const distDir = path.join(ROOT_DIR, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy to dist/search
  copyRecursive(SEARCH_PUBLIC_DIR, DIST_SEARCH_DIR);

  const indexPath = path.join(DIST_SEARCH_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log('[BUILD] ✅ Search Engine UI successfully copied to dist/search for Vercel CDN!');
  } else {
    console.warn('[BUILD] ⚠️  Search Engine index.html not found in dist/search.');
  }
} catch (err) {
  console.error('[BUILD] ❌ Error copying search engine frontend:', err.message);
}

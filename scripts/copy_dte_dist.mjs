/**
 * Copy Order DTE Frontend Build to dist/dte and public/dte for Unified Web App Hosting
 * 
 * Ensures that DeeperNova AI, Search Engine, and Order DTE are all unified
 * and served through Vercel's Edge CDN and local express server seamlessly.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DTE_USER_DIST = 'F:\\order dte\\user\\dist';
const PROD_AI_DIR = 'F:\\a final deepernova ai\\deepernova ai';

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
  console.log('[BUILD] 🚀 Preparing Order DTE Web App for local server and Vercel CDN deployment...');
  
  if (!fs.existsSync(DTE_USER_DIST)) {
    console.warn(`[BUILD] ⚠️ ${DTE_USER_DIST} does not exist. Skipping DTE copy.`);
    process.exit(0);
  }

  const targets = [
    path.join(ROOT_DIR, 'dist', 'dte'),
    path.join(ROOT_DIR, 'public', 'dte'),
  ];

  if (fs.existsSync(PROD_AI_DIR) && PROD_AI_DIR !== ROOT_DIR) {
    targets.push(path.join(PROD_AI_DIR, 'dist', 'dte'));
    targets.push(path.join(PROD_AI_DIR, 'public', 'dte'));
  }

  for (const targetDir of targets) {
    copyRecursive(DTE_USER_DIST, targetDir);
    console.log(`[BUILD] ✅ Copied DTE to ${targetDir}`);
  }

  console.log('[BUILD] 🎉 Order DTE Web App successfully deployed to dist/dte and public/dte!');
} catch (err) {
  console.error('[BUILD] ❌ Error copying DTE frontend:', err.message);
}

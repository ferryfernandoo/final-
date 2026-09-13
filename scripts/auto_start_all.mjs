/**
 * Deepernova Master Auto-Start & Orchestrator
 * 
 * Sekali jalan, script ini otomatis:
 * 1. Menjalankan Search Engine (Port 3000)
 * 2. Menjalankan Backend Deepernova AI (Port 3001)
 * 3. Menyalakan Cloudflare Tunnel untuk Search Engine & Backend
 * 4. Mendeteksi URL publik trycloudflare.com secara otomatis
 * 5. Mengupdate .env, active_tunnel.json, src/apiConfig.js, src/services/clientSearchService.js, dan vercel.json
 * 6. Mengompilasi build frontend (npm run build)
 * 7. Melakukan git commit dan git push ke GitHub (ferryfernandoo/final-.git) agar Vercel langsung live!
 */

import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SEARCH_DIR = 'F:\\deepernova-search-main';

const CLOUDFLARED_BIN = path.join(ROOT_DIR, 'bin', 'cloudflared.exe');

// Helper to sanitize URL (remove trailing slash)
const cleanUrl = (url) => String(url || '').trim().replace(/\/+$/, '');

// Logger formatting
const log = {
  info: (msg) => console.log(`\x1b[36m[AUTO-START]\x1b[0m ℹ️  ${msg}`),
  success: (msg) => console.log(`\x1b[32m[AUTO-START]\x1b[0m ✅ ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[AUTO-START]\x1b[0m ⚠️  ${msg}`),
  error: (msg) => console.log(`\x1b[31m[AUTO-START]\x1b[0m ❌ ${msg}`),
  title: (msg) => console.log(`\n\x1b[35m=====================================================\x1b[0m\n\x1b[1m\x1b[37m${msg}\x1b[0m\n\x1b[35m=====================================================\x1b[0m\n`)
};

async function checkPortOpen(port, timeoutMs = 2000) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`http://127.0.0.1:${port}/`, { signal: controller.signal });
    clearTimeout(id);
    return true;
  } catch {
    return false;
  }
}

function startProcess(command, args, cwd, name) {
  log.info(`Menjalankan ${name}...`);
  const child = spawn(command, args, {
    cwd,
    stdio: 'ignore',
    detached: true,
    windowsHide: true,
    shell: false
  });
  child.unref();
  return child;
}

function launchTunnel(port, logFilePath) {
  return new Promise((resolve, reject) => {
    log.info(`Menyalakan Cloudflare Tunnel untuk port ${port}...`);
    
    // Hapus file log lama jika ada
    try {
      if (fs.existsSync(logFilePath)) fs.unlinkSync(logFilePath);
    } catch {}

    const child = spawn(CLOUDFLARED_BIN, [
      'tunnel',
      '--url', `http://localhost:${port}`,
      '--logfile', logFilePath,
      '--protocol', 'quic'
    ], {
      detached: true,
      windowsHide: true,
      stdio: 'ignore'
    });
    child.unref();

    let resolved = false;
    const maxWaitMs = 45000;
    const start = Date.now();

    const interval = setInterval(() => {
      if (Date.now() - start > maxWaitMs) {
        clearInterval(interval);
        if (!resolved) {
          reject(new Error(`Timeout menunggu Cloudflare Tunnel port ${port}`));
        }
        return;
      }

      if (fs.existsSync(logFilePath)) {
        try {
          const content = fs.readFileSync(logFilePath, 'utf8');
          const match = content.match(/https:\/\/[a-z0-9\-]+\.trycloudflare\.com/i);
          if (match && match[0]) {
            resolved = true;
            clearInterval(interval);
            resolve(cleanUrl(match[0]));
          }
        } catch {}
      }
    }, 1000);
  });
}

function updateConfigFiles(backendUrl, searchEngineUrl) {
  log.info('Memperbarui konfigurasi proyek secara otomatis...');

  // 1. Update .env
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(
      /VITE_DEEPERNOVA_SEARCH_API_URL=https:\/\/[^\s]+/g,
      `VITE_DEEPERNOVA_SEARCH_API_URL=${searchEngineUrl}/api/v1`
    );
    envContent = envContent.replace(
      /VITE_SEARCH_ENGINE_URL=https:\/\/[^\s]+/g,
      `VITE_SEARCH_ENGINE_URL=${searchEngineUrl}`
    );
    envContent = envContent.replace(
      /PUBLIC_BACKEND_URL=https:\/\/[^\s]+/g,
      `PUBLIC_BACKEND_URL=${backendUrl}`
    );
    envContent = envContent.replace(
      /VITE_API_URL=https:\/\/[^\s]+/g,
      `VITE_API_URL=${backendUrl}`
    );
    envContent = envContent.replace(
      /VPS_PUBLIC_URL=https:\/\/[^\s]+/g,
      `VPS_PUBLIC_URL=${backendUrl}`
    );
    fs.writeFileSync(envPath, envContent, 'utf8');
    log.success('.env berhasil diperbarui.');
  }

  // 2. Update active_tunnel.json
  const activeTunnelPath = path.join(ROOT_DIR, 'active_tunnel.json');
  const tunnelConfig = {
    backendUrl,
    frontendUrl: "https://nam-ben-brothers-strict.trycloudflare.com",
    searchEngineUrl,
    backendPort: 3001,
    frontendPort: 5174,
    searchEnginePort: 3000,
    isFixed: true,
    status: "LIVE",
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(activeTunnelPath, JSON.stringify(tunnelConfig, null, 2), 'utf8');
  log.success('active_tunnel.json berhasil diperbarui.');

  // 3. Update src/apiConfig.js
  const apiConfigPath = path.join(ROOT_DIR, 'src', 'apiConfig.js');
  if (fs.existsSync(apiConfigPath)) {
    let apiConfigContent = fs.readFileSync(apiConfigPath, 'utf8');
    apiConfigContent = apiConfigContent.replace(
      /const CLOUDFLARE_BACKEND_URL = '[^']+';/,
      `const CLOUDFLARE_BACKEND_URL = '${backendUrl}';`
    );
    fs.writeFileSync(apiConfigPath, apiConfigContent, 'utf8');
    log.success('src/apiConfig.js berhasil diperbarui.');
  }

  // 4. Update src/services/clientSearchService.js
  const searchServicePath = path.join(ROOT_DIR, 'src', 'services', 'clientSearchService.js');
  if (fs.existsSync(searchServicePath)) {
    let searchContent = fs.readFileSync(searchServicePath, 'utf8');
    searchContent = searchContent.replace(
      /:\s*'https:\/\/[a-z0-9\-]+\.trycloudflare\.com\/api\/v1'\);/,
      `: '${searchEngineUrl}/api/v1');`
    );
    fs.writeFileSync(searchServicePath, searchContent, 'utf8');
    log.success('src/services/clientSearchService.js berhasil diperbarui.');
  }

  // 5. Update vercel.json
  const vercelPath = path.join(ROOT_DIR, 'vercel.json');
  if (fs.existsSync(vercelPath)) {
    let vercelContent = fs.readFileSync(vercelPath, 'utf8');
    vercelContent = vercelContent.replace(
      /"destination":\s*"https:\/\/[a-z0-9\-]+\.trycloudflare\.com\/(api|auth|download|watermarked)\/:path\*"/g,
      `"destination": "${backendUrl}/$1/:path*"`
    );
    fs.writeFileSync(vercelPath, vercelContent, 'utf8');
    log.success('vercel.json rewrites berhasil diperbarui.');
  }
}

async function main() {
  log.title('🚀 DEEPERNOVA AI AUTO-CONFIGURATION SYSTEM');

  // Step 0: Pastikan folder C:\deepernova-data siap untuk index sqlite search engine
  if (!fs.existsSync('C:\\deepernova-data')) {
    try {
      fs.mkdirSync('C:\\deepernova-data', { recursive: true });
    } catch {}
  }

  // Step 1: Nyalakan Search Engine jika belum jalan di port 3000
  const searchOpen = await checkPortOpen(3000);
  if (!searchOpen) {
    startProcess('node', ['src/server.js'], SEARCH_DIR, 'Deepernova Search Engine (Port 3000)');
    // Tunggu boot
    await new Promise((r) => setTimeout(r, 4000));
  } else {
    log.success('Search Engine sudah aktif di port 3000.');
  }

  // Step 2: Nyalakan Backend Server jika belum jalan di port 3001
  const backendOpen = await checkPortOpen(3001);
  if (!backendOpen) {
    startProcess('node', ['server/server.js'], ROOT_DIR, 'Deepernova Backend Server (Port 3001)');
    // Tunggu boot
    await new Promise((r) => setTimeout(r, 4000));
  } else {
    log.success('Backend Server sudah aktif di port 3001.');
  }

  // Step 3: Dapatkan URL Cloudflare Tunnel
  const backendLog = path.join(ROOT_DIR, 'tunnel-backend.log');
  const searchLog = path.join(SEARCH_DIR, 'tunnel.log');

  let backendUrl = null;
  let searchEngineUrl = null;

  try {
    const [bUrl, sUrl] = await Promise.all([
      launchTunnel(3001, backendLog),
      launchTunnel(3000, searchLog)
    ]);
    backendUrl = bUrl;
    searchEngineUrl = sUrl;
  } catch (err) {
    log.error(`Gagal menghubungkan tunnel: ${err.message}`);
    process.exit(1);
  }

  log.success(`Backend Tunnel URL: ${backendUrl}`);
  log.success(`Search Engine Tunnel URL: ${searchEngineUrl}`);

  // Step 4: Konfigurasi Otomatis File-File Proyek
  updateConfigFiles(backendUrl, searchEngineUrl);

  // Step 5: Build Vite Frontend
  log.info('Membangun bundle frontend (npm run build)...');
  try {
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
    log.success('Frontend build selesai.');
  } catch (err) {
    log.error('Gagal menjalankan build frontend!');
    process.exit(1);
  }

  // Step 6: Git commit & push otomatis ke GitHub
  log.info('Menyinkronkan ke GitHub & Vercel...');
  try {
    execSync('git add vercel.json src/apiConfig.js src/services/clientSearchService.js active_tunnel.json dist/ .env', { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync('git commit -m "auto-deploy: sync active cloudflare tunnels and vercel rewrites"', { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync('git push origin main', { cwd: ROOT_DIR, stdio: 'inherit' });
    log.success('Berhasil push ke GitHub! Vercel akan otomatis aktif beberapa detik lagi.');
  } catch (err) {
    log.warn('Catatan git: Tidak ada perubahan atau push selesai.');
  }

  log.title('✨ SEMUA LAYANAN SUDAH AKTIF & TERKONFIGURASI OTOMATIS!');
  console.log(`- 🔍 Search Engine Public API : ${searchEngineUrl}/api/v1/search`);
  console.log(`- 🧠 AI Backend Public URL    : ${backendUrl}`);
  console.log(`- 🌐 Vercel Front-End Login   : Siap digunakan (otomatis terhubung via proxy rewrite)\n`);
}

main().catch((err) => {
  log.error(`Terjadi kesalahan: ${err.message}`);
});

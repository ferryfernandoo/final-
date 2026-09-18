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
const SEARCH_DIR = 'C:\\deepernova-search-main';
const ORDER_DTE_SERVER_DIR = 'F:\\order dte\\server';
const ORDER_DTE_USER_DIR = 'F:\\order dte\\user';

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

import net from 'node:net';

async function checkPortOpen(port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function waitForPort(port, maxWaitMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await checkPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function startProcess(command, args, cwd, name) {
  log.info(`Menjalankan ${name}...`);
  const child = spawn('cmd.exe', ['/c', 'start', `"${name}"`, command, ...args], {
    cwd,
    windowsHide: false,
    shell: false
  });
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

function updateConfigFiles(backendUrl, searchEngineUrl, dteUrl) {
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
    if (dteUrl) {
      envContent = envContent.replace(
        /VITE_ORDER_DTE_URL=[^\s]+/g,
        `VITE_ORDER_DTE_URL=${dteUrl}`
      );
    }
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
    dteUrl: dteUrl || "https://newcastle-improved-avatar-gate.trycloudflare.com",
    backendPort: 3001,
    frontendPort: 5174,
    searchEnginePort: 3000,
    dtePort: 5173,
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

  // 5. Update src/components/LandingPage.jsx
  const landingPagePath = path.join(ROOT_DIR, 'src', 'components', 'LandingPage.jsx');
  if (fs.existsSync(landingPagePath)) {
    let lpContent = fs.readFileSync(landingPagePath, 'utf8');
    lpContent = lpContent.replace(
      /SEARCH_ENGINE_URL\s*=[\s\S]*?:\s*'https:\/\/[a-z0-9\-]+\.trycloudflare\.com'\);/,
      `SEARCH_ENGINE_URL = \n  import.meta.env?.VITE_SEARCH_ENGINE_URL || \n  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')\n    ? 'http://localhost:3000'\n    : '${searchEngineUrl}');`
    );
    if (dteUrl) {
      lpContent = lpContent.replace(
        /ORDER_DTE_URL\s*=[\s\S]*?:\s*'https:\/\/[a-z0-9\-]+\.trycloudflare\.com'\);/,
        `ORDER_DTE_URL = \n  import.meta.env?.VITE_ORDER_DTE_URL || \n  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')\n    ? 'http://localhost:5173'\n    : '${dteUrl}');`
      );
    }
    fs.writeFileSync(landingPagePath, lpContent, 'utf8');
    log.success('src/components/LandingPage.jsx berhasil diperbarui.');
  }

  // 6. Update .env.production
  const envProdPath = path.join(ROOT_DIR, '.env.production');
  if (fs.existsSync(envProdPath)) {
    let envProdContent = fs.readFileSync(envProdPath, 'utf8');
    envProdContent = envProdContent.replace(
      /VITE_DEEPERNOVA_SEARCH_API_URL=https:\/\/[^\s]+/g,
      `VITE_DEEPERNOVA_SEARCH_API_URL=${searchEngineUrl}/api/v1`
    );
    envProdContent = envProdContent.replace(
      /VITE_SEARCH_ENGINE_URL=https:\/\/[^\s]+/g,
      `VITE_SEARCH_ENGINE_URL=${searchEngineUrl}`
    );
    if (dteUrl) {
      envProdContent = envProdContent.replace(
        /VITE_ORDER_DTE_URL=[^\s]+/g,
        `VITE_ORDER_DTE_URL=${dteUrl}`
      );
    }
    envProdContent = envProdContent.replace(
      /VITE_API_URL=https:\/\/[^\s]+/g,
      `VITE_API_URL=${backendUrl}`
    );
    fs.writeFileSync(envProdPath, envProdContent, 'utf8');
    log.success('.env.production berhasil diperbarui.');
  }

  // 7. Update vercel.json
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
    startProcess('node', ['--max-old-space-size=1536', '--expose-gc', 'src/server.js'], SEARCH_DIR, 'Deepernova Search Engine (Port 3000)');
    log.info('Menunggu Search Engine siap di port 3000...');
    const ready = await waitForPort(3000, 15000);
    if (ready) {
      log.success('Search Engine siap di port 3000.');
    } else {
      log.warn('Search Engine memerlukan waktu lebih lama untuk inisialisasi.');
    }
  } else {
    log.success('Search Engine sudah aktif di port 3000.');
  }

  // Step 2: Nyalakan Backend Server jika belum jalan di port 3001
  const backendOpen = await checkPortOpen(3001);
  if (!backendOpen) {
    startProcess('node', ['server/server.js'], ROOT_DIR, 'Deepernova Backend Server (Port 3001)');
    log.info('Menunggu Backend Server siap di port 3001...');
    const ready = await waitForPort(3001, 15000);
    if (ready) {
      log.success('Backend Server siap di port 3001.');
    } else {
      log.warn('Backend Server memerlukan waktu lebih lama untuk inisialisasi.');
    }
  } else {
    log.success('Backend Server sudah aktif di port 3001.');
  }

  // Step 3: Nyalakan Deepernova AI Frontend Vite jika belum jalan di port 5174
  const frontendOpen = await checkPortOpen(5174);
  if (!frontendOpen) {
    startProcess('npm', ['run', 'dev'], ROOT_DIR, 'Deepernova AI Frontend (Port 5174)');
    log.success('Deepernova AI Frontend dinyalakan di port 5174.');
  } else {
    log.success('Deepernova AI Frontend sudah aktif di port 5174.');
  }

  // Step 4: Nyalakan Order DTE Backend jika belum jalan di port 5000
  if (fs.existsSync(ORDER_DTE_SERVER_DIR)) {
    const orderServerOpen = await checkPortOpen(5000);
    if (!orderServerOpen) {
      startProcess('node', ['server.js'], ORDER_DTE_SERVER_DIR, 'Order DTE Backend (Port 5000)');
      log.success('Order DTE Backend Server dinyalakan di port 5000.');
    } else {
      log.success('Order DTE Backend Server sudah aktif di port 5000.');
    }
  }

  // Step 5: Nyalakan Order DTE User Frontend jika belum jalan di port 5173
  if (fs.existsSync(ORDER_DTE_USER_DIR)) {
    const orderUserOpen = await checkPortOpen(5173);
    if (!orderUserOpen) {
      startProcess('npm', ['run', 'dev'], ORDER_DTE_USER_DIR, 'Order DTE User Frontend (Port 5173)');
      log.success('Order DTE User Frontend dinyalakan di port 5173.');
    } else {
      log.success('Order DTE User Frontend sudah aktif di port 5173.');
    }
  }

  // Step 3: Dapatkan URL Cloudflare Tunnel
  const backendLog = path.join(ROOT_DIR, 'tunnel-backend.log');
  const searchLog = path.join(SEARCH_DIR, 'tunnel.log');
  const dteLog = path.join(ROOT_DIR, 'tunnel-dte.log');

  let backendUrl = null;
  let searchEngineUrl = null;
  let dteUrl = null;

  try {
    const promises = [
      launchTunnel(3001, backendLog),
      launchTunnel(3000, searchLog)
    ];
    if (fs.existsSync(ORDER_DTE_USER_DIR)) {
      promises.push(launchTunnel(5173, dteLog));
    }

    const results = await Promise.all(promises);
    backendUrl = results[0];
    searchEngineUrl = results[1];
    if (results.length > 2) {
      dteUrl = results[2];
    }
  } catch (err) {
    log.error(`Gagal menghubungkan tunnel: ${err.message}`);
    process.exit(1);
  }

  log.success(`Backend Tunnel URL: ${backendUrl}`);
  log.success(`Search Engine Tunnel URL: ${searchEngineUrl}`);
  if (dteUrl) {
    log.success(`Order DTE Tunnel URL: ${dteUrl}`);
  }

  // Step 4: Konfigurasi Otomatis File-File Proyek
  updateConfigFiles(backendUrl, searchEngineUrl, dteUrl);

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
    execSync('git add vercel.json src/apiConfig.js src/services/clientSearchService.js src/components/LandingPage.jsx active_tunnel.json dist/ scripts/auto_start_all.mjs .env.production', { cwd: ROOT_DIR, stdio: 'inherit' });
    try {
      execSync('git commit -m "auto-deploy: sync active cloudflare tunnels, landing page, order dte and vercel rewrites"', { cwd: ROOT_DIR, stdio: 'inherit' });
    } catch {}
    execSync('git push origin main', { cwd: ROOT_DIR, stdio: 'inherit' });
    log.success('Berhasil push ke GitHub! Vercel akan otomatis aktif beberapa detik lagi.');
  } catch (err) {
    log.warn(`Catatan git: ${err.message || 'Push selesai.'}`);
  }

  log.title('✨ SEMUA LAYANAN SUDAH AKTIF & TERKONFIGURASI OTOMATIS!');
  console.log(`- 🔍 Search Engine Public API : ${searchEngineUrl}/api/v1/search`);
  console.log(`- 🧠 AI Backend Public URL    : ${backendUrl}`);
  if (dteUrl) {
    console.log(`- 🏭 Order DTE Public Portal  : ${dteUrl}`);
  }
  console.log(`- 🌐 Vercel Front-End Login   : Siap digunakan (otomatis terhubung via proxy rewrite)\n`);
  console.log('📌 Tekan Ctrl+C di jendela ini untuk mematikan semua service sekaligus.\n');

  // Bersihkan subprocess ketika master dihentikan
  const cleanup = () => {
    log.info('Mematikan semua service Deepernova...');
    try {
      execSync('taskkill /f /im cloudflared.exe', { stdio: 'ignore' });
    } catch {}
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep process alive indefinitely
  setInterval(() => {}, 1000 * 60 * 60);
}

main().catch((err) => {
  log.error(`Terjadi kesalahan: ${err.message}`);
});

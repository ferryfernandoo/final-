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

import { spawn, exec, execSync } from 'node:child_process';
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

async function waitForPort(port, maxWaitMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await checkPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 800));
  }
  return false;
}

function startProcess(command, args, cwd, name) {
  log.info(`Menjalankan ${name}...`);
  // Wrap in double-quotes to handle spaces in paths
  const quotedArgs = args.map(a => a.includes(' ') ? `"${a}"` : a);
  const fullCmd = [command, ...quotedArgs].join(' ');
  return exec(`start "${name}" cmd /k "cd /d ${cwd} && ${fullCmd} || pause"`, {
    cwd,
    windowsHide: false
  });
}

function launchTunnel(port, logFilePath) {
  return new Promise((resolve, reject) => {
    // Cek apakah cloudflared.exe ada
    if (!fs.existsSync(CLOUDFLARED_BIN)) {
      log.warn(`cloudflared.exe tidak ditemukan di ${CLOUDFLARED_BIN}`);
      log.warn(`Tunnel port ${port} dilewati. Download dari: https://github.com/cloudflare/cloudflared/releases`);
      return reject(new Error(`cloudflared.exe tidak ada`));
    }

    log.info(`Menyalakan Cloudflare Tunnel untuk port ${port}...`);
    
    // Hapus file log lama jika ada
    try {
      if (fs.existsSync(logFilePath)) fs.unlinkSync(logFilePath);
    } catch {}

    const child = spawn(CLOUDFLARED_BIN, [
      'tunnel',
      '--url', `http://127.0.0.1:${port}`,
      '--logfile', logFilePath,
      '--retries', '5'
    ], {
      detached: true,
      windowsHide: true,
      stdio: 'ignore'
    });
    child.unref();

    let resolved = false;
    const maxWaitMs = 90000; // 90 detik max
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
          const isRegistered = content.includes('Registered tunnel connection') || 
                               content.includes('Registered at') || 
                               content.includes('connection=') ||
                               content.includes('location=') ||
                               content.includes('connIndex=');
          if (match && match[0] && isRegistered) {
            resolved = true;
            clearInterval(interval);
            resolve(cleanUrl(match[0]));
          }
        } catch {}
      }
    }, 500);
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
      /export const API_BASE_URL =[\s\S]*?;/,
      `export const API_BASE_URL = \n  import.meta.env?.VITE_DEEPERNOVA_SEARCH_API_URL || \n  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')\n    ? 'http://127.0.0.1:3000/api/v1'\n    : '${searchEngineUrl}/api/v1');`
    );
    fs.writeFileSync(searchServicePath, searchContent, 'utf8');
    log.success('src/services/clientSearchService.js berhasil diperbarui.');
  }

  // 5. Update src/components/LandingPage.jsx
  const landingPagePath = path.join(ROOT_DIR, 'src', 'components', 'LandingPage.jsx');
  if (fs.existsSync(landingPagePath)) {
    let lpContent = fs.readFileSync(landingPagePath, 'utf8');
    lpContent = lpContent.replace(
      /const SEARCH_ENGINE_URL =[\s\S]*?;/,
      `const SEARCH_ENGINE_URL = \n  import.meta.env?.VITE_SEARCH_ENGINE_URL || \n  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')\n    ? 'http://localhost:3000'\n    : '${searchEngineUrl}');`
    );
    if (dteUrl) {
      lpContent = lpContent.replace(
        /const ORDER_DTE_URL =[\s\S]*?;/,
        `const ORDER_DTE_URL = \n  import.meta.env?.VITE_ORDER_DTE_URL || \n  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')\n    ? 'http://localhost:5173'\n    : '${dteUrl}');`
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
  const vercelConfig = {
    headers: [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';" }
        ]
      },
      {
        source: "/(index.html)?",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate, max-age=0" }
        ]
      },
      {
        source: "/assets/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" }
        ]
      },
      {
        source: "/ceo.jpg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
          { key: "X-Robots-Tag", value: "index, follow, max-image-preview:large" }
        ]
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" }
        ]
      },
      {
        source: "/auth/(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" }
        ]
      }
    ],
    rewrites: [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`
      },
      {
        source: "/auth/:path*",
        destination: `${backendUrl}/auth/:path*`
      },
      {
        source: "/download/:path*",
        destination: `${backendUrl}/download/:path*`
      },
      {
        source: "/watermarked/:path*",
        destination: `${backendUrl}/watermarked/:path*`
      },
      {
        source: "/((?!assets/|ceo\\.jpg|robots\\.txt|sitemap\\.xml|favicon|logo|llms\\.txt|ai-info\\.json|google|\\.well-known/).*)",
        destination: "/index.html"
      }
    ]
  };
  fs.writeFileSync(vercelPath, JSON.stringify(vercelConfig, null, 2), 'utf8');
  log.success('vercel.json rewrites berhasil diperbarui.');
}

async function main() {
  log.title('🚀 DEEPERNOVA AI AUTO-CONFIGURATION SYSTEM');

  // Step 0: Bersihkan process cloudflared lama agar tunnel fresh
  try {
    execSync('taskkill /f /im cloudflared.exe', { stdio: 'ignore' });
  } catch {}

  // Pastikan folder C:\deepernova-data siap untuk index sqlite search engine
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
    await waitForPort(5174, 10000);
    log.success('Deepernova AI Frontend dinyalakan di port 5174.');
  } else {
    log.success('Deepernova AI Frontend sudah aktif di port 5174.');
  }

  // Step 4: Nyalakan Order DTE Backend jika belum jalan di port 5000
  if (fs.existsSync(ORDER_DTE_SERVER_DIR)) {
    const orderServerOpen = await checkPortOpen(5000);
    if (!orderServerOpen) {
      startProcess('node', ['server.js'], ORDER_DTE_SERVER_DIR, 'Order DTE Backend (Port 5000)');
      await waitForPort(5000, 10000);
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
      await waitForPort(5173, 10000);
      log.success('Order DTE User Frontend dinyalakan di port 5173.');
    } else {
      log.success('Order DTE User Frontend sudah aktif di port 5173.');
    }
  }

  // Step 3: Dapatkan URL Cloudflare Tunnel
  const backendLog = path.join(ROOT_DIR, 'tunnel-backend.log');
  const searchLog = path.join(ROOT_DIR, 'tunnel-search.log');
  const dteLog = path.join(ROOT_DIR, 'tunnel-dte.log');

  let backendUrl = null;
  let searchEngineUrl = null;
  let dteUrl = null;

  // Baca URL lama dari active_tunnel.json sebagai fallback
  const activeTunnelPath = path.join(ROOT_DIR, 'active_tunnel.json');
  let oldTunnel = {};
  try {
    if (fs.existsSync(activeTunnelPath)) {
      oldTunnel = JSON.parse(fs.readFileSync(activeTunnelPath, 'utf8'));
    }
  } catch {}

  try {
    const tunnelPromises = [];
    const dteExists = fs.existsSync(ORDER_DTE_USER_DIR);

    // Gunakan Promise.allSettled agar 1 tunnel gagal tidak stop semua
    const settled = await Promise.allSettled([
      launchTunnel(3001, backendLog),
      launchTunnel(3000, searchLog),
      ...(dteExists ? [launchTunnel(5173, dteLog)] : [])
    ]);

    if (settled[0].status === 'fulfilled') {
      backendUrl = settled[0].value;
    } else {
      log.warn(`Backend tunnel gagal: ${settled[0].reason?.message}. Menggunakan URL lama.`);
      backendUrl = oldTunnel.backendUrl || null;
    }

    if (settled[1].status === 'fulfilled') {
      searchEngineUrl = settled[1].value;
    } else {
      log.warn(`Search tunnel gagal: ${settled[1].reason?.message}. Menggunakan URL lama.`);
      searchEngineUrl = oldTunnel.searchEngineUrl || null;
    }

    if (dteExists && settled[2]) {
      if (settled[2].status === 'fulfilled') {
        dteUrl = settled[2].value;
      } else {
        log.warn(`DTE tunnel gagal: ${settled[2].reason?.message}. Menggunakan URL lama.`);
        dteUrl = oldTunnel.dteUrl || null;
      }
    }

    if (!backendUrl && !searchEngineUrl) {
      log.warn('Semua tunnel gagal! Tetap melanjutkan build & push dengan URL lama...');
    }
  } catch (err) {
    log.warn(`Tunnel error: ${err.message}. Melanjutkan dengan URL lama...`);
    backendUrl = oldTunnel.backendUrl || null;
    searchEngineUrl = oldTunnel.searchEngineUrl || null;
    dteUrl = oldTunnel.dteUrl || null;
  }

  // Jika masih null, exit dengan peringatan (bukan exit 1 agar build tetap jalan)
  if (!backendUrl) {
    log.warn('backendUrl tidak tersedia. Konfigurasi mungkin tidak akurat.');
    backendUrl = oldTunnel.backendUrl || 'http://localhost:3001';
  }
  if (!searchEngineUrl) {
    log.warn('searchEngineUrl tidak tersedia. Konfigurasi mungkin tidak akurat.');
    searchEngineUrl = oldTunnel.searchEngineUrl || 'http://localhost:3000';
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
    // Pastikan git user config ada agar commit tidak gagal
    try {
      execSync('git config user.email', { cwd: ROOT_DIR, stdio: 'pipe' });
    } catch {
      execSync('git config user.email "deploy@deepernova.ai"', { cwd: ROOT_DIR, stdio: 'inherit' });
      execSync('git config user.name "Deepernova Auto Deploy"', { cwd: ROOT_DIR, stdio: 'inherit' });
    }

    // Stage semua file yang relevan
    const filesToAdd = [
      'vercel.json',
      'src/apiConfig.js',
      'src/services/clientSearchService.js',
      'src/components/LandingPage.jsx',
      'active_tunnel.json',
      '.env',
      '.env.production',
      'dist/',
      'scripts/auto_start_all.mjs',
      'start_all.bat',
      'start.bat'
    ].join(' ');

    execSync(`git add -A ${filesToAdd}`, { cwd: ROOT_DIR, stdio: 'inherit' });

    // Commit (jika tidak ada perubahan, lanjut saja)
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    try {
      execSync(`git commit -m "auto-deploy: ${timestamp} - sync tunnels, config, build"`, { cwd: ROOT_DIR, stdio: 'inherit' });
      log.success('Commit berhasil.');
    } catch {
      log.info('Tidak ada perubahan baru untuk di-commit.');
    }

    // Push ke GitHub
    log.info('Melakukan git push origin main ke GitHub...');
    execSync('git push origin main', { cwd: ROOT_DIR, stdio: 'inherit' });
    log.success('✅ Berhasil push ke GitHub! Vercel akan otomatis live dalam beberapa detik.');
  } catch (err) {
    log.warn(`Catatan git push: ${err.message || 'Selesai.'}`);
    log.warn('Pastikan git remote origin sudah benar dan ada koneksi internet.');
  }

  log.title('✨ SEMUA LAYANAN SUDAH AKTIF & TERKONFIGURASI OTOMATIS!');
  console.log(`- 🌐 Frontend Lokal (Buka di browser) : http://localhost:5174`);
  console.log(`- 🔍 Search Engine Public API         : ${searchEngineUrl}/api/v1/search`);
  console.log(`- 🧠 AI Backend Public URL            : ${backendUrl}`);
  if (dteUrl) {
    console.log(`- 🏭 Order DTE Public Portal          : ${dteUrl}`);
  }
  console.log(`- 🚀 Vercel Live (Otomatis Sync)      : Siap digunakan (terhubung via Cloudflare rewrite)\n`);
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

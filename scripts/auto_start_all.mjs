/**
 * Deepernova Master Auto-Start & Orchestrator
 * 
 * Sekali jalan, script ini otomatis:
 * 1. Menjalankan Search Engine (Port 3000)
 * 2. Menjalankan Backend Deepernova AI (Port 3001)
 * 3. Menjalankan Frontend Vite Dev (Port 5174)
 * 4. Menjalankan Order DTE Backend (Port 5000)
 * 5. Menjalankan Order DTE User Frontend (Port 5173)
 * 6. Menyalakan Cloudflare Tunnel untuk Backend, Search, DTE
 * 7. Mendeteksi URL publik trycloudflare.com secara otomatis
 * 8. Mengupdate .env, active_tunnel.json, src/apiConfig.js, dll
 * 9. Build frontend (npm run build)
 * 10. Git commit & push ke GitHub → Vercel auto-deploy
 */

import { spawn, exec, execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

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

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function checkPortOpen(port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { resolve(false); });
    socket.connect(port, '127.0.0.1');
  });
}

async function waitForPort(port, maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await checkPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Start a process in a new CMD window.
 * Path is quoted to handle spaces (e.g. "F:\order dte\server").
 */
function startProcess(command, args, cwd, name) {
  log.info(`Menjalankan ${name}...`);
  const quotedCwd = `"${cwd}"`;
  const quotedArgs = args.map(a => a.includes(' ') ? `"${a}"` : a);
  const fullCmd = [command, ...quotedArgs].join(' ');
  // cd /d "path with spaces" && command
  const shellCmd = `start "${name}" cmd /k "cd /d ${quotedCwd} && ${fullCmd}"`;
  try {
    execSync(shellCmd, { cwd: ROOT_DIR, windowsHide: false, stdio: 'ignore' });
  } catch (err) {
    // 'start' command may return non-zero even on success in some shells
    log.warn(`startProcess shell returned error for ${name}, but process may still be starting...`);
  }
}

/**
 * Launch a Cloudflare quick tunnel and parse the URL from the log file.
 */
function launchTunnel(port, logFilePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(CLOUDFLARED_BIN)) {
      return reject(new Error(`cloudflared.exe tidak ditemukan di ${CLOUDFLARED_BIN}`));
    }

    log.info(`Menyalakan Cloudflare Tunnel untuk port ${port}...`);

    // Hapus log lama
    try { if (fs.existsSync(logFilePath)) fs.unlinkSync(logFilePath); } catch {}

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
    const maxWaitMs = 90000; // 90 detik
    const start = Date.now();

    const interval = setInterval(() => {
      if (Date.now() - start > maxWaitMs) {
        clearInterval(interval);
        if (!resolved) {
          reject(new Error(`Timeout menunggu Cloudflare Tunnel port ${port} (${maxWaitMs / 1000}s)`));
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
    }, 800);
  });
}

// ─────────────────────────────────────────────
// CONFIG UPDATE
// ─────────────────────────────────────────────

function updateConfigFiles(backendUrl, searchEngineUrl, dteUrl) {
  log.info('Memperbarui konfigurasi proyek secara otomatis...');

  // 1. Update .env
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(
      /VITE_DEEPERNOVA_SEARCH_API_URL=\S+/g,
      `VITE_DEEPERNOVA_SEARCH_API_URL=${searchEngineUrl}/api/v1`
    );
    envContent = envContent.replace(
      /VITE_SEARCH_ENGINE_URL=\S+/g,
      `VITE_SEARCH_ENGINE_URL=${searchEngineUrl}`
    );
    if (dteUrl) {
      envContent = envContent.replace(
        /VITE_ORDER_DTE_URL=\S+/g,
        `VITE_ORDER_DTE_URL=${dteUrl}`
      );
    }
    envContent = envContent.replace(
      /PUBLIC_BACKEND_URL=\S+/g,
      `PUBLIC_BACKEND_URL=${backendUrl}`
    );
    envContent = envContent.replace(
      /VITE_API_URL=\S+/g,
      `VITE_API_URL=${backendUrl}`
    );
    envContent = envContent.replace(
      /VPS_PUBLIC_URL=\S+/g,
      `VPS_PUBLIC_URL=${backendUrl}`
    );
    fs.writeFileSync(envPath, envContent, 'utf8');
    log.success('.env berhasil diperbarui.');
  }

  // 2. Update active_tunnel.json
  const activeTunnelPath = path.join(ROOT_DIR, 'active_tunnel.json');
  const tunnelConfig = {
    backendUrl,
    searchEngineUrl,
    dteUrl: dteUrl || null,
    backendPort: 3001,
    searchEnginePort: 3000,
    dtePort: 5173,
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
    if (dteUrl) {
      // Update the DTE fallback URL
      apiConfigContent = apiConfigContent.replace(
        /: 'https:\/\/[a-z0-9\-]+\.trycloudflare\.com'\);/,
        `: '${dteUrl}');`
      );
    }
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
      /VITE_DEEPERNOVA_SEARCH_API_URL=\S+/g,
      `VITE_DEEPERNOVA_SEARCH_API_URL=${searchEngineUrl}/api/v1`
    );
    envProdContent = envProdContent.replace(
      /VITE_SEARCH_ENGINE_URL=\S+/g,
      `VITE_SEARCH_ENGINE_URL=${searchEngineUrl}`
    );
    if (dteUrl) {
      envProdContent = envProdContent.replace(
        /VITE_ORDER_DTE_URL=\S+/g,
        `VITE_ORDER_DTE_URL=${dteUrl}`
      );
    }
    envProdContent = envProdContent.replace(
      /VITE_API_URL=\S+/g,
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

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  log.title('🚀 DEEPERNOVA AI AUTO-CONFIGURATION SYSTEM');

  // ── Step 0: Kill proses cloudflared lama ───
  log.info('Membersihkan cloudflared lama...');
  try { execSync('taskkill /f /im cloudflared.exe', { stdio: 'ignore' }); } catch {}
  await sleep(1000);

  // Pastikan C:\deepernova-data siap
  if (!fs.existsSync('C:\\deepernova-data')) {
    try { fs.mkdirSync('C:\\deepernova-data', { recursive: true }); } catch {}
  }

  // ── Step 1: Nyalakan Search Engine (port 3000) ───
  log.title('📦 STEP 1: Search Engine');
  if (await checkPortOpen(3000)) {
    log.success('Search Engine sudah aktif di port 3000.');
  } else if (fs.existsSync(SEARCH_DIR)) {
    startProcess('node', ['--max-old-space-size=1536', '--expose-gc', 'src/server.js'], SEARCH_DIR, 'Deepernova Search Engine');
    log.info('Menunggu Search Engine siap di port 3000 (max 40 detik)...');
    if (await waitForPort(3000, 40000)) {
      log.success('Search Engine siap di port 3000.');
    } else {
      log.warn('Search Engine belum siap, tapi proses lanjut...');
    }
  } else {
    log.warn(`Folder Search Engine tidak ditemukan: ${SEARCH_DIR}`);
  }

  // ── Step 2: Nyalakan Backend Server (port 3001) ───
  log.title('📦 STEP 2: Backend Server');
  if (await checkPortOpen(3001)) {
    log.success('Backend Server sudah aktif di port 3001.');
  } else {
    startProcess('node', ['server/server.js'], ROOT_DIR, 'Deepernova Backend Server');
    log.info('Menunggu Backend Server siap di port 3001 (max 20 detik)...');
    if (await waitForPort(3001, 20000)) {
      log.success('Backend Server siap di port 3001.');
    } else {
      log.warn('Backend Server belum siap, tapi proses lanjut...');
    }
  }

  // ── Step 3: Nyalakan Frontend Vite (port 5174) ───
  log.title('📦 STEP 3: Frontend Vite Dev Server');
  if (await checkPortOpen(5174)) {
    log.success('Frontend Vite sudah aktif di port 5174.');
  } else {
    startProcess('npm', ['run', 'dev'], ROOT_DIR, 'Deepernova AI Frontend');
    log.info('Menunggu Frontend siap di port 5174 (max 15 detik)...');
    if (await waitForPort(5174, 15000)) {
      log.success('Frontend Vite siap di port 5174.');
    } else {
      log.warn('Frontend Vite belum siap, tapi proses lanjut...');
    }
  }

  // ── Step 4: Nyalakan Order DTE Backend (port 5000) ───
  log.title('📦 STEP 4: Order DTE Backend');
  if (fs.existsSync(ORDER_DTE_SERVER_DIR)) {
    if (await checkPortOpen(5000)) {
      log.success('DTE Backend sudah aktif di port 5000.');
    } else {
      startProcess('node', ['server.js'], ORDER_DTE_SERVER_DIR, 'Order DTE Backend');
      log.info('Menunggu DTE Backend siap di port 5000 (max 15 detik)...');
      if (await waitForPort(5000, 15000)) {
        log.success('DTE Backend siap di port 5000.');
      } else {
        log.warn('DTE Backend belum siap, tapi proses lanjut...');
      }
    }
  } else {
    log.warn(`Folder DTE Backend tidak ditemukan: ${ORDER_DTE_SERVER_DIR}`);
  }

  // ── Step 5: Nyalakan Order DTE Frontend (port 5173) ───
  log.title('📦 STEP 5: Order DTE Frontend');
  const dteExists = fs.existsSync(ORDER_DTE_USER_DIR);
  if (dteExists) {
    if (await checkPortOpen(5173)) {
      log.success('DTE Frontend sudah aktif di port 5173.');
    } else {
      startProcess('npm', ['run', 'dev'], ORDER_DTE_USER_DIR, 'Order DTE User Frontend');
      log.info('Menunggu DTE Frontend siap di port 5173 (max 15 detik)...');
      if (await waitForPort(5173, 15000)) {
        log.success('DTE Frontend siap di port 5173.');
      } else {
        log.warn('DTE Frontend belum siap, tapi proses lanjut...');
      }
    }
  } else {
    log.warn(`Folder DTE Frontend tidak ditemukan: ${ORDER_DTE_USER_DIR}`);
  }

  // ── Step 6: Buka Cloudflare Tunnels ───
  log.title('🌐 STEP 6: Cloudflare Tunnels');

  const backendLog = path.join(ROOT_DIR, 'tunnel-backend.log');
  const searchLog = path.join(ROOT_DIR, 'tunnel-search.log');
  const dteLog = path.join(ROOT_DIR, 'tunnel-dte.log');

  // Baca URL lama sebagai fallback
  const activeTunnelPath = path.join(ROOT_DIR, 'active_tunnel.json');
  let oldTunnel = {};
  try {
    if (fs.existsSync(activeTunnelPath)) {
      oldTunnel = JSON.parse(fs.readFileSync(activeTunnelPath, 'utf8'));
    }
  } catch {}

  let backendUrl = null;
  let searchEngineUrl = null;
  let dteUrl = null;

  // Cek apakah cloudflared.exe ada
  if (!fs.existsSync(CLOUDFLARED_BIN)) {
    log.error(`cloudflared.exe tidak ditemukan di: ${CLOUDFLARED_BIN}`);
    log.warn('Download dari: https://github.com/cloudflare/cloudflared/releases');
    log.warn('Menggunakan URL tunnel lama...');
    backendUrl = oldTunnel.backendUrl || 'http://localhost:3001';
    searchEngineUrl = oldTunnel.searchEngineUrl || 'http://localhost:3000';
    dteUrl = oldTunnel.dteUrl || null;
  } else {
    // Launch semua tunnels dengan Promise.allSettled (1 gagal tidak stop semua)
    const tunnelTasks = [
      launchTunnel(3001, backendLog).catch(e => { log.warn(`Backend tunnel: ${e.message}`); return null; }),
      launchTunnel(3000, searchLog).catch(e => { log.warn(`Search tunnel: ${e.message}`); return null; }),
    ];
    if (dteExists) {
      tunnelTasks.push(
        launchTunnel(5173, dteLog).catch(e => { log.warn(`DTE tunnel: ${e.message}`); return null; })
      );
    }

    const results = await Promise.all(tunnelTasks);

    backendUrl = results[0] || oldTunnel.backendUrl || 'http://localhost:3001';
    searchEngineUrl = results[1] || oldTunnel.searchEngineUrl || 'http://localhost:3000';
    if (dteExists) {
      dteUrl = (results[2]) || oldTunnel.dteUrl || null;
    }
  }

  log.success(`Backend Tunnel   : ${backendUrl}`);
  log.success(`Search Tunnel    : ${searchEngineUrl}`);
  if (dteUrl) log.success(`DTE Tunnel       : ${dteUrl}`);

  // ── Step 7: Update semua config files ───
  log.title('⚙️  STEP 7: Update Konfigurasi');
  updateConfigFiles(backendUrl, searchEngineUrl, dteUrl);

  // ── Step 8: Build Frontend ───
  log.title('🔨 STEP 8: Build Frontend');
  log.info('Membangun bundle frontend (npm run build)...');
  try {
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
    log.success('Frontend build selesai.');
  } catch (err) {
    log.error(`Build gagal: ${err.message}`);
    log.warn('Melanjutkan ke git push meskipun build gagal...');
  }

  // ── Step 9: Git Commit & Push ───
  log.title('🚀 STEP 9: Git Push ke GitHub');
  log.info('Menyinkronkan ke GitHub & Vercel...');
  try {
    // Pastikan git user config ada
    try {
      execSync('git config user.email', { cwd: ROOT_DIR, stdio: 'pipe' });
    } catch {
      execSync('git config user.email "deploy@deepernova.ai"', { cwd: ROOT_DIR, stdio: 'inherit' });
      execSync('git config user.name "Deepernova Auto Deploy"', { cwd: ROOT_DIR, stdio: 'inherit' });
    }

    // Stage files
    execSync('git add vercel.json src/apiConfig.js src/services/clientSearchService.js src/components/LandingPage.jsx active_tunnel.json dist/ scripts/auto_start_all.mjs start_all.bat start.bat', { cwd: ROOT_DIR, stdio: 'inherit' });

    // Commit
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    try {
      execSync(`git commit -m "auto-deploy: ${timestamp} - sync tunnels, config, build"`, { cwd: ROOT_DIR, stdio: 'inherit' });
      log.success('Commit berhasil.');
    } catch {
      log.info('Tidak ada perubahan baru untuk di-commit.');
    }

    // Push
    log.info('Melakukan git push origin main...');
    execSync('git push origin main', { cwd: ROOT_DIR, stdio: 'inherit' });
    log.success('✅ Push ke GitHub berhasil! Vercel auto-deploy aktif.');
  } catch (err) {
    log.warn(`Git push gagal: ${err.message || ''}`);
    log.warn('Pastikan remote origin benar dan ada koneksi internet.');
  }

  // ── SELESAI ───
  log.title('✨ SEMUA LAYANAN AKTIF & TERKONFIGURASI OTOMATIS!');
  console.log(`  🌐 Frontend Lokal  : http://localhost:5174`);
  console.log(`  🔍 Search Engine   : ${searchEngineUrl}/api/v1/search`);
  console.log(`  🧠 AI Backend      : ${backendUrl}`);
  if (dteUrl) {
    console.log(`  🏭 Order DTE       : ${dteUrl}`);
  }
  console.log(`  🚀 Vercel Live     : Auto-deployed via GitHub\n`);
  console.log('📌 Tekan Ctrl+C untuk mematikan semua service.\n');

  // Cleanup on exit
  const cleanup = () => {
    log.info('Mematikan semua service...');
    try { execSync('taskkill /f /im cloudflared.exe', { stdio: 'ignore' }); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep alive
  setInterval(() => {}, 1000 * 60 * 60);
}

main().catch((err) => {
  log.error(`Fatal error: ${err.message}`);
  console.error(err);
});

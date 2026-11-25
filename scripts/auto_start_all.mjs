/**
 * DeeperNova Master Ecosystem Auto-Start, Tunnel Synchronizer & Eternal Supervisor
 *
 * Menyalakan dan mengawasi seluruh layanan secara otomatis:
 * 1. FreeLLMAPI Gateway (Port 3005 - F:\a final deepernova ai\freellmapi\server)
 * 2. DeeperNova AI Python Server (Port 8000 - F:\llm deepernova)
 * 3. DeeperNova Search Engine & Crawler (Port 4000 - C:\deepernova-search-main)
 * 4. DeeperNova Backend AI, AI Agent Sandbox & Chat Jobs (Port 3001 - F:\a final deepernova ai\deepernova ai)
 * 5. Order DTE Backend & Fast Frontend (Port 5000 & 5173 - F:\order dte)
 * 6. DeeperNova Frontend Vite Dev (Port 5174)
 * 7. Cloudflare Tunnels (3001 Backend/AI/Agent, 4000 Search Engine, 5173 DTE) + SSH Failover
 * 8. Sinkronisasi penuh vercel.json, Edge Proxies (api/*), apiConfig.js, active_tunnel.json, .env, .env.production
 * 9. Build produksi & Git Push ke origin/main -> Auto-Deploy Vercel
 * 10. Eternal Watchdog Supervisor (menjaga semua port & tunnel tetap hidup 24/7)
 */

import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKTREE_DIR = path.resolve(__dirname, '..');
const PROD_ROOT_DIR = fs.existsSync('F:\\a final deepernova ai\\deepernova ai')
  ? 'F:\\a final deepernova ai\\deepernova ai'
  : WORKTREE_DIR;

const FREELLM_SERVER_DIR = 'F:\\a final deepernova ai\\freellmapi\\server';
const AI_SERVER_DIR = 'F:\\llm deepernova';
const SEARCH_DIR = fs.existsSync('C:\\deepernova-search-main')
  ? 'C:\\deepernova-search-main'
  : path.join(PROD_ROOT_DIR, 'search-engine');
const ORDER_DTE_SERVER_DIR = 'F:\\order dte\\server';
const ORDER_DTE_USER_DIR = 'F:\\order dte\\user';

const CLOUDFLARED_BIN = [
  path.join(PROD_ROOT_DIR, 'bin', 'cloudflared.exe'),
  path.join(WORKTREE_DIR, 'bin', 'cloudflared.exe'),
  'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
].find((p) => fs.existsSync(p)) || 'cloudflared';

const cleanUrl = (url) => String(url || '').trim().replace(/\/+$/, '');

const log = {
  info: (msg) => console.log(`[AUTO-START] ${new Date().toLocaleTimeString()} INFO  ${msg}`),
  success: (msg) => console.log(`[AUTO-START] ${new Date().toLocaleTimeString()} OK    ${msg}`),
  warn: (msg) => console.log(`[AUTO-START] ${new Date().toLocaleTimeString()} WARN  ${msg}`),
  error: (msg) => console.error(`[AUTO-START] ${new Date().toLocaleTimeString()} ERROR ${msg}`),
  title: (msg) => console.log(`\n=====================================================\n${msg}\n=====================================================`),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function checkPortOpen(port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function waitForPort(port, maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await checkPortOpen(port)) return true;
    await sleep(1000);
  }
  return false;
}

const managedChildren = new Map();

function startBackgroundService(key, command, args, cwd, logFileName, extraEnv = {}) {
  if (!fs.existsSync(cwd)) {
    log.warn(`Direktori untuk ${key} tidak ditemukan: ${cwd}`);
    return null;
  }
  log.info(`Menjalankan ${key} di ${cwd}...`);
  try {
    const logDir = path.join(PROD_ROOT_DIR, 'scratch');
    try {
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    } catch {}
    let stdioConfig = 'ignore';
    try {
      const logPath = path.join(logDir, logFileName);
      const fd = fs.openSync(logPath, 'a');
      stdioConfig = ['ignore', fd, fd];
    } catch {
      stdioConfig = 'ignore';
    }

    const child = spawn(command, args, {
      cwd,
      detached: false,
      windowsHide: true,
      stdio: stdioConfig,
      env: { ...process.env, ...extraEnv },
    });
    child.on('error', (err) => {
      log.warn(`Service ${key} error: ${err.message}`);
    });
    managedChildren.set(key, child);
    return child;
  } catch (err) {
    log.error(`Gagal menjalankan ${key}: ${err.message}`);
    return null;
  }
}

/**
 * Buka tunnel publik untuk port tertentu menggunakan Cloudflare Quick Tunnel
 * dengan fallback otomatis ke localhost.run jika terkena rate-limit.
 */
function createResilientTunnel(port, label) {
  return new Promise((resolve) => {
    log.info(`[${label}] Membuka Cloudflare Tunnel untuk http://127.0.0.1:${port}...`);
    let resolved = false;
    let cfProc = null;

    const startSshFallback = (reason) => {
      if (resolved) return;
      log.warn(`[${label}] Cloudflare fallback (${reason}) -> beralih ke localhost.run SSH...`);
      if (cfProc) {
        try { cfProc.kill(); } catch {}
      }
      const sshProc = spawn('ssh', [
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ServerAliveInterval=20',
        '-o', 'ServerAliveCountMax=3',
        '-R', `80:127.0.0.1:${port}`,
        'nokey@localhost.run',
      ], { windowsHide: true });

      const onData = (chunk) => {
        const text = chunk.toString();
        const match = text.match(/https:\/\/([a-zA-Z0-9.-]+)\.lhr\.life/);
        if (match && !resolved) {
          resolved = true;
          const url = cleanUrl(match[0]);
          log.success(`[${label}] Tunnel aktif (localhost.run): ${url}`);
          resolve({ port, label, url, process: sshProc, provider: 'lhr' });
        }
      };
      sshProc.stdout.on('data', onData);
      sshProc.stderr.on('data', onData);
    };

    try {
      cfProc = spawn(CLOUDFLARED_BIN, [
        'tunnel',
        '--url', `http://127.0.0.1:${port}`,
        '--protocol', 'http2',
        '--no-autoupdate',
      ], { windowsHide: true });

      let candidateUrl = null;
      const fallbackTimer = setTimeout(() => {
        if (!resolved) {
          if (candidateUrl) {
            resolved = true;
            log.success(`[${label}] Tunnel aktif (Cloudflare): ${candidateUrl}`);
            resolve({ port, label, url: candidateUrl, process: cfProc, provider: 'cloudflare' });
          } else {
            startSshFallback('timeout 25s');
          }
        }
      }, 25000);

      const onCfData = (chunk) => {
        const text = chunk.toString();
        if (text.includes('429 Too Many Requests') || text.includes('error code: 1015')) {
          clearTimeout(fallbackTimer);
          startSshFallback('Cloudflare 429 rate limit');
          return;
        }

        const matches = [...text.matchAll(/https:\/\/([a-z0-9-]+)\.trycloudflare\.com/gi)]
          .filter((m) => m[1].toLowerCase() !== 'api' && m[1].includes('-'));
        if (matches.length > 0 && !candidateUrl) {
          candidateUrl = cleanUrl(matches[0][0]);
        }

        const isRegistered =
          text.includes('Registered tunnel connection') ||
          text.includes('connIndex=');

        if (candidateUrl && isRegistered && !resolved) {
          clearTimeout(fallbackTimer);
          resolved = true;
          log.success(`[${label}] Tunnel aktif & terdaftar (Cloudflare): ${candidateUrl}`);
          resolve({ port, label, url: candidateUrl, process: cfProc, provider: 'cloudflare' });
        }
      };

      cfProc.stdout.on('data', onCfData);
      cfProc.stderr.on('data', onCfData);
      cfProc.on('error', (err) => {
        clearTimeout(fallbackTimer);
        startSshFallback(err.message);
      });
    } catch (err) {
      startSshFallback(err.message);
    }
  });
}

function buildVercelConfig(backendUrl, searchEngineUrl, dteUrl) {
  return {
    headers: [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Content-Security-Policy', value: "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss: blob: data:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';" },
        ],
      },
      {
        source: '/(index.html)?',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' }],
      },
      {
        source: '/search/(index.html)?',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' }],
      },
      {
        source: '/search/assets/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/dte',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' }],
      },
      {
        source: '/dte/(index.html|operator|admin)?',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' }],
      },
      {
        source: '/dte/assets/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/assets/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/ceo.jpg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
          { key: 'X-Robots-Tag', value: 'index, follow, max-image-preview:large' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
        ],
      },
      {
        source: '/auth/(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
        ],
      },
    ],
    rewrites: [
      { source: '/api/chat/jobs/start', destination: `${backendUrl}/api/chat/jobs/start` },
      { source: '/api/chat/jobs/active', destination: `${backendUrl}/api/chat/jobs/active` },
      { source: '/api/chat/jobs/sync', destination: `${backendUrl}/api/chat/jobs/sync` },
      { source: '/api/chat/jobs/:jobId/stream', destination: '/api/chat/jobs/stream?jobId=:jobId' },
      { source: '/api/chat/jobs/stream/:sessionId', destination: `${backendUrl}/api/chat/jobs/stream/:sessionId` },
      { source: '/api/chat/jobs/:jobId', destination: `${backendUrl}/api/chat/jobs/:jobId` },
      { source: '/api/chat', destination: '/api/chat' },
      { source: '/api/subagent/orchestrate', destination: '/api/subagent/orchestrate' },
      { source: '/api/chat/stop', destination: `${backendUrl}/api/chat/stop` },
      { source: '/api/ping', destination: '/api/ping' },
      { source: '/api/token-usage/:path*', destination: '/api/token-usage/:path*' },
      { source: '/api/serp-search', destination: '/api/serp-search' },
      { source: '/api/google-search', destination: '/api/serp-search' },
      { source: '/api/search', destination: '/api/search' },
      { source: '/api/v1/search', destination: '/api/search' },
      { source: '/api/v1/search-fast', destination: '/api/search' },
      { source: '/api/v1/images', destination: `${searchEngineUrl}/api/v1/images` },
      { source: '/api/images', destination: `${searchEngineUrl}/api/v1/images` },
      { source: '/api/suggestions', destination: '/api/suggestions' },
      { source: '/api/suggestions/trending', destination: `${searchEngineUrl}/api/suggestions/trending` },
      { source: '/api/images/crawl', destination: `${searchEngineUrl}/api/images/crawl` },
      { source: '/api/images/recent', destination: `${searchEngineUrl}/api/images/recent` },
      { source: '/api/images/stats', destination: `${searchEngineUrl}/api/images/stats` },
      { source: '/api/v1/health', destination: `${searchEngineUrl}/api/v1/health` },
      { source: '/api/v1/news', destination: `${searchEngineUrl}/api/v1/news` },
      { source: '/api/tunnel/info', destination: `${searchEngineUrl}/api/tunnel/info` },
      { source: '/api/v1/suggest', destination: '/api/suggestions' },
      { source: '/api/status', destination: '/api/status' },
      { source: '/api/agent', destination: `${backendUrl}/api/agent` },
      { source: '/api/agent/:path*', destination: `${backendUrl}/api/agent/:path*` },
      { source: '/search', destination: '/search/index.html' },
      { source: '/search/', destination: '/search/index.html' },
      { source: '/search/assets/:path*', destination: '/search/assets/:path*' },
      { source: '/search/icons/:path*', destination: '/search/icons/:path*' },
      { source: '/search/manifest.json', destination: '/search/manifest.json' },
      { source: '/search/sw.js', destination: '/search/sw.js' },
      { source: '/search/favicon.png', destination: '/search/favicon.png' },
      { source: '/search/:path*', destination: '/search/index.html' },
      { source: '/dte', destination: '/dte/index.html' },
      { source: '/dte/', destination: '/dte/index.html' },
      { source: '/dte/assets/:path*', destination: '/dte/assets/:path*' },
      { source: '/dte/icons/:path*', destination: '/dte/icons/:path*' },
      { source: '/dte/manifest.json', destination: '/dte/manifest.json' },
      { source: '/dte/favicon.svg', destination: '/dte/favicon.svg' },
      { source: '/dte/favicon.png', destination: '/dte/favicon.png' },
      { source: '/dte/favicon.ico', destination: '/dte/favicon.ico' },
      { source: '/dte/:path*', destination: '/dte/index.html' },
      { source: '/api/ping', destination: `${dteUrl}/api/ping` },
      { source: '/api/dte/ping', destination: `${dteUrl}/api/ping` },
      { source: '/api/auth/:path*', destination: `${dteUrl}/api/auth/:path*` },
      { source: '/api/items', destination: `${dteUrl}/api/items` },
      { source: '/api/items/:path*', destination: `${dteUrl}/api/items/:path*` },
      { source: '/api/admin', destination: `${dteUrl}/api/admin` },
      { source: '/api/admin/:path*', destination: `${dteUrl}/api/admin/:path*` },
      { source: '/api/requests', destination: `${dteUrl}/api/requests` },
      { source: '/api/requests/:path*', destination: `${dteUrl}/api/requests/:path*` },
      { source: '/api/dte/:path*', destination: `${dteUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${dteUrl}/uploads/:path*` },
      { source: '/api/ai/:path*', destination: `${searchEngineUrl}/api/ai/:path*` },
      { source: '/api/news', destination: `${searchEngineUrl}/api/news` },
      { source: '/api/news/:path*', destination: `${searchEngineUrl}/api/news/:path*` },
      { source: '/api/tokoh', destination: `${searchEngineUrl}/api/tokoh` },
      { source: '/api/tokoh/:path*', destination: `${searchEngineUrl}/api/tokoh/:path*` },
      { source: '/api/geo', destination: `${searchEngineUrl}/api/geo` },
      { source: '/api/geo/:path*', destination: `${searchEngineUrl}/api/geo/:path*` },
      { source: '/api/crawl', destination: `${searchEngineUrl}/api/crawl` },
      { source: '/api/crawl/:path*', destination: `${searchEngineUrl}/api/crawl/:path*` },
      { source: '/api/economics', destination: `${searchEngineUrl}/api/economics` },
      { source: '/api/economics/:path*', destination: `${searchEngineUrl}/api/economics/:path*` },
      { source: '/api/proxy-image', destination: `${searchEngineUrl}/api/proxy-image` },
      { source: '/api/upstream/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/auth/:path*', destination: `${backendUrl}/auth/:path*` },
      { source: '/v1/:path*', destination: `${backendUrl}/v1/:path*` },
      { source: '/download/:path*', destination: `${backendUrl}/download/:path*` },
      { source: '/watermarked/:path*', destination: `${backendUrl}/watermarked/:path*` },
      {
        source: '/((?!assets/|search/|dte/|api/|auth/|v1/|download/|order-dte\\.apk|DPN-Search\\.apk|deepernova-ai\\.apk|watermarked/|ceo\\.jpg|robots\\.txt|sitemap\\.xml|favicon|logo|llms\\.txt|ai-info\\.json|google|\\.well-known/).*)',
        destination: '/index.html',
      },
    ],
  };
}

function replaceTunnelUrlInEdgeFile(filePath, backendUrl) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  const updated = raw.replace(
    /https:\/\/[a-z0-9.-]+\.(?:trycloudflare\.com|lhr\.life)/gi,
    backendUrl
  );
  if (updated !== raw) {
    fs.writeFileSync(filePath, updated, 'utf8');
  }
}

function updateAllConfigs(backendUrl, searchEngineUrl, dteUrl, aiUrl = null) {
  const finalAiUrl = aiUrl || backendUrl;
  const roots = Array.from(new Set([PROD_ROOT_DIR, WORKTREE_DIR])).filter((d) => fs.existsSync(d));

  for (const dir of roots) {
    // 1. active_tunnel.json
    const tunnelPayload = {
      backend: backendUrl,
      search: searchEngineUrl,
      orderDte: dteUrl,
      backendUrl,
      searchEngineUrl,
      dteUrl,
      aiUrl: finalAiUrl,
      backendPort: 3001,
      aiPort: 8000,
      searchEnginePort: 4000,
      dtePort: 5173,
      mode: 'VERCEL_FULLSTACK_NATIVE_DUAL',
      status: 'LIVE',
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(dir, 'active_tunnel.json'), JSON.stringify(tunnelPayload, null, 2), 'utf8');

    // 2. vercel.json (only apply full jobs/agent Edge rewrites where those api files exist; in worktree apply matching rewrites)
    const hasJobsApi = fs.existsSync(path.join(dir, 'api', 'chat', 'jobs', 'stream.js'));
    const vercelConfig = buildVercelConfig(backendUrl, searchEngineUrl, dteUrl);
    if (!hasJobsApi) {
      vercelConfig.rewrites = vercelConfig.rewrites.filter(
        (r) =>
          r.destination !== '/api/chat/jobs/stream?jobId=:jobId' &&
          r.destination !== '/api/serp-search' &&
          r.destination !== '/api/search' &&
          r.destination !== '/api/suggestions' &&
          r.destination !== '/api/status'
      );
      // Ensure /api/search & /api/v1/search route directly to searchEngineUrl when Edge /api/search.js is absent
      vercelConfig.rewrites.unshift(
        { source: '/api/v1/search', destination: `${searchEngineUrl}/api/v1/search` },
        { source: '/api/v1/search-fast', destination: `${searchEngineUrl}/api/v1/search` },
        { source: '/api/search', destination: `${searchEngineUrl}/api/search` },
        { source: '/api/suggestions', destination: `${searchEngineUrl}/api/suggestions` },
        { source: '/api/status', destination: `${searchEngineUrl}/api/status` }
      );
    }
    fs.writeFileSync(path.join(dir, 'vercel.json'), JSON.stringify(vercelConfig, null, 2), 'utf8');

    // 3. Edge API proxy fallback URLs
    const edgeFiles = [
      path.join(dir, 'api', 'chat.js'),
      path.join(dir, 'api', 'agent', '_proxy.js'),
      path.join(dir, 'api', 'chat', 'jobs', '_proxy.js'),
      path.join(dir, 'api', 'subagent', 'orchestrate.js'),
      path.join(dir, 'api', 'auth', 'me.js'),
      path.join(dir, 'api', 'chat', 'stop.js'),
    ];
    for (const ef of edgeFiles) {
      replaceTunnelUrlInEdgeFile(ef, backendUrl);
    }
    replaceTunnelUrlInEdgeFile(path.join(dir, 'api', 'status.js'), searchEngineUrl);

    // 4. src/apiConfig.js
    const apiConfigPath = path.join(dir, 'src', 'apiConfig.js');
    if (fs.existsSync(apiConfigPath)) {
      let apiContent = fs.readFileSync(apiConfigPath, 'utf8');
      apiContent = apiContent.replace(
        /export const CLOUDFLARE_BACKEND_URL = '[^']+';/,
        `export const CLOUDFLARE_BACKEND_URL = '${backendUrl}';`
      );
      apiContent = apiContent.replace(
        /(export const DEEPERNOVA_AI_PUBLIC_URL =[\s\S]*?)'https:\/\/[a-z0-9.-]+\.(?:trycloudflare\.com|lhr\.life)(?:\/v1\/chat\/completions)?';/,
        `$1'${finalAiUrl}';`
      );
      fs.writeFileSync(apiConfigPath, apiContent, 'utf8');
    }

    // 5. .env
    const envPath = path.join(dir, '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent
        .replace(/PUBLIC_BACKEND_URL=\S+/g, `PUBLIC_BACKEND_URL=${backendUrl}`)
        .replace(/VITE_API_URL=\S+/g, `VITE_API_URL=${backendUrl}`)
        .replace(/VPS_PUBLIC_URL=\S+/g, `VPS_PUBLIC_URL=${backendUrl}`)
        .replace(/VITE_ORDER_DTE_URL=\S+/g, `VITE_ORDER_DTE_URL=${dteUrl}`)
        .replace(/DEEPERNOVA_PUBLIC_API_URL=\S+/g, `DEEPERNOVA_PUBLIC_API_URL=${finalAiUrl}/v1/chat/completions`)
        .replace(/VITE_DEEPERNOVA_PUBLIC_API_URL=\S+/g, `VITE_DEEPERNOVA_PUBLIC_API_URL=${finalAiUrl}/v1/chat/completions`)
        .replace(
          /ALLOWED_ORIGINS=\S+/g,
          `ALLOWED_ORIGINS=${backendUrl},${searchEngineUrl},${dteUrl},https://www.deepernova.com,https://deepernova.com,http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:3001`
        );
      fs.writeFileSync(envPath, envContent, 'utf8');
    }

    // 6. .env.production
    const envProdPath = path.join(dir, '.env.production');
    const envProdContent =
      `VITE_DEEPERNOVA_SEARCH_API_URL=/api/v1\n` +
      `VITE_SEARCH_ENGINE_URL=/search\n` +
      `VITE_ORDER_DTE_URL=${dteUrl}\n` +
      `VITE_DEEPERNOVA_SEARCH_API_KEY=dn_live_d69468b9c25451f3b7cd8482e96cbcf7\n` +
      `VITE_DEEPERNOVA_PUBLIC_GUEST_KEY=dn_live_d69468b9c25451f3b7cd8482e96cbcf7\n` +
      `VITE_API_URL=${backendUrl}\n\n` +
      `VITE_DEEPERNOVA_PUBLIC_API_URL=${finalAiUrl}/v1/chat/completions\n`;
    fs.writeFileSync(envProdPath, envProdContent, 'utf8');

    // 7. dpn-search-app/dist/index.html & search-engine/vercel.json
    const dpnHtmlPath = path.join(dir, 'dpn-search-app', 'dist', 'index.html');
    if (fs.existsSync(dpnHtmlPath)) {
      const dpnHtml = fs.readFileSync(dpnHtmlPath, 'utf8');
      fs.writeFileSync(
        dpnHtmlPath,
        dpnHtml.replace(/var BACKEND_URL = '[^']+';/, `var BACKEND_URL = '${searchEngineUrl}';`),
        'utf8'
      );
    }
    const seVercelPath = path.join(dir, 'search-engine', 'vercel.json');
    if (fs.existsSync(seVercelPath)) {
      try {
        const seV = JSON.parse(fs.readFileSync(seVercelPath, 'utf8'));
        if (Array.isArray(seV.rewrites)) {
          const rw = seV.rewrites.find((r) => r.source === '/api/:path*');
          if (rw) rw.destination = `${searchEngineUrl}/api/:path*`;
          fs.writeFileSync(seVercelPath, JSON.stringify(seV, null, 2), 'utf8');
        }
      } catch {}
    }

    log.success(`Konfigurasi diperbarui di: ${dir}`);
  }

  // Update Order DTE frontend DIRECT_DTE_TUNNEL fallback URL
  try {
    const dteConfigPath = path.join(ORDER_DTE_USER_DIR, 'src', 'config.js');
    if (fs.existsSync(dteConfigPath) && dteUrl) {
      const origCfg = fs.readFileSync(dteConfigPath, 'utf8');
      const nextCfg = origCfg.replace(
        /export const DIRECT_DTE_TUNNEL = '[^']+';/,
        `export const DIRECT_DTE_TUNNEL = '${dteUrl}';`
      );
      if (nextCfg !== origCfg) {
        fs.writeFileSync(dteConfigPath, nextCfg, 'utf8');
        const dteViteBin = path.join(ORDER_DTE_USER_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
        if (fs.existsSync(dteViteBin)) {
          execSync(`node "${dteViteBin}" build`, { cwd: ORDER_DTE_USER_DIR, stdio: 'inherit' });
        }
        const copyDte = path.join(PROD_ROOT_DIR, 'scripts', 'copy_dte_dist.mjs');
        if (fs.existsSync(copyDte)) {
          execSync(`node "${copyDte}"`, { cwd: PROD_ROOT_DIR, stdio: 'inherit' });
        }
        log.success(`Order DTE frontend rebuilt dengan DIRECT_DTE_TUNNEL = ${dteUrl}`);
      }
    }
  } catch (dteErr) {
    log.warn(`Gagal sync Order DTE config: ${dteErr.message}`);
  }
}

function buildAndDeployToVercel(reasonLabel = 'sync live tunnels') {
  try {
    if (!process.argv.includes('--skip-build')) {
      log.info('Membangun frontend produksi (Vite build) di repositori utama untuk Vercel...');
      const viteBin = path.join(PROD_ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
      if (fs.existsSync(viteBin)) {
        execSync(`node "${viteBin}" build`, { cwd: PROD_ROOT_DIR, stdio: 'inherit' });
        const copySearch = path.join(PROD_ROOT_DIR, 'scripts', 'copy_search_dist.mjs');
        const copyDte = path.join(PROD_ROOT_DIR, 'scripts', 'copy_dte_dist.mjs');
        if (fs.existsSync(copySearch)) execSync(`node "${copySearch}"`, { cwd: PROD_ROOT_DIR, stdio: 'inherit' });
        if (fs.existsSync(copyDte)) execSync(`node "${copyDte}"`, { cwd: PROD_ROOT_DIR, stdio: 'inherit' });
      }
      log.success('Build produksi selesai.');
    }

    if (!process.argv.includes('--skip-push')) {
      log.info('Melakukan Git commit & push ke origin/main untuk memicu Auto-Deploy Vercel...');
      const lockFile = path.join(PROD_ROOT_DIR, '.git', 'index.lock');
      try {
        if (fs.existsSync(lockFile)) {
          const ageMs = Date.now() - fs.statSync(lockFile).mtimeMs;
          if (ageMs > 15000) fs.unlinkSync(lockFile);
        }
      } catch {}

      const filesToStage = [
        'vercel.json',
        'active_tunnel.json',
        'src/apiConfig.js',
        'api/chat.js',
        'api/agent/_proxy.js',
        'api/chat/jobs/_proxy.js',
        'api/subagent/orchestrate.js',
        'api/status.js',
        'api/auth/me.js',
        'api/chat/stop.js',
        'scripts/auto_start_all.mjs',
        'dist',
        'public/dte',
        'dpn-search-app/dist/index.html',
        'search-engine/vercel.json',
      ].filter((rel) => fs.existsSync(path.join(PROD_ROOT_DIR, rel)));

      execSync(`git add ${filesToStage.map((f) => `"${f}"`).join(' ')}`, {
        cwd: PROD_ROOT_DIR,
        stdio: 'inherit',
      });

      const ts = new Date().toISOString().replace('T', ' ').slice(0, 16);
      try {
        execSync(
          `git commit -m "fix(live): ${reasonLabel} for AI, AI Agent & Search Engine (${ts})"`,
          { cwd: PROD_ROOT_DIR, stdio: 'inherit' }
        );
      } catch {
        log.info('Tidak ada perubahan baru pada file git untuk di-commit.');
      }

      execSync('git push origin main', { cwd: PROD_ROOT_DIR, stdio: 'inherit' });
      log.success('Push ke GitHub origin/main SUKSES! Vercel sedang mendeploy endpoint terbaru.');
    }
  } catch (err) {
    log.error(`Gagal saat build/push Vercel: ${err.message}`);
  }
}

async function ensureAllLocalServicesUp() {
  // 1. FreeLLMAPI Gateway (Port 3005)
  if (!(await checkPortOpen(3005))) {
    if (fs.existsSync(path.join(FREELLM_SERVER_DIR, 'dist', 'index.js'))) {
      startBackgroundService('FreeLLMAPI Gateway (3005)', process.execPath, ['dist/index.js'], FREELLM_SERVER_DIR, 'freellm-3005.log');
      if (await waitForPort(3005, 20000)) {
        log.success('FreeLLMAPI Gateway ONLINE di port 3005.');
      } else {
        log.warn('FreeLLMAPI Gateway masih inisialisasi di port 3005...');
      }
    }
  } else {
    log.success('FreeLLMAPI Gateway sudah ONLINE di port 3005.');
  }

  // 2. DeeperNova AI Python Server (Port 8000)
  if (!(await checkPortOpen(8000))) {
    if (fs.existsSync(path.join(AI_SERVER_DIR, 'start_api_server.py'))) {
      startBackgroundService(
        'DeeperNova Python AI Server (8000)',
        'python',
        ['-u', 'start_api_server.py'],
        AI_SERVER_DIR,
        'ai-python-8000.log',
        { CUDA_VISIBLE_DEVICES: '' }
      );
      if (await waitForPort(8000, 15000)) {
        log.success('DeeperNova Python AI Server ONLINE di port 8000.');
      } else {
        log.info('DeeperNova Python AI Server sedang memuat model di background (port 8000)...');
      }
    }
  } else {
    log.success('DeeperNova Python AI Server sudah ONLINE di port 8000.');
  }

  // 3. DeeperNova Search Engine & Crawler (Port 4000)
  if (!(await checkPortOpen(4000))) {
    if (fs.existsSync(SEARCH_DIR)) {
      const entry = fs.existsSync(path.join(SEARCH_DIR, 'server.js')) ? 'server.js' : 'src/server.js';
      startBackgroundService(
        'DeeperNova Search Engine (4000)',
        process.execPath,
        ['--expose-gc', '--env-file=.env', '--max-old-space-size=4096', entry],
        SEARCH_DIR,
        'search-4000.log'
      );
      if (await waitForPort(4000, 35000)) {
        log.success('DeeperNova Search Engine & Crawler ONLINE di port 4000.');
      } else {
        log.warn('Search Engine masih memuat indeks besar di background (port 4000)...');
      }
    }
  } else {
    log.success('DeeperNova Search Engine sudah ONLINE di port 4000.');
  }

  // 4. DeeperNova Backend AI + AI Agent Sandbox + Chat Jobs (Port 3001)
  if (!(await checkPortOpen(3001))) {
    startBackgroundService(
      'DeeperNova Backend AI & Agent (3001)',
      process.execPath,
      ['server/server.js'],
      PROD_ROOT_DIR,
      'backend-3001.log'
    );
    if (await waitForPort(3001, 30000)) {
      log.success('DeeperNova Backend AI & AI Agent ONLINE di port 3001.');
    } else {
      log.warn('Backend AI belum merespons di port 3001, periksa scratch/backend-3001.log');
    }
  } else {
    log.success('DeeperNova Backend AI & AI Agent sudah ONLINE di port 3001.');
  }

  // 5. Order DTE Backend (Port 5000) & Fast Frontend (Port 5173)
  if (fs.existsSync(ORDER_DTE_SERVER_DIR) && !(await checkPortOpen(5000))) {
    startBackgroundService('Order DTE Backend (5000)', process.execPath, ['server.js'], ORDER_DTE_SERVER_DIR, 'dte-5000.log');
    await waitForPort(5000, 12000);
  }
  if (fs.existsSync(ORDER_DTE_USER_DIR) && !(await checkPortOpen(5173))) {
    startBackgroundService('Order DTE Frontend (5173)', process.execPath, ['fast-server.mjs'], ORDER_DTE_USER_DIR, 'dte-5173.log');
    await waitForPort(5173, 12000);
  }

  // 6. DeeperNova Frontend Vite Dev (Port 5174)
  if (!(await checkPortOpen(5174))) {
    const viteBin = path.join(PROD_ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
    if (fs.existsSync(viteBin)) {
      startBackgroundService('DeeperNova Vite Frontend (5174)', process.execPath, [viteBin, '--port', '5174'], PROD_ROOT_DIR, 'vite-5174.log');
      await waitForPort(5174, 15000);
    }
  }
}

async function main() {
  log.title('DEEPERNOVA ECOSYSTEM MASTER ORCHESTRATOR');

  // Pastikan direktori data tersedia
  for (const d of ['C:\\deepernova-data', 'D:\\deepernova-data', 'D:\\deepernova-data\\temp']) {
    try {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    } catch {}
  }

  // Bersihkan cloudflared yatim sebelumnya
  try {
    execSync('taskkill /f /im cloudflared.exe', { stdio: 'ignore' });
    await sleep(1000);
  } catch {}

  // Step 1: Nyalakan seluruh server lokal
  log.title('STEP 1: MENYALAKAN SERVER AI, FREELLM, AI AGENT & SEARCH ENGINE');
  await ensureAllLocalServicesUp();

  // Step 2: Buka tunnel publik
  log.title('STEP 2: MEMBUKA CLOUDFLARE TUNNELS AKTIF');
  const [backendTunnel, searchTunnel, dteTunnel] = await Promise.all([
    createResilientTunnel(3001, 'Backend AI & AI Agent'),
    createResilientTunnel(4000, 'Search Engine'),
    createResilientTunnel(5173, 'Order DTE'),
  ]);

  let currentBackendUrl = backendTunnel.url;
  let currentSearchUrl = searchTunnel.url;
  let currentDteUrl = dteTunnel.url;
  let activeTunnels = [backendTunnel, searchTunnel, dteTunnel];

  // Step 3: Sinkronisasi semua konfigurasi & Vercel
  log.title('STEP 3: MEMPERBARUI KONFIGURASI & VERCEL');
  updateAllConfigs(currentBackendUrl, currentSearchUrl, currentDteUrl, currentBackendUrl);

  // Sync script ini juga ke repositori produksi agar start_all.bat di sana selalu mutakhir
  try {
    const prodScriptPath = path.join(PROD_ROOT_DIR, 'scripts', 'auto_start_all.mjs');
    if (PROD_ROOT_DIR !== WORKTREE_DIR) {
      fs.copyFileSync(__filename, prodScriptPath);
    }
  } catch {}

  buildAndDeployToVercel('activate all servers & sync live tunnels');

  log.title('SEMUA SERVER & TUNNEL ONLINE 100%!');
  console.log(`  FreeLLM Gateway   : http://127.0.0.1:3005`);
  console.log(`  Python AI Engine  : http://127.0.0.1:8000`);
  console.log(`  Backend AI & Agent: http://127.0.0.1:3001  -> ${currentBackendUrl}`);
  console.log(`  Search Engine     : http://127.0.0.1:4000  -> ${currentSearchUrl}`);
  console.log(`  Order DTE         : http://127.0.0.1:5173  -> ${currentDteUrl}`);
  console.log(`  Frontend Dev      : http://127.0.0.1:5174`);

  if (process.argv.includes('--once')) {
    return;
  }

  // Step 4: Eternal Watchdog Supervisor
  log.title('STEP 4: ETERNAL WATCHDOG SUPERVISOR AKTIF (24/7)');
  let busy = false;
  setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      await ensureAllLocalServicesUp();

      const deadTunnel = activeTunnels.some(
        (t) => !t?.process || t.process.killed || t.process.exitCode !== null
      );
      if (deadTunnel) {
        log.warn('Salah satu proses tunnel berhenti! Membuka ulang tunnel & memperbarui Vercel...');
        for (const t of activeTunnels) {
          try {
            if (t?.process?.pid) execSync(`taskkill /F /T /PID ${t.process.pid}`, { stdio: 'ignore' });
          } catch {}
        }
        await sleep(1500);
        const [bNew, sNew, dNew] = await Promise.all([
          createResilientTunnel(3001, 'Backend AI & AI Agent'),
          createResilientTunnel(4000, 'Search Engine'),
          createResilientTunnel(5173, 'Order DTE'),
        ]);
        currentBackendUrl = bNew.url;
        currentSearchUrl = sNew.url;
        currentDteUrl = dNew.url;
        activeTunnels = [bNew, sNew, dNew];
        updateAllConfigs(currentBackendUrl, currentSearchUrl, currentDteUrl, currentBackendUrl);
        buildAndDeployToVercel('auto-reconnect tunnels');
      }
    } catch (err) {
      log.warn(`Supervisor warning: ${err.message}`);
    } finally {
      busy = false;
    }
  }, 20000);
}

main().catch((err) => {
  log.error(`Fatal error: ${err.message}`);
  console.error(err);
});

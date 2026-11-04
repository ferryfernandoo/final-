import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR_WORKTREE = path.resolve(__dirname, '..');
const ROOT_DIR_PROD = 'F:/a final deepernova ai/deepernova ai';
const CLOUDFLARED_BIN = fs.existsSync('F:/a final deepernova ai/deepernova ai/bin/cloudflared.exe')
  ? 'F:/a final deepernova ai/deepernova ai/bin/cloudflared.exe'
  : 'cloudflared';

const activeTunnels = {
  backend: null,       // Port 3001
  searchEngine: null,  // Port 4000
  dte: null,           // Port 5173
  ai: null             // Port 8000 or fallback 3001
};

function log(msg) {
  console.log(`[TUNNEL-MANAGER] ${new Date().toLocaleTimeString()} ${msg}`);
}

// 1. Start Tunnel for a port with Cloudflare -> Localhost.run failover
function createTunnel(port, label) {
  return new Promise((resolve) => {
    log(`[${label}] Menghubungkan tunnel untuk port ${port}...`);

    let isResolved = false;
    let cfProcess = null;

    // Helper: start localhost.run fallback
    const startLhrFallback = (reason) => {
      if (isResolved) return;
      log(`[${label}] Cloudflare gagal (${reason}). Beralih otomatis ke localhost.run (SSH)...`);
      if (cfProcess) {
        try { cfProcess.kill(); } catch {}
      }

      const lhr = spawn('ssh', [
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ServerAliveInterval=20',
        '-o', 'ServerAliveCountMax=3',
        '-R', `80:127.0.0.1:${port}`,
        'nokey@localhost.run'
      ]);

      const onLhrData = (data) => {
        const text = data.toString();
        const match = text.match(/https:\/\/([a-zA-Z0-9\.\-]+)\.lhr\.life/);
        if (match && !isResolved) {
          isResolved = true;
          log(`[${label}] ✅ Tunnel aktif (localhost.run): ${match[0]}`);
          resolve({ port, label, url: match[0], process: lhr, provider: 'lhr' });
        }
      };

      lhr.stdout.on('data', onLhrData);
      lhr.stderr.on('data', onLhrData);

      lhr.on('exit', (code) => {
        log(`[${label}] Tunnel SSH keluar dengan kode ${code}`);
      });
    };

    // Try Cloudflare Quick Tunnel first
    try {
      cfProcess = spawn(CLOUDFLARED_BIN, ['tunnel', '--url', `http://127.0.0.1:${port}`]);

      const timeoutTimer = setTimeout(() => {
        if (!isResolved) {
          startLhrFallback('Cloudflare timeout 8 detik');
        }
      }, 8000);

      const onCfData = (data) => {
        const text = data.toString();
        if (text.includes('429 Too Many Requests') || text.includes('error code: 1015')) {
          clearTimeout(timeoutTimer);
          startLhrFallback('Rate limit 429');
          return;
        }

        const match = text.match(/https:\/\/([a-zA-Z0-9\-]+)\.trycloudflare\.com/);
        if (match && !isResolved) {
          clearTimeout(timeoutTimer);
          isResolved = true;
          log(`[${label}] ✅ Tunnel aktif (Cloudflare): ${match[0]}`);
          resolve({ port, label, url: match[0], process: cfProcess, provider: 'cloudflare' });
        }
      };

      cfProcess.stdout.on('data', onCfData);
      cfProcess.stderr.on('data', onCfData);

      cfProcess.on('error', (err) => {
        clearTimeout(timeoutTimer);
        startLhrFallback(err.message);
      });
    } catch (err) {
      startLhrFallback(err.message);
    }
  });
}

// 2. Synchronize configuration files across both repos and push to Vercel
function syncConfigs(urls) {
  const { backendUrl, searchEngineUrl, dteUrl, aiUrl } = urls;
  log('Sinkronisasi konfigurasi tunnel ke vercel.json, apiConfig.js, dan .env.production...');

  const targets = [ROOT_DIR_WORKTREE, ROOT_DIR_PROD];

  for (const dir of targets) {
    if (!fs.existsSync(dir)) continue;

    // A. vercel.json
    const vercelPath = path.join(dir, 'vercel.json');
    const vercelConfig = {
      headers: [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-XSS-Protection', value: '1; mode=block' },
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
            { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
            { key: 'Content-Security-Policy', value: "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';" }
          ]
        },
        { source: '/(index.html)?', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' }] },
        { source: '/search/(index.html)?', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' }] },
        { source: '/search/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
        { source: '/dte/(index.html)?', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' }] },
        { source: '/dte/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
        { source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
        {
          source: '/ceo.jpg',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
            { key: 'X-Robots-Tag', value: 'index, follow, max-image-preview:large' }
          ]
        },
        {
          source: '/api/(.*)',
          headers: [
            { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
            { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' }
          ]
        },
        {
          source: '/auth/(.*)',
          headers: [
            { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
            { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' }
          ]
        }
      ],
      rewrites: [
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

        { source: '/api/dte/ping', destination: `${dteUrl}/api/ping` },
        { source: '/api/items', destination: `${dteUrl}/api/items` },
        { source: '/api/items/:path*', destination: `${dteUrl}/api/items/:path*` },
        { source: '/api/admin/:path*', destination: `${dteUrl}/api/admin/:path*` },
        { source: '/api/requests', destination: `${dteUrl}/api/requests` },
        { source: '/api/requests/:path*', destination: `${dteUrl}/api/requests/:path*` },
        { source: '/api/dte/:path*', destination: `${dteUrl}/api/:path*` },
        { source: '/uploads/:path*', destination: `${dteUrl}/uploads/:path*` },

        { source: '/api/search', destination: `${searchEngineUrl}/api/search` },
        { source: '/api/status', destination: `${searchEngineUrl}/api/status` },
        { source: '/api/v1/suggest', destination: `${searchEngineUrl}/suggest` },
        { source: '/api/v1/:path*', destination: `${searchEngineUrl}/api/v1/:path*` },
        { source: '/api/suggestions', destination: `${searchEngineUrl}/api/suggestions` },
        { source: '/api/suggestions/:path*', destination: `${searchEngineUrl}/api/suggestions/:path*` },
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

        { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
        { source: '/auth/:path*', destination: `${backendUrl}/auth/:path*` },
        { source: '/v1/:path*', destination: `${backendUrl}/v1/:path*` },
        { source: '/download/:path*', destination: `${backendUrl}/download/:path*` },
        { source: '/watermarked/:path*', destination: `${backendUrl}/watermarked/:path*` },

        {
          source: '/((?!assets/|search/|dte/|api/|auth/|v1/|download/|order-dte\\.apk|DPN-Search\\.apk|deepernova-ai\\.apk|watermarked/|ceo\\.jpg|robots\\.txt|sitemap\\.xml|favicon|logo|llms\\.txt|ai-info\\.json|google|\\.well-known/).*)',
          destination: '/index.html'
        }
      ]
    };
    fs.writeFileSync(vercelPath, JSON.stringify(vercelConfig, null, 2), 'utf8');

    // B. src/apiConfig.js
    const apiConfigPath = path.join(dir, 'src', 'apiConfig.js');
    if (fs.existsSync(apiConfigPath)) {
      let apiContent = fs.readFileSync(apiConfigPath, 'utf8');
      apiContent = apiContent.replace(
        /(?:export\s+)?const CLOUDFLARE_BACKEND_URL = '[^']+';/,
        `export const CLOUDFLARE_BACKEND_URL = '${backendUrl}';`
      );
      if (aiUrl) {
        apiContent = apiContent.replace(
          /export const DEEPERNOVA_AI_PUBLIC_URL =\s*[\s\S]*?'https:\/\/[a-z0-9\.\-]+\.(?:trycloudflare\.com|lhr\.life)';/,
          `export const DEEPERNOVA_AI_PUBLIC_URL =\n  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEEPERNOVA_PUBLIC_API_URL) ||\n  '${aiUrl}';`
        );
      }
      fs.writeFileSync(apiConfigPath, apiContent, 'utf8');
    }

    // C. .env.production
    const envProdPath = path.join(dir, '.env.production');
    const envProd = `VITE_DEEPERNOVA_SEARCH_API_URL=/api/v1\nVITE_SEARCH_ENGINE_URL=/search\nVITE_ORDER_DTE_URL=${dteUrl}\nVITE_DEEPERNOVA_SEARCH_API_KEY=dn_live_d69468b9c25451f3b7cd8482e96cbcf7\nVITE_DEEPERNOVA_PUBLIC_GUEST_KEY=dn_live_d69468b9c25451f3b7cd8482e96cbcf7\nVITE_API_URL=${backendUrl}\n\nVITE_DEEPERNOVA_PUBLIC_API_URL=${aiUrl}/v1/chat/completions\n`;
    fs.writeFileSync(envProdPath, envProd, 'utf8');

    // D. active_tunnel.json
    const activeTunnelFile = path.join(dir, 'active_tunnel.json');
    fs.writeFileSync(activeTunnelFile, JSON.stringify({
      backendUrl,
      aiUrl,
      searchEngineUrl,
      dteUrl,
      backendPort: 3001,
      aiPort: 8000,
      searchEnginePort: 4000,
      dtePort: 5173,
      status: 'LIVE',
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf8');
  }

  // Quick Git Commit & Push to Vercel
  try {
    log('Mempersiapkan auto-deploy ke Vercel via GitHub...');
    execSync('git add active_tunnel.json src/apiConfig.js vercel.json dpn-search-app/dist/index.html search-engine/vercel.json', { cwd: ROOT_DIR_PROD, stdio: 'ignore' });
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 16);
    execSync(`git commit -m "fix(tunnel): update live tunnel URLs for AI, DTE, and Search Engine (${ts})"`, { cwd: ROOT_DIR_PROD, stdio: 'ignore' });
    execSync('git push origin main', { cwd: ROOT_DIR_PROD, stdio: 'ignore' });
    log('🚀 Push ke GitHub sukses! Vercel otomatis mendeploy endpoint aktif.');
  } catch (err) {
    log(`⚠️ Push Git: ${err.message}`);
  }
}

// 3. Main runner
async function startAll() {
  log('==================================================');
  log('🚀 MENJALANKAN RESILIENT MULTI-PROVIDER TUNNEL');
  log('==================================================');

  // Launch tunnels concurrently
  const [bTunnel, sTunnel, dTunnel] = await Promise.all([
    createTunnel(3001, 'AI & Backend'),
    createTunnel(4000, 'Search Engine'),
    createTunnel(5173, 'Order DTE Portal')
  ]);

  activeTunnels.backend = bTunnel;
  activeTunnels.searchEngine = sTunnel;
  activeTunnels.dte = dTunnel;
  activeTunnels.ai = bTunnel; // Share AI backend tunnel

  const urls = {
    backendUrl: bTunnel.url,
    searchEngineUrl: sTunnel.url,
    dteUrl: dTunnel.url,
    aiUrl: bTunnel.url
  };

  syncConfigs(urls);

  log('==================================================');
  log('🎉 SEMUA LAYANAN TERHUBUNG & ONLINE!');
  log(`  🤖 AI & Backend : ${bTunnel.url}`);
  log(`  🔎 Search Engine: ${sTunnel.url}`);
  log(`  📦 Order DTE    : ${dTunnel.url}`);
  log('==================================================');
}

// 4. Background Heartbeat Watchdog every 30 seconds
setInterval(async () => {
  try {
    const checkBackend = activeTunnels.backend?.process && !activeTunnels.backend.process.killed;
    const checkSearch = activeTunnels.searchEngine?.process && !activeTunnels.searchEngine.process.killed;
    const checkDte = activeTunnels.dte?.process && !activeTunnels.dte.process.killed;

    let isHealthy = checkBackend && checkSearch && checkDte;
    if (isHealthy && activeTunnels.backend?.url) {
      try {
        const res = await fetch(`${activeTunnels.backend.url}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [] })
        });
        if (res.status === 502 || res.status === 504) {
          log(`⚠️ Health check failed with status ${res.status}, reconnecting tunnels...`);
          isHealthy = false;
        }
      } catch (_e) {
        isHealthy = false;
      }
    }

    if (!isHealthy) {
      log('⚠️ Terdeteksi tunnel tidak sehat/terputus, menghubungkan ulang secara otomatis...');
      try {
        if (activeTunnels.backend?.process) activeTunnels.backend.process.kill();
        if (activeTunnels.searchEngine?.process) activeTunnels.searchEngine.process.kill();
        if (activeTunnels.dte?.process) activeTunnels.dte.process.kill();
      } catch (_k) {}
      await startAll();
    }
  } catch (e) {
    log(`Watchdog error: ${e.message}`);
  }
}, 30000);

startAll().catch(err => {
  log(`FATAL ERROR: ${err.message}`);
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIRS = [
  path.resolve(__dirname, '..'),
  'F:/a final deepernova ai/deepernova ai'
];

const activeTunnelPath = 'F:/a final deepernova ai/deepernova ai/active_tunnel.json';
if (!fs.existsSync(activeTunnelPath)) {
  console.error('active_tunnel.json not found!');
  process.exit(1);
}

const activeTunnel = JSON.parse(fs.readFileSync(activeTunnelPath, 'utf8'));
const { backendUrl, searchEngineUrl, dteUrl, aiUrl } = activeTunnel;

console.log('Syncing live tunnels:');
console.log('  Backend      :', backendUrl);
console.log('  Search Engine:', searchEngineUrl);
console.log('  DTE Portal   :', dteUrl);
console.log('  AI GPU       :', aiUrl);

for (const ROOT_DIR of ROOT_DIRS) {
  if (!fs.existsSync(ROOT_DIR)) continue;

  // 1. Update vercel.json
  const vercelPath = path.join(ROOT_DIR, 'vercel.json');
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
      {
        source: '/(index.html)?',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' }]
      },
      {
        source: '/search/(index.html)?',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' }]
      },
      {
        source: '/search/assets/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
      },
      {
        source: '/dte/(index.html)?',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' }]
      },
      {
        source: '/dte/assets/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
      },
      {
        source: '/assets/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
      },
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
  console.log('✅ Updated vercel.json in ' + ROOT_DIR);

  // 2. Update src/apiConfig.js
  const apiConfigPath = path.join(ROOT_DIR, 'src', 'apiConfig.js');
  if (fs.existsSync(apiConfigPath)) {
    let apiContent = fs.readFileSync(apiConfigPath, 'utf8');
    apiContent = apiContent.replace(
      /(?:export\s+)?const CLOUDFLARE_BACKEND_URL = '[^']+';/,
      `export const CLOUDFLARE_BACKEND_URL = '${backendUrl}';`
    );
    if (aiUrl) {
      apiContent = apiContent.replace(
        /export const DEEPERNOVA_AI_PUBLIC_URL =\s*[\s\S]*?'https:\/\/[a-z0-9\-]+\.trycloudflare\.com';/,
        `export const DEEPERNOVA_AI_PUBLIC_URL =\n  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEEPERNOVA_PUBLIC_API_URL) ||\n  '${aiUrl}';`
      );
    }
    fs.writeFileSync(apiConfigPath, apiContent, 'utf8');
    console.log('✅ Updated src/apiConfig.js in ' + ROOT_DIR);
  }

  // 3. Update .env.production
  const envProdPath = path.join(ROOT_DIR, '.env.production');
  const envProd = `VITE_DEEPERNOVA_SEARCH_API_URL=/api/v1\nVITE_SEARCH_ENGINE_URL=/search\nVITE_ORDER_DTE_URL=${dteUrl}\nVITE_DEEPERNOVA_SEARCH_API_KEY=dn_live_d69468b9c25451f3b7cd8482e96cbcf7\nVITE_DEEPERNOVA_PUBLIC_GUEST_KEY=dn_live_d69468b9c25451f3b7cd8482e96cbcf7\nVITE_API_URL=${backendUrl}\n\nVITE_DEEPERNOVA_PUBLIC_API_URL=${aiUrl}/v1/chat/completions\n`;
  fs.writeFileSync(envProdPath, envProd, 'utf8');
  console.log('✅ Updated .env.production in ' + ROOT_DIR);
}

console.log('All tunnel configs synchronized successfully!');


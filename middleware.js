// middleware.js — Vercel Edge Middleware for Server-Side AI Crawler Shielding
export const config = {
  matcher: '/:path*',
};

const BLOCKED_BOTS = [
  'gptbot',
  'chatgpt-user',
  'claudebot',
  'claude-web',
  'anthropic-ai',
  'google-extended',
  'perplexitybot',
  'applebot-extended',
  'ccbot',
  'bytespider',
  'amazonbot',
  'meta-externalagent',
  'diffbot',
  'scrapy',
  'cohere-ai'
];

export default function middleware(request) {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const url = new URL(request.url);
  const pathname = url.pathname.toLowerCase();

  // 🛡️ 1. Block any direct access to source code, server files, databases, and configuration
  const SENSITIVE_PATHS = [
    '/.env',
    '/.git',
    '/package.json',
    '/package-lock.json',
    '/vite.config.js',
    '/vercel.json',
    '/server.js',
    '/middleware.js'
  ];

  const SENSITIVE_EXTENSIONS = ['.jsx', '.tsx', '.ts', '.py', '.sh', '.db', '.sqlite', '.sqlite3', '.sql', '.map', '.lock', '.log'];
  const SENSITIVE_PREFIXES = ['/src/', '/server/', '/electron/', '/android/', '/routes/', '/scripts/', '/data/'];

  if (
    SENSITIVE_PATHS.some(p => pathname === p || pathname.startsWith(p + '/')) ||
    SENSITIVE_EXTENSIONS.some(ext => pathname.endsWith(ext)) ||
    SENSITIVE_PREFIXES.some(prefix => pathname.startsWith(prefix)) ||
    pathname.includes('..') ||
    pathname.includes('/.')
  ) {
    return new Response('Access Denied: Protected System File', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet'
      }
    });
  }

  // 🛡️ 2. Allow static public assets
  const isStaticAsset = pathname.endsWith('.css') ||
                        pathname.endsWith('.js') ||
                        pathname.endsWith('.png') ||
                        pathname.endsWith('.jpg') ||
                        pathname.endsWith('.jpeg') ||
                        pathname.endsWith('.svg') ||
                        pathname.endsWith('.woff2') ||
                        pathname.endsWith('.ico') ||
                        pathname.endsWith('.webp');

  const isPublicMetadata = pathname === '/llms.txt' ||
                           pathname === '/ai-info.json' ||
                           pathname === '/sitemap.xml' ||
                           pathname === '/robots.txt';

  if (!isPublicMetadata && !isStaticAsset) {
    const isBlocked = BLOCKED_BOTS.some(bot => ua.includes(bot));
    if (isBlocked) {
      return new Response('Access Denied: Web Scraping & AI Crawling Prohibited', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
          'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet'
        }
      });
    }
  }

  // Pass-through to Vercel static asset serving and rewrites engine
  return new Response(null, {
    headers: {
      'x-middleware-next': '1'
    }
  });
}

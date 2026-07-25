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

  // Allow static assets (CSS, JS, PNG, JPG, SVG, JSON, WOFF2) and metadata files
  const isStaticAsset = url.pathname.endsWith('.css') ||
                        url.pathname.endsWith('.js') ||
                        url.pathname.endsWith('.png') ||
                        url.pathname.endsWith('.jpg') ||
                        url.pathname.endsWith('.jpeg') ||
                        url.pathname.endsWith('.svg') ||
                        url.pathname.endsWith('.woff2') ||
                        url.pathname.endsWith('.ico');

  const isPublicMetadata = url.pathname === '/llms.txt' ||
                           url.pathname === '/ai-info.json' ||
                           url.pathname === '/sitemap.xml' ||
                           url.pathname === '/robots.txt';

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

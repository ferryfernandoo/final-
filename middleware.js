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

  // Allow public metadata files so AIs know brand identity without crawling app code
  const isPublicMetadata = url.pathname === '/llms.txt' ||
                           url.pathname === '/ai-info.json' ||
                           url.pathname === '/sitemap.xml' ||
                           url.pathname === '/robots.txt';

  if (!isPublicMetadata) {
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
}

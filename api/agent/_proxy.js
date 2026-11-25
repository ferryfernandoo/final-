const FALLBACK_BACKEND_URL =
  (typeof globalThis !== 'undefined' && globalThis.process?.env?.PUBLIC_BACKEND_URL) ||
  'https://55e32c6ed4f5fa.app.lhr.life';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-device-id',
  'Access-Control-Expose-Headers': 'Content-Disposition, Content-Length, Content-Type',
};

/**
 * Transparently proxy all /api/agent/* requests to the live Express sandbox server
 * so session history, file writes, downloads, ZIP archives, code execution, and HTML previews share one filesystem.
 */
export async function proxyAgentBackend(req, defaultSubPath = '') {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const incomingUrl = new URL(req.url);
  const subPath = incomingUrl.pathname.startsWith('/api/')
    ? incomingUrl.pathname.slice('/api'.length)
    : defaultSubPath;

  const forwardHeaders = new Headers();
  const forwardKeys = [
    'content-type',
    'authorization',
    'cookie',
    'x-device-id',
    'accept',
  ];
  for (const key of forwardKeys) {
    const val = req.headers.get(key);
    if (val) forwardHeaders.set(key, val);
  }

  const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());
  const bodyBuffer = hasBody ? await req.arrayBuffer().catch(() => null) : null;

  const candidateBases = [
    new URL('/api/upstream', incomingUrl.origin).toString().replace(/\/$/, ''),
    FALLBACK_BACKEND_URL.replace(/\/$/, '') + '/api',
  ];

  let lastErr = null;
  for (const base of candidateBases) {
    const targetUrl = `${base}${subPath}${incomingUrl.search}`;
    try {
      const upstreamResp = await fetch(targetUrl, {
        method: req.method,
        headers: forwardHeaders,
        body: bodyBuffer && bodyBuffer.byteLength > 0 ? bodyBuffer : undefined,
      });

      const respHeaders = new Headers(CORS_HEADERS);
      const passThroughKeys = [
        'content-type',
        'content-disposition',
        'content-length',
        'cache-control',
        'x-content-type-options',
      ];
      for (const h of passThroughKeys) {
        const val = upstreamResp.headers.get(h);
        if (val) respHeaders.set(h, val);
      }

      if (!respHeaders.has('cache-control')) {
        respHeaders.set('cache-control', 'no-cache, no-transform');
      }

      return new Response(upstreamResp.body, {
        status: upstreamResp.status,
        headers: respHeaders,
      });
    } catch (err) {
      lastErr = err;
    }
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: 'Agent sandbox backend unavailable',
      detail: lastErr ? lastErr.message : 'Upstream connection failed',
    }),
    {
      status: 503,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    }
  );
}

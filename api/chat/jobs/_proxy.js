const FALLBACK_BACKEND_URL =
  (typeof globalThis !== 'undefined' && globalThis.process?.env?.PUBLIC_BACKEND_URL) ||
  'https://liberty-bracelet-mayor-gaps.trycloudflare.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-device-id',
};

export async function proxyChatJobs(req, targetPath) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const incomingUrl = new URL(req.url);
  const cleanSearchParams = new URLSearchParams(incomingUrl.searchParams);
  cleanSearchParams.delete('jobId');
  const qs = cleanSearchParams.toString();
  const targetUrl = `${FALLBACK_BACKEND_URL.replace(/\/$/, '')}${targetPath}${qs ? `?${qs}` : ''}`;

  const forwardHeaders = new Headers();
  for (const key of ['content-type', 'cookie', 'x-device-id', 'authorization', 'accept']) {
    const val = req.headers.get(key);
    if (val) forwardHeaders.set(key, val);
  }

  const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());
  const bodyBuffer = hasBody ? await req.arrayBuffer().catch(() => null) : null;

  try {
    const upstreamResp = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: bodyBuffer && bodyBuffer.byteLength > 0 ? bodyBuffer : undefined,
    });

    const contentType = upstreamResp.headers.get('content-type') || 'application/json';
    const isSse = contentType.includes('text/event-stream');
    const respHeaders = new Headers(CORS_HEADERS);
    respHeaders.set('Content-Type', contentType);
    if (isSse) {
      respHeaders.set('Cache-Control', 'no-cache, no-transform');
      respHeaders.set('Connection', 'keep-alive');
      respHeaders.set('X-Accel-Buffering', 'no');
    } else {
      respHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }

    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      headers: respHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server background job service temporarily unavailable',
        detail: err?.message || 'Upstream connection failed',
      }),
      {
        status: 503,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
}

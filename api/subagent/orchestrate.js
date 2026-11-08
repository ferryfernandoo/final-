export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-device-id',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const enrichedBody = {
    ...body,
    isSubAgentStage: true,
    stream: body.stream !== false,
  };

  const sameOriginUpstream = new URL('/api/upstream/subagent/orchestrate', req.url).toString();
  const payloadStr = JSON.stringify(enrichedBody);
  let lastProxyErr = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const proxyResp = await fetch(sameOriginUpstream, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': req.headers.get('x-device-id') || body.deviceId || 'guest_device',
        },
        body: payloadStr,
      });

      if (proxyResp.ok) {
        return new Response(proxyResp.body, {
          status: 200,
          headers: {
            'Content-Type':
              proxyResp.headers.get('content-type') || 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      const errBody = await proxyResp.text().catch(() => '');
      lastProxyErr = new Error(`Upstream ${proxyResp.status}: ${errBody.slice(0, 120)}`);
    } catch (e) {
      lastProxyErr = e;
    }
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }

  return new Response(
    JSON.stringify({
      error: 'Synchronous Sub-Agent Orchestrator sedang sibuk. Silakan coba kembali.',
      detail: lastProxyErr ? lastProxyErr.message : 'Upstream unavailable',
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    }
  );
}


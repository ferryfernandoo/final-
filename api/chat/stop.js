export const config = { runtime: 'edge' };

const FALLBACK_BACKEND_URL = process.env.PUBLIC_BACKEND_URL || 'https://amount-put-dense-sub.trycloudflare.com';

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-device-id'
      }
    });
  }
  try {
    const bodyText = await req.text();
    const forwardHeaders = { 'Content-Type': 'application/json' };
    const cookie = req.headers.get('cookie');
    if (cookie) forwardHeaders.cookie = cookie;
    const devId = req.headers.get('x-device-id');
    if (devId) forwardHeaders['x-device-id'] = devId;

    const resp = await fetch(`${FALLBACK_BACKEND_URL}/api/chat/stop`, {
      method: 'POST',
      headers: forwardHeaders,
      body: bodyText || '{}'
    });
    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch {
    return new Response(JSON.stringify({ success: true, stopped: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}



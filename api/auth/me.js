export const config = { runtime: 'edge' };

const BACKEND_ORIGIN = 'https://liberty-bracelet-mayor-gaps.trycloudflare.com';

export default async function handler(req) {
  try {
    const cookie = req.headers.get('cookie') || '';
    const upstreamResp = await fetch(`${BACKEND_ORIGIN}/auth/me`, {
      method: 'GET',
      headers: {
        ...(cookie ? { cookie } : {}),
        'accept': 'application/json',
        'user-agent': req.headers.get('user-agent') || 'Mozilla/5.0'
      },
      redirect: 'manual'
    });

    const bodyText = await upstreamResp.text();
    const headers = new Headers({
      'Content-Type': upstreamResp.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    const setCookie = upstreamResp.headers.get('set-cookie');
    if (setCookie) {
      headers.set('set-cookie', setCookie);
    }

    return new Response(bodyText, {
      status: upstreamResp.status,
      headers
    });
  } catch (_err) {
    // Do NOT return fake isGuest: true here — return 503 so frontend keeps existing cached session state
    return new Response(JSON.stringify({
      error: 'Auth backend temporarily unreachable',
      authenticated: false
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
}

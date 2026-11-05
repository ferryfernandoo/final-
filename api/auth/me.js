export const config = { runtime: 'edge' };

export default function handler(req) {
  return new Response(JSON.stringify({
    user: null,
    isAuthenticated: false,
    isGuest: true
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}


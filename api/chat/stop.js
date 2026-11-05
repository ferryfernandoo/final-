export const config = { runtime: 'edge' };

export default function handler(req) {
  return new Response(JSON.stringify({
    success: true,
    stopped: true
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}

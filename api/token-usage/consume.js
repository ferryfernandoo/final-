export const config = { runtime: 'edge' };

export default function handler(req) {
  return new Response(JSON.stringify({
    success: true,
    usedTokens: 100
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}

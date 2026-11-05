export const config = { runtime: 'edge' };

export default function handler(req) {
  return new Response(JSON.stringify({
    success: true,
    isLimited: false,
    usedTokens: 0,
    resetTime: null,
    maxLimit: 700000
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}

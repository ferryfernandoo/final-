export const config = { runtime: 'edge' };

export default function handler(req) {
  return new Response(JSON.stringify({
    status: 'ok',
    datacenter: 'Deepernova Edge Network (Global)',
    timestamp: Date.now()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}

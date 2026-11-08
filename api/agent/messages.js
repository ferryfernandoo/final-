export const config = {
  runtime: 'edge',
};

const messagesMap = new Map();

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

  const urlObj = new URL(req.url);
  const sessionId = urlObj.searchParams.get('sessionId') || 'default';

  if (!messagesMap.has(sessionId)) {
    messagesMap.set(sessionId, []);
  }

  const msgs = messagesMap.get(sessionId);

  return new Response(JSON.stringify({
    success: true,
    messages: msgs
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

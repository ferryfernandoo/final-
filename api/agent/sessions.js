export const config = {
  runtime: 'edge',
};

// Global in-memory sessions cache on edge
const sessionsMap = new Map();

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-device-id',
      },
    });
  }

  const deviceId = req.headers.get('x-device-id') || 'guest_device';
  if (!sessionsMap.has(deviceId)) {
    sessionsMap.set(deviceId, []);
  }
  const userSessions = sessionsMap.get(deviceId);

  if (req.method === 'GET') {
    if (userSessions.length === 0) {
      const defaultSession = {
        id: `agent_${Date.now()}_init`,
        title: 'Tugas Otonom AI',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      userSessions.push(defaultSession);
    }
    return new Response(JSON.stringify({
      success: true,
      sessions: userSessions
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json().catch(() => ({}));
      const id = body.id || `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const title = body.title || 'Tugas Otonom AI';
      const newSession = {
        id,
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      userSessions.unshift(newSession);
      return new Response(JSON.stringify({
        success: true,
        session: newSession
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  if (req.method === 'DELETE') {
    const urlObj = new URL(req.url);
    const sessionId = urlObj.pathname.split('/').pop();
    const idx = userSessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) userSessions.splice(idx, 1);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}


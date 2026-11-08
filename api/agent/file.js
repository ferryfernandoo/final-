export const config = {
  runtime: 'edge',
};

// In-memory virtual file storage for edge sandbox
const virtualFileSystem = new Map();

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

  const urlObj = new URL(req.url);
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  const action = pathParts[pathParts.length - 1]; // e.g., 'write', 'read', 'download', 'raw', or 'file'

  // Write file: POST /api/agent/file/write
  if (req.method === 'POST' && (action === 'write' || action === 'file')) {
    try {
      const body = await req.json().catch(() => ({}));
      const { sessionId = 'default', path: filePath, content = '' } = body;
      if (!filePath) {
        return new Response(JSON.stringify({ success: false, error: 'path is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const fileKey = `${sessionId}:${filePath}`;
      virtualFileSystem.set(fileKey, {
        content,
        updatedAt: new Date().toISOString(),
        size: content.length
      });

      return new Response(JSON.stringify({
        success: true,
        file: { path: filePath, size: content.length, updatedAt: new Date().toISOString() }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  // Read file: GET /api/agent/file/read?sessionId=...&path=...
  if (req.method === 'GET' && action === 'read') {
    const sessionId = urlObj.searchParams.get('sessionId') || 'default';
    const filePath = urlObj.searchParams.get('path');
    const fileKey = `${sessionId}:${filePath}`;

    const file = virtualFileSystem.get(fileKey);
    const content = file ? file.content : (filePath === 'SKILL.md' ? '# DeeperNova Autonomous Agent\nReady.' : '');

    return new Response(JSON.stringify({
      success: true,
      content
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Raw or Download file: GET /api/agent/file/raw or /api/agent/file/download
  if (req.method === 'GET' && (action === 'download' || action === 'raw')) {
    const sessionId = urlObj.searchParams.get('sessionId') || 'default';
    const filePath = urlObj.searchParams.get('path') || 'file.txt';
    const fileKey = `${sessionId}:${filePath}`;

    const file = virtualFileSystem.get(fileKey);
    const content = file ? file.content : '';

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': filePath.endsWith('.html') ? 'text/html' : (filePath.endsWith('.json') ? 'application/json' : 'text/plain'),
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // Delete file: DELETE /api/agent/file
  if (req.method === 'DELETE') {
    try {
      const body = await req.json().catch(() => ({}));
      const sessionId = body.sessionId || urlObj.searchParams.get('sessionId') || 'default';
      const filePath = body.path || urlObj.searchParams.get('path');
      if (filePath) {
        virtualFileSystem.delete(`${sessionId}:${filePath}`);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

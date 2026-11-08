export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const urlObj = new URL(req.url);
  const parts = urlObj.pathname.split('/preview/')[1] || '';
  
  return new Response(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DeeperNova Agent Sandbox Preview</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; text-align: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 2rem; max-width: 500px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h2 { color: #38bdf8; margin-top: 0; }
    p { color: #94a3b8; font-size: 0.95rem; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: rgba(56, 189, 248, 0.1); color: #38bdf8; font-size: 0.8rem; font-weight: 600; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">DeeperNova Agent Preview</div>
    <h2>Preview Sandbox Siap</h2>
    <p>File terisolasi: <code>${parts}</code></p>
    <p>Pratinjau visual telah siap dalam container serverless DeeperNova.</p>
  </div>
</body>
</html>`, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

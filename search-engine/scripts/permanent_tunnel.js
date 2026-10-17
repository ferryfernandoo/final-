import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';

const PORT = Number(process.env.PORT) || 3000;
const SUBDOMAIN = process.env.TUNNEL_SUBDOMAIN || 'deepernova-api-v1';

const PATHS = [
  path.resolve('scratch/active_tunnel.json'),
  'C:\\deepernova-search-main\\scratch\\active_tunnel.json'
];

function updateActiveTunnelFile(tunnelUrl, isFixed = true) {
  const data = {
    serverTunnel: tunnelUrl,
    clientTunnel: tunnelUrl,
    isFixed: Boolean(isFixed),
    subdomain: SUBDOMAIN,
    updatedAt: new Date().toISOString()
  };

  for (const p of PATHS) {
    try {
      const dir = path.dirname(p);
      if (fs.existsSync(dir)) {
        fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
      }
    } catch {}
  }
}

function sanitizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function detectCloudflaredBinary() {
  const candidates = [
    path.resolve('bin/cloudflared.exe'),
    path.resolve('bin/cloudflared'),
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
    'cloudflared'
  ];

  for (const candidate of candidates) {
    try {
      if (candidate === 'cloudflared') {
        execSync('cloudflared --version', { stdio: 'ignore' });
        return candidate;
      }
      if (fs.existsSync(candidate)) return candidate;
    } catch {}
  }

  return null;
}

let currentTunnel = null;
let isReconnecting = false;
let reconnectTimer = null;
let nextReconnectDelayMs = 1500;

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

async function probeTunnelHealth(url) {
  if (!url) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(`${sanitizeUrl(url)}/api/tunnel/info`, {
      headers: { 'Bypass-Tunnel-Reminder': 'true' },
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

function scheduleReconnect(reason, delayMs = null) {
  if (isReconnecting) return;
  clearReconnectTimer();
  isReconnecting = true;
  const waitMs = delayMs ?? nextReconnectDelayMs;
  nextReconnectDelayMs = Math.min(waitMs + 1500, 15000);
  console.warn(`[TUNNEL] ⚠️ ${reason}. Reconnecting in ${Math.round(waitMs / 1000)}s...`);

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    await startTunnel(SUBDOMAIN);
  }, waitMs);
}

function safeCloseTunnel(tunnel) {
  if (!tunnel) return;
  try {
    if (typeof tunnel.close === 'function') tunnel.close();
  } catch {}

  try {
    if (tunnel.process && typeof tunnel.process.kill === 'function') {
      tunnel.process.kill('SIGTERM');
    }
  } catch {}

  try {
    if (tunnel.socket && typeof tunnel.socket.destroy === 'function') {
      tunnel.socket.destroy();
    }
  } catch {}
}

async function startLocalTunnel(preferredSubdomain = SUBDOMAIN) {
  const { default: localtunnel } = await import('localtunnel');
  const tunnel = await localtunnel({
    port: PORT,
    subdomain: preferredSubdomain,
    host: 'https://localtunnel.me',
    local_http: true
  });

  const wrapped = {
    url: sanitizeUrl(tunnel.url),
    close: () => tunnel.close(),
    process: tunnel
  };

  currentTunnel = wrapped;
  isReconnecting = false;
  nextReconnectDelayMs = 1500;

  console.log('[TUNNEL] ✅ localtunnel connected');
  console.log(`[TUNNEL] 🔗 LocalTunnel URL: ${wrapped.url}`);
  updateActiveTunnelFile(wrapped.url, true);

  tunnel.on('close', () => scheduleReconnect('localtunnel closed'));
  tunnel.on('error', (err) => {
    console.error('[TUNNEL] ❌ localtunnel error:', err.message);
    scheduleReconnect('localtunnel error');
  });

  return wrapped;
}

async function startCloudflaredTunnel() {
  const bin = detectCloudflaredBinary();
  if (!bin) {
    throw new Error('cloudflared binary not found');
  }

  return await new Promise((resolve, reject) => {
    const hosts = ['http://127.0.0.1:3000', `http://localhost:${PORT}`];
    const child = spawn(bin, ['tunnel', '--url', hosts[0], '--no-autoupdate', '--loglevel', 'warn'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    let output = '';
    let settled = false;
    let timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { child.kill('SIGTERM'); } catch {}
        reject(new Error('cloudflared did not publish a URL in time'));
      }
    }, 15000);

    const finish = (error, url) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        reject(error);
        return;
      }
      const wrapped = {
        url: sanitizeUrl(url),
        process: child,
        close: () => child.kill('SIGTERM')
      };
      resolve(wrapped);
    };

    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(/https?:\/\/[^\s"']+(?:trycloudflare\.com|trycloudflare\.net|cloudflare\.dev|loca\.lt|workers\.dev)/i);
      if (match) {
        finish(null, match[0]);
      }
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.on('exit', (code) => {
      if (!settled) {
        finish(new Error(`cloudflared exited before publishing tunnel (code ${code})`));
      }
    });
  });
}

async function startTunnel(preferredSubdomain = SUBDOMAIN) {
  if (isReconnecting && reconnectTimer) return;

  if (currentTunnel) {
    safeCloseTunnel(currentTunnel);
    currentTunnel = null;
  }

  console.log(`[TUNNEL] 🚀 Connecting durable tunnel on port ${PORT}...`);

  try {
    const cloudflaredTunnel = await startCloudflaredTunnel();
    currentTunnel = cloudflaredTunnel;
    isReconnecting = false;
    nextReconnectDelayMs = 1500;

    const healthy = await probeTunnelHealth(currentTunnel.url);
    if (!healthy) {
      throw new Error('cloudflared published URL but health check failed');
    }

    console.log('[TUNNEL] ✅ Cloudflare tunnel live and stable');
    console.log(`[TUNNEL] 🔗 Tunnel URL: ${currentTunnel.url}`);
    console.log(`[TUNNEL] 🌐 Endpoint: ${currentTunnel.url}/api/v1/search`);
    updateActiveTunnelFile(currentTunnel.url, true);

    const child = currentTunnel.process;
    child.on('exit', () => scheduleReconnect('cloudflared exited', 1200));
    return currentTunnel;
  } catch (err) {
    console.warn(`[TUNNEL] ⚠️ Cloudflare tunnel unavailable: ${err.message}. Falling back to localtunnel...`);
  }

  try {
    const fallback = await startLocalTunnel(preferredSubdomain);
    currentTunnel = fallback;
    isReconnecting = false;
    nextReconnectDelayMs = 1500;
    return fallback;
  } catch (err) {
    console.error(`[TUNNEL] ❌ Unable to create any tunnel: ${err.message}`);
    isReconnecting = false;
    scheduleReconnect('tunnel creation failed', 2500);
  }
}

setInterval(async () => {
  if (!currentTunnel || !currentTunnel.url) return;

  try {
    const ok = await probeTunnelHealth(currentTunnel.url);
    if (!ok) {
      throw new Error('health probe failed');
    }
  } catch (err) {
    scheduleReconnect(`health check failed (${err.message})`, 1500);
  }
}, 15000);

process.on('SIGINT', () => {
  clearReconnectTimer();
  safeCloseTunnel(currentTunnel);
  process.exit(0);
});

process.on('SIGTERM', () => {
  clearReconnectTimer();
  safeCloseTunnel(currentTunnel);
  process.exit(0);
});

startTunnel();

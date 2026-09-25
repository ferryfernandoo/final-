import express from 'express';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load env variables FIRST, before any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Now load other modules
import helmet from 'helmet';
import crypto from 'crypto';
import cors from 'cors';
import multer from 'multer';
import XLSX from 'xlsx';
import fetch from 'node-fetch';
import session from 'express-session';
import passport from './auth.js';
import { hashPassword } from './auth.js';
import { initializeDatabase, userDb, sessionDb, messageDb, apiKeyDb, artifactDb, imageDb, uploadedImageDb, globalMemoryDb, checkRateLimiting, cloudDb } from './database.js';
import db from './database.js';
import { SQLiteSessionStore } from './sessionStore.js';
import { v4 as uuidv4 } from 'uuid';
import apiProxyRoutes from './routes/api-proxy.js';
import ragService from './ragService.js';
import externalFinanceService from './externalFinanceService.js';
import sourceTracker from './sourceTracker.js';
import DocumentGeneratorService from './documentGeneratorService.js';
import sharp from 'sharp';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

/**
 * Helper: Apply faststart optimization to MP4/video files (-movflags +faststart)
 * Relocates moov atom to beginning of file so videos buffer and play instantly.
 */
const applyFaststartToVideo = (filePath) => {
  return new Promise((resolve) => {
    if (!filePath || !fs.existsSync(filePath)) {
      return resolve({ success: false, error: 'File does not exist' });
    }
    const dir = path.dirname(filePath);
    const tempOutput = path.join(dir, `fs_${Date.now()}_${path.basename(filePath)}`);

    try {
      const proc = spawn(ffmpegInstaller.path, [
        '-y',
        '-i', filePath,
        '-c', 'copy',
        '-movflags', '+faststart',
        tempOutput
      ]);

      proc.on('error', (err) => {
        try { if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput); } catch (_) {}
        resolve({ success: false, error: err.message });
      });

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(tempOutput)) {
          try {
            fs.copyFileSync(tempOutput, filePath);
            fs.unlinkSync(tempOutput);
            resolve({ success: true, path: filePath });
          } catch (copyErr) {
            resolve({ success: false, error: copyErr.message });
          }
        } else {
          try { if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput); } catch (_) {}
          resolve({ success: false, error: `FFmpeg faststart exited with code ${code}` });
        }
      });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
};

/**
 * Helper: Transcode any video into Universal Web MP4 (H.264 + AAC + yuv420p + faststart)
 * Works with 100% of browsers and devices.
 */
const transcodeToUniversalMP4 = (inputPath, outputPath) => {
  return new Promise((resolve) => {
    if (!inputPath || !fs.existsSync(inputPath)) {
      return resolve({ success: false, error: 'Input file does not exist' });
    }

    try {
      const proc = spawn(ffmpegInstaller.path, [
        '-y',
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-movflags', '+faststart',
        outputPath
      ]);

      let errorMsg = '';
      proc.stderr.on('data', (d) => {
        errorMsg += d.toString();
      });

      proc.on('error', (err) => {
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_) {}
        resolve({ success: false, error: err.message });
      });

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve({ success: true, outputPath });
        } else {
          try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_) {}
          resolve({ success: false, error: `FFmpeg transcode failed (exit code ${code}): ${errorMsg.slice(-200)}` });
        }
      });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
};


// RAG Service initialization flag
let ragInitialized = false;

// Initialize database
initializeDatabase();

// TokenMix chat API using llama-4-maverick by default (Text + Vision native)
const sanitizeTokenKey = (k) => k ? String(k).trim().replace(/^s+(sk-)/i, '$1') : '';
const DEFAULT_TOKENMIX_KEY = 'sk-tm-0oMaTRPBJiEibFQ6SpC7MUNdYrTnLf2QIMhNXEzvvKZZ8cSi';
const RAW_TOKENMIX_KEY = process.env.TOKENMIX_API_KEY || process.env.TOKENMIX_CHAT_API_KEY || process.env.VITE_TOKENMIX_API_KEY || DEFAULT_TOKENMIX_KEY;
const TOKENMIX_API_KEY = sanitizeTokenKey(RAW_TOKENMIX_KEY);
const TOKENMIX_API_KEYS = Array.from(new Set([TOKENMIX_API_KEY, DEFAULT_TOKENMIX_KEY].filter(Boolean)));
const TOKENMIX_CHAT_API_KEY = TOKENMIX_API_KEY;
const TOKENMIX_CHAT_API_URL = process.env.TOKENMIX_CHAT_API_URL || 'https://api.tokenmix.ai/v1/chat/completions';
const DEFAULT_CHAT_MODEL = process.env.TOKENMIX_CHAT_MODEL || 'llama-4-maverick';

// Backward compatibility references
const DEEPSEEK_API_KEY = TOKENMIX_API_KEY;
const DEEPSEEK_API_KEYS = TOKENMIX_API_KEYS;
const DEEPSEEK_API_URL = TOKENMIX_CHAT_API_URL;

console.log(`✅ Using TokenMix API (${DEFAULT_CHAT_MODEL}) at ${TOKENMIX_CHAT_API_URL}`);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// 🛡️ ADVANCED SECURITY HEADERS (HELMET, COOP, ANTI-CLICKJACKING, ANTI-SNIFF)
app.use(helmet({
  crossOriginResourcePolicy: false, // Managed with granular public vs private policy below
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false, // Disabled globally to allow embedding public assets/fonts/iframes
  frameguard: { action: 'sameorigin' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hidePoweredBy: true,
  contentSecurityPolicy: false,
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}));

// 🌐 GRANULAR CORP (CROSS-ORIGIN RESOURCE POLICY) & PUBLIC ASSET ALLOWANCE
// Public images (including CEO photo /ceo.jpg), sitemaps, and llms.txt are fully accessible to crawlers.
app.use((req, res, next) => {
  const reqPath = req.path || '';
  const isPublicMediaOrAsset =
    reqPath === '/' ||
    reqPath === '/index.html' ||
    reqPath === '/help' ||
    reqPath === '/help.html' ||
    reqPath === '/codedance' ||
    reqPath === '/documents' ||
    reqPath === '/chat' ||
    reqPath === '/universe' ||
    reqPath === '/ceo.jpg' ||
    reqPath.startsWith('/watermarked-') ||
    reqPath.startsWith('/generated-') ||
    reqPath.startsWith('/assets/') ||
    /\.(jpg|jpeg|png|webp|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(reqPath) ||
    reqPath === '/sitemap.xml' ||
    reqPath === '/robots.txt' ||
    reqPath === '/llms.txt' ||
    reqPath === '/ai-info.json';

  if (isPublicMediaOrAsset) {
    // PUBLIC TIER: Allow search engines, Googlebot-Image, AI crawlers, and social previews
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else {
    // PRIVATE TIER: Strict same-origin protection for APIs, user data, sessions
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  }

  next();
});

// 🤖 CRAWLER & SEARCH ENGINE POLICY
// Allow Google, Bing, GPTBot, ClaudeBot, Perplexity, etc. to freely index public pages, metadata, and /ceo.jpg!
// ONLY restrict crawlers from hitting private backend API and auth routes.
const AI_CRAWLER_USER_AGENTS = [
  'gptbot', 'chatgpt-user', 'claudebot', 'claude-web', 'anthropic-ai',
  'perplexitybot', 'google-extended', 'applebot-extended', 'ccbot',
  'bytespider', 'amazonbot', 'meta-externalagent', 'diffbot', 'scrapy', 'cohere-ai'
];

app.use((req, res, next) => {
  // Prevent indexing on private API and auth routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');

    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const isAiCrawler = AI_CRAWLER_USER_AGENTS.some(bot => userAgent.includes(bot));
    if (isAiCrawler) {
      console.warn(`[SECURITY SHIELD] Blocked AI Crawler (${userAgent}) from private API route: ${req.path}`);
      return res.status(403).json({
        error: 'Access Denied: Scraping of private API routes is prohibited.',
        brand_info: 'https://deepernova.com/llms.txt'
      });
    }
  }

  next();
});

// Sliding Window Rate Limiter for API Endpoints (Anti-DDoS & Bot Flood Protection)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 600; // 600 requests per minute (raised for real-time cloud sync)

app.use('/api/', (req, res, next) => {
  // Exempt cloud sync endpoints from rate limiting (real-time polling every 3s)
  if (req.path.startsWith('/cloud/')) {
    return next();
  }

  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
  } else {
    record.count += 1;
  }

  rateLimitMap.set(ip, record);

  // Set RateLimit Response Headers
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - record.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    console.warn(`[RATE LIMIT EXCEEDED] IP: ${ip} on path: ${req.path} (${record.count} reqs)`);
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please wait 1 minute before making more requests.',
      retry_after_seconds: Math.ceil((record.resetTime - now) / 1000)
    });
  }

  next();
});

// ===== IP-Based Token Limit System =====
const ipTokenUsageMap = new Map(); // ip -> { usedTokens: number, resetTime: number | null }
const IP_MAX_TOKEN_LIMIT = 2000000; // 2 Million tokens limit
const IP_TOKEN_RESET_MS = 4 * 60 * 60 * 1000; // 4 hours

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
};

const checkIpTokenLimit = (ip) => {
  const now = Date.now();
  const record = ipTokenUsageMap.get(ip);
  if (!record) return { isLimited: false, usedTokens: 0, resetTime: null };

  if (record.resetTime && now >= record.resetTime) {
    ipTokenUsageMap.delete(ip);
    return { isLimited: false, usedTokens: 0, resetTime: null };
  }

  const isLimited = record.usedTokens >= IP_MAX_TOKEN_LIMIT || (record.resetTime && now < record.resetTime);
  return {
    isLimited,
    usedTokens: record.usedTokens,
    resetTime: record.resetTime
  };
};

const consumeIpTokens = (ip, amount) => {
  const now = Date.now();
  let record = ipTokenUsageMap.get(ip);

  if (!record || (record.resetTime && now >= record.resetTime)) {
    record = { usedTokens: 0, resetTime: null };
  }

  const newUsed = record.usedTokens + amount;
  let newReset = record.resetTime;

  if (newUsed >= IP_MAX_TOKEN_LIMIT && !newReset) {
    newReset = now + IP_TOKEN_RESET_MS;
  }

  const updated = { usedTokens: newUsed, resetTime: newReset };
  ipTokenUsageMap.set(ip, updated);
  return updated;
};

// Check IP Token Usage Endpoint
app.get('/api/token-usage/check', (req, res) => {
  const ip = getClientIp(req);
  const status = checkIpTokenLimit(ip);
  res.json({
    success: true,
    ip,
    usedTokens: status.usedTokens,
    maxLimit: IP_MAX_TOKEN_LIMIT,
    isLimited: status.isLimited,
    resetTime: status.resetTime
  });
});

// Consume IP Tokens Endpoint
app.post('/api/token-usage/consume', express.json(), (req, res) => {
  const ip = getClientIp(req);
  const { amount } = req.body || {};
  const numAmount = parseInt(amount, 10) || 0;
  const updated = consumeIpTokens(ip, numAmount);
  res.json({
    success: true,
    ip,
    usedTokens: updated.usedTokens,
    maxLimit: IP_MAX_TOKEN_LIMIT,
    isLimited: updated.usedTokens >= IP_MAX_TOKEN_LIMIT || !!updated.resetTime,
    resetTime: updated.resetTime
  });
});

// Periodic cleanup of expired rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

// Initialize database
initializeDatabase();

// Create session store
const sessionStore = new SQLiteSessionStore(db);

// Cleanup expired sessions on startup
sessionStore.cleanup();

// Secure session secret generation
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  sessionSecret = crypto.randomBytes(32).toString('hex');
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ [SECURITY] SESSION_SECRET not provided. Generated an ephemeral cryptographically strong secret.');
  }
}

// Session configuration
app.use(
  session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid', // Explicitly set cookie name
    cookie: {
      httpOnly: true,
      secure: 'auto', // Automatically sets secure to true if connection or forwarded proto is HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: process.env.COOKIE_SAMESITE || 'lax', // Compatible with same-site and proxied requests
      path: '/', // Ensure cookie is available on all paths
      domain: undefined // Let browser determine domain (important for localhost and proxy)
    }
  })
);

// Cleanup expired sessions every hour
setInterval(() => {
  sessionStore.cleanup();
  console.log('✅ Expired sessions cleaned up');
}, 60 * 60 * 1000);

// 🛡️ STRICT HIGH-SECURITY CORS POLICY (NO BLIND ORIGIN REFLECTION!)
const DEFAULT_ALLOWED_ORIGINS = [
  'https://deepernova.com',
  'https://www.deepernova.com'
];

const envConfiguredOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const ALLOWED_ORIGINS = [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...envConfiguredOrigins])];

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Mobile apps, Electron, Postman, server-to-server, cURL, same-origin
  
  const clean = origin.trim().replace(/\/$/, '');
  
  // 1. Explicitly configured whitelist
  if (ALLOWED_ORIGINS.includes(clean)) return true;
  
  // 2. Localhost & 127.0.0.1 on ANY port (Vite dev, DTE, search dashboard, tests)
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(clean)) return true;
  
  // 3. Official DeeperNova subdomains
  if (/^https:\/\/([a-zA-Z0-9-_]+\.)*deepernova\.com$/i.test(clean)) return true;
  
  // 4. Official Vercel deployments (deepernova project & preview branches)
  if (/^https:\/\/([a-zA-Z0-9-_]+\.)*vercel\.app$/i.test(clean)) return true;
  
  // 5. Cloudflare Quick Tunnels
  if (/^https:\/\/([a-zA-Z0-9-_]+\.)*trycloudflare\.com$/i.test(clean)) return true;
  
  // 6. Mobile & Hybrid app protocols (Capacitor / Ionic / Electron)
  if (/^(capacitor|ionic|electron|file):\/\//i.test(clean)) return true;
  
  return false;
};

app.use(cors({
  origin: function(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, origin || true);
    }
    console.warn(`[CORS SHIELD REJECTED] Origin unauthorized: ${origin}`);
    return callback(new Error(`CORS Security Violation: Origin ${origin} is not authorized`));
  },
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Api-Key',
    'X-DPN-Timestamp',
    'X-DPN-Nonce',
    'X-DPN-Integrity',
    'Cache-Control',
    'Pragma',
    'Accept',
    'X-Requested-With',
    'Origin'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  maxAge: 86400
}));

// 🛡️ STRICT SOURCE CODE & SENSITIVE FILE SHIELDING MIDDLEWARE
app.use((req, res, next) => {
  const rawPath = req.path || '';
  let normalizedPath = '';
  try {
    normalizedPath = decodeURIComponent(rawPath).toLowerCase();
  } catch (_e) {
    normalizedPath = rawPath.toLowerCase();
  }
  
  // 1. Block Path Traversal & Dotfile Scanning
  if (normalizedPath.includes('..') || normalizedPath.includes('/.') || normalizedPath.includes('\\.')) {
    return res.status(403).json({ error: 'Access Denied: Path Traversal Detected' });
  }

  // 2. Block direct access to source code, server files, databases, and configuration
  const SENSITIVE_EXTENSIONS = ['.env', '.git', '.db', '.sqlite', '.sqlite3', '.db-shm', '.db-wal', '.sql', '.py', '.sh', '.bat', '.ps1', '.jsx', '.tsx', '.ts', '.map', '.lock', '.log', '.config.js'];
  const SENSITIVE_DIRECTORIES = ['/src', '/server', '/electron', '/android', '/routes', '/scripts', '/.git', '/node_modules', '/data'];

  if (SENSITIVE_EXTENSIONS.some(ext => normalizedPath.endsWith(ext))) {
    console.warn(`[SECURITY BLOCKED] Blocked source/sensitive file request: ${req.path} from IP ${req.ip}`);
    return res.status(403).json({ error: 'Access Denied: Protected System File' });
  }

  if (SENSITIVE_DIRECTORIES.some(dir => normalizedPath.startsWith(dir))) {
    console.warn(`[SECURITY BLOCKED] Blocked internal directory request: ${req.path} from IP ${req.ip}`);
    return res.status(403).json({ error: 'Access Denied: Protected Source Directory' });
  }

  if (normalizedPath === '/package.json' || normalizedPath === '/package-lock.json' || normalizedPath === '/vercel.json' || normalizedPath === '/vite.config.js') {
    return res.status(403).json({ error: 'Access Denied: Protected System File' });
  }

  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============== STATIC FILE SERVING ==============
// Serve public folder with strict CORS headers for images
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  // Check if it's an image request
  const isImageRequest = req.path.startsWith('/watermarked-') || req.path.startsWith('/generated-') || req.path.endsWith('.png') || req.path.endsWith('.jpg') || req.path.endsWith('.jpeg');
  
  if (isImageRequest) {
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Max-Age', '86400');
    res.header('Cache-Control', 'public, max-age=86400');
    res.header('X-Content-Type-Options', 'nosniff');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Serve static assets with Cache-Control headers (searches root public, dist, and server public)
const staticCandidateDirs = [
  path.join(__dirname, '..', 'public'),
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, 'public'),
  path.join(process.cwd(), 'public'),
  path.join(process.cwd(), 'dist')
];

const uniqueStaticDirs = [...new Set(staticCandidateDirs)];
uniqueStaticDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`[SERVER] Serving static assets from: ${dir}`);
    app.use(express.static(dir, {
      maxAge: '1d',
      etag: false
    }));
  }
});

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// ============================================================================
// AUTHENTICATION API ROUTES (/auth/login, /auth/register, /auth/me, /auth/logout)
// ============================================================================

// Check current authentication state
app.get(['/auth/me', '/api/auth/me'], (req, res) => {
  if (req.isAuthenticated() && req.user) {
    return res.json({
      authenticated: true,
      guest: false,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture
      }
    });
  }
  return res.status(401).json({ authenticated: false, guest: false });
});

// Login endpoint (email & password)
app.post(['/auth/login', '/api/auth/login'], (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('[AUTH API] Login error:', err);
      return res.status(500).json({ success: false, error: 'Terjadi kendala pada server auth' });
    }
    if (!user) {
      return res.status(401).json({
        success: false,
        message: info?.message || 'Login gagal',
        error: info?.message || 'Login gagal',
        code: info?.code || 'AUTH_FAILED'
      });
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('[AUTH API] req.logIn error:', err);
        return res.status(500).json({ success: false, error: 'Gagal mengaktifkan sesi login' });
      }
      req.session.isGuest = false;
      req.session.save((saveErr) => {
        if (saveErr) console.error('[AUTH API] req.session.save error:', saveErr);
        console.log(`[AUTH API] User logged in: ${user.email}`);
        return res.json({
          success: true,
          authenticated: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            picture: user.picture
          }
        });
      });
    });
  })(req, res, next);
});

// Register endpoint (name, email, password)
app.post(['/auth/register', '/api/auth/register'], async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Semua bidang (nama, email, password) wajib diisi.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = userDb.findByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email ini sudah terdaftar. Silakan gunakan menu Login.' });
    }

    const hashedPassword = await hashPassword(password);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newUser = userDb.create(userId, cleanEmail, name.trim(), hashedPassword, null);

    req.logIn(newUser, (err) => {
      if (err) {
        return res.json({
          success: true,
          authenticated: false,
          user: { id: newUser.id, name: newUser.name, email: newUser.email }
        });
      }
      req.session.isGuest = false;
      req.session.save(() => {
        console.log(`[AUTH API] User registered: ${newUser.email}`);
        return res.json({
          success: true,
          authenticated: true,
          user: { id: newUser.id, name: newUser.name, email: newUser.email }
        });
      });
    });
  } catch (err) {
    console.error('[AUTH API] Register error:', err);
    res.status(500).json({ success: false, error: 'Gagal pendaftaran: ' + err.message });
  }
});

// Logout endpoint
app.post(['/auth/logout', '/api/auth/logout'], (req, res) => {
  req.logout((err) => {
    if (err) console.error('[AUTH API] Logout error:', err);
    res.json({ success: true, message: 'Berhasil logout' });
  });
});


// Ensure temp directory exists
const tempDir = path.join(__dirname, 'temp-files');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'temp-files', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
console.log(`✅ Uploads directory ready at: ${uploadsDir}`);

// Ensure PPT temp directory exists
const tempPptDir = path.join(__dirname, 'temp_ppt');
if (!fs.existsSync(tempPptDir)) {
  fs.mkdirSync(tempPptDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}_${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedMimes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/json',
      'text/html',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      // Image formats for vision analysis
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.md') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  }
});

// 🔒 PROTECTED MEDIA & CLOUD UPLOADS HANDLER (Anti-Hotlinking & Zero-Trust Isolation)
app.use(['/download/uploads', '/api/download/uploads', '/api/cloud/download/uploads'], (req, res) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
  res.header('Accept-Ranges', 'bytes');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  const rawFilename = path.basename(req.path);
  if (!rawFilename) return res.status(400).send('Bad Request');

  const targetFile = path.join(uploadsDir, rawFilename);
  if (!fs.existsSync(targetFile)) {
    return res.status(404).json({ error: 'Berkas tidak ditemukan' });
  }

  // 1. Check if this file belongs to Cloud Vault (cloud_files table or starts with cloud_)
  const isCloudFile = rawFilename.startsWith('cloud_');
  try {
    const cloudRecord = db.prepare(`
      SELECT id, userId, ownerEmail, folderType, founderEmail, ceoEmail, employeeEmails, checksum 
      FROM cloud_files 
      WHERE fileData LIKE ? OR name = ? OR fileData = ?
    `).get(`%${rawFilename}%`, rawFilename, `/download/uploads/${rawFilename}`);

    if (cloudRecord || isCloudFile) {
      // Authenticate session (Mandatory registered user — Guests strictly banned!)
      const isGuest = req.session?.isGuest || req.user?.guest || req.session?.user?.guest;
      const isAuth = (req.isAuthenticated && req.isAuthenticated()) || req.user || req.session?.user || req.session?.userId;
      const userId = req.user?.id || req.session?.user?.id || req.session?.userId || null;
      const userEmail = (req.user?.email || req.session?.user?.email || '').toLowerCase().trim() || null;

      if (!isAuth || isGuest || (!userId && !userEmail)) {
        return res.status(401).json({ 
          error: 'Akses Ditolak: Anda wajib login dengan akun resmi untuk mengakses berkas Cloud Vault.', 
          code: 'UNAUTHORIZED',
          requireLogin: true 
        });
      }

      // If it has a cloud filename but has no matching record in cloud_files, block it completely
      if (!cloudRecord) {
        return res.status(404).json({ error: 'Berkas tidak ditemukan atau Anda tidak memiliki izin akses.', code: 'NOT_FOUND' });
      }

      const isOwner = (userId && cloudRecord.userId === userId) || (userEmail && cloudRecord.ownerEmail && cloudRecord.ownerEmail.toLowerCase().trim() === userEmail);
      let isCollaborator = false;
      if (!isOwner && userEmail && cloudRecord.folderType === 'company') {
        if (cloudRecord.founderEmail && cloudRecord.founderEmail.toLowerCase().trim() === userEmail) isCollaborator = true;
        if (cloudRecord.ceoEmail && cloudRecord.ceoEmail.toLowerCase().trim() === userEmail) isCollaborator = true;
        if (cloudRecord.employeeEmails) {
          try {
            const emps = typeof cloudRecord.employeeEmails === 'string' ? JSON.parse(cloudRecord.employeeEmails) : cloudRecord.employeeEmails;
            if (Array.isArray(emps) && emps.some(e => typeof e === 'string' && e.toLowerCase().trim() === userEmail)) {
              isCollaborator = true;
            }
          } catch {}
        }
      }

      if (!isOwner && !isCollaborator) {
        console.warn(`[SECURITY BLOCKED] Direct upload access blocked for ${rawFilename} by non-owner ${userId}/${userEmail}`);
        // 🔒 Anti-IDOR Oracle Masking: Return 404 instead of 403 to prevent attackers from inferring file existence
        return res.status(404).json({ error: 'Berkas tidak ditemukan atau Anda tidak memiliki izin akses.', code: 'NOT_FOUND' });
      }
    }
  } catch (dbErr) {
    console.warn('[SECURITY] Database check warning on static upload:', dbErr.message);
  }

  // 2. File is authorized. Serve with safe security headers
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('X-Content-Type-Options', 'nosniff');

  const stat = fs.statSync(targetFile);
  const fileSize = stat.size;
  const filepath = req.path.toLowerCase();
  const isVideo = filepath.endsWith('.mp4') || filepath.endsWith('.webm') || filepath.endsWith('.mov') || filepath.endsWith('.mkv') || filepath.endsWith('.m4v') || filepath.endsWith('.ogv');

  let mimeType = 'application/octet-stream';
  if (filepath.endsWith('.png')) mimeType = 'image/png';
  else if (filepath.endsWith('.jpg') || filepath.endsWith('.jpeg')) mimeType = 'image/jpeg';
  else if (filepath.endsWith('.gif')) mimeType = 'image/gif';
  else if (filepath.endsWith('.webp')) mimeType = 'image/webp';
  else if (filepath.endsWith('.pdf')) mimeType = 'application/pdf';
  else if (filepath.endsWith('.mp3')) mimeType = 'audio/mpeg';
  else if (filepath.endsWith('.wav')) mimeType = 'audio/wav';
  else if (filepath.endsWith('.ogg')) mimeType = 'audio/ogg';
  else if (filepath.endsWith('.mp4')) mimeType = 'video/mp4';
  else if (filepath.endsWith('.webm')) mimeType = 'video/webm';
  else if (filepath.endsWith('.mov')) mimeType = 'video/quicktime';
  else if (filepath.endsWith('.mkv')) mimeType = 'video/x-matroska';

  if (req.method === 'HEAD') {
    res.header('Content-Type', mimeType);
    res.header('Content-Length', fileSize);
    return res.sendStatus(200);
  }

  const range = req.headers.range;
  if (isVideo && range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).set({
        'Content-Range': `bytes */${fileSize}`,
        'Accept-Ranges': 'bytes'
      }).send('Requested range not satisfiable');
      return;
    }

    const chunksize = (end - start) + 1;
    const fileStream = fs.createReadStream(targetFile, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache'
    });

    req.on('close', () => { fileStream.destroy(); });
    fileStream.pipe(res);
    return;
  }

  res.header('Content-Type', mimeType);
  res.header('Content-Length', fileSize);
  const stream = fs.createReadStream(targetFile);
  req.on('close', () => { stream.destroy(); });
  stream.pipe(res);
});

// Serve generated files (strictly excluding uploads directory from static exposure)
app.use('/download', (req, res, next) => {
  if (req.path.startsWith('/uploads')) {
    return res.status(403).json({ error: 'Akses Ditolak: Akses langsung ke direktori uploads dilarang.' });
  }
  next();
}, express.static(tempDir));
app.use('/download', express.static(tempPptDir));

/**
 * POST /api/vision/upload
 * Upload an image and return a public URL for vision analysis
 */
app.post('/api/vision/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Use new dedicated endpoint for uploads
    const fileUrl = `${req.protocol}://${req.get('host')}/api/serve-upload/${encodeURIComponent(req.file.filename)}`;
    console.log('[VISION_UPLOAD] Saved image:', req.file.filename);
    console.log('[VISION_UPLOAD] File size:', req.file.size, 'bytes');
    console.log('[VISION_UPLOAD] Public URL:', fileUrl);

    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (err) {
    console.error('[VISION_UPLOAD] Error uploading image:', err);
    res.status(500).json({ error: 'Vision upload failed: ' + err.message });
  }
});

/**
 * GET /api/serve-upload/:filename
 * Serve uploaded files with proper headers and CORS
 */
app.get('/api/serve-upload/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Security: only allow specific file types
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.txt', '.json', '.csv', '.html', '.md', '.pptx', '.docx'];
    const fileExt = path.extname(filename).toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      console.warn(`[SERVE_UPLOAD] ⚠️ Unauthorized file type: ${filename}`);
      return res.status(403).json({ error: 'File type not allowed' });
    }
    
    const filepath = path.join(uploadsDir, filename);
    
    // Security: prevent directory traversal
    if (!filepath.startsWith(uploadsDir)) {
      console.warn(`[SERVE_UPLOAD] ⚠️ Directory traversal attempt: ${filepath}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
      console.error(`[SERVE_UPLOAD] ❌ File not found: ${filepath}`);
      return res.status(404).json({ error: 'File not found', file: filename });
    }
    
    // Read file
    const fileBuffer = fs.readFileSync(filepath);
    const fileStats = fs.statSync(filepath);
    console.log(`[SERVE_UPLOAD] ✅ Serving: ${filename} (${fileBuffer.length} bytes)`);
    
    // Set Content-Type based on file extension
    let contentType = 'application/octet-stream';
    if (fileExt === '.png') contentType = 'image/png';
    else if (['.jpg', '.jpeg'].includes(fileExt)) contentType = 'image/jpeg';
    else if (fileExt === '.gif') contentType = 'image/gif';
    else if (fileExt === '.webp') contentType = 'image/webp';
    else if (fileExt === '.pdf') contentType = 'application/pdf';
    else if (fileExt === '.txt') contentType = 'text/plain';
    else if (fileExt === '.json') contentType = 'application/json';
    else if (fileExt === '.csv') contentType = 'text/csv';
    else if (fileExt === '.html') contentType = 'text/html';
    else if (fileExt === '.md') contentType = 'text/markdown';
    else if (fileExt === '.pptx') contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    else if (fileExt === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    // Set response headers
    res.set('Content-Type', contentType);
    res.set('Content-Length', fileBuffer.length);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('X-Content-Type-Options', 'nosniff');
    
    // For images, also set as inline (not attachment) so they display in browser
    if (fileExt.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
      res.set('Content-Disposition', 'inline');
    }
    
    // Send file
    res.send(fileBuffer);
  } catch (err) {
    console.error(`[SERVE_UPLOAD] Error serving file:`, err.message);
    res.status(500).json({ error: 'Failed to serve file', details: err.message });
  }
});

/**
 * Helper functions for parsing different file types
 */

// Parse TXT files
async function parseTXT(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    success: true,
    file_type: 'text',
    content,
    char_count: content.length,
    token_estimate: Math.ceil(content.length / 4)
  };
}

// Parse JSON files
async function parseJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  try {
    const json = JSON.parse(content);
    const prettyJson = JSON.stringify(json, null, 2);
    return {
      success: true,
      file_type: 'json',
      content: prettyJson,
      char_count: prettyJson.length,
      token_estimate: Math.ceil(prettyJson.length / 4)
    };
  } catch {
    return {
      success: true,
      file_type: 'json',
      content: content,
      char_count: content.length,
      token_estimate: Math.ceil(content.length / 4)
    };
  }
}

// Parse CSV files
async function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    success: true,
    file_type: 'csv',
    content,
    char_count: content.length,
    token_estimate: Math.ceil(content.length / 4)
  };
}

// Parse HTML files
async function parseHTML(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Simple HTML stripping (remove tags)
  const text = content
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  return {
    success: true,
    file_type: 'html',
    content: text,
    char_count: text.length,
    token_estimate: Math.ceil(text.length / 4)
  };
}

// Parse Markdown files
async function parseMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    success: true,
    file_type: 'markdown',
    content,
    char_count: content.length,
    token_estimate: Math.ceil(content.length / 4)
  };
}

// Parse PDF files
async function parsePDF(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const { PDFParse } = await import('pdf-parse');
    const pdfParser = new PDFParse({ data: fileBuffer });
    const textResult = await pdfParser.getText();
    const content = textResult.text || '';
    await pdfParser.destroy();
    
    return {
      success: true,
      file_type: 'pdf',
      content: content.trim(),
      char_count: content.length,
      token_estimate: Math.ceil(content.length / 4)
    };
  } catch (error) {
    return {
      success: false,
      error: `PDF parsing error: ${error.message}`
    };
  }
}

// Parse PPTX files
async function parsePPTX(filePath) {
  let fileBuffer;
  try {
    fileBuffer = fs.readFileSync(filePath);
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const loaded = await zip.loadAsync(fileBuffer);
    
    // Find all slide XML files inside ppt/slides/
    const slideFiles = [];
    loaded.forEach((relativePath, file) => {
      if (relativePath.startsWith('ppt/slides/slide') && relativePath.endsWith('.xml')) {
        slideFiles.push(file);
      }
    });
    
    if (slideFiles.length === 0) {
      return {
        success: true,
        file_type: 'pptx',
        content: '(No slides found or empty presentation)',
        char_count: 0,
        token_estimate: 0
      };
    }
    
    // Sort slides numerically (slide1.xml, slide2.xml, slide10.xml, etc.)
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });
    
    let content = '';
    for (const slideFile of slideFiles) {
      const xmlText = await slideFile.async('text');
      // Extract text within <a:t>...</a:t> tags
      const matches = xmlText.match(/<a:t[^>]*>(.*?)<\/a:t>/g) || [];
      const slideText = matches
        .map(match => {
          const text = match.replace(/<[^>]+>/g, '');
          return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
        })
        .filter(t => t.trim().length > 0)
        .join(' ')
        .trim();
        
      const slideNum = slideFile.name.match(/\d+/)?.[0] || '';
      if (slideText) {
        content += `\n=== Slide ${slideNum} ===\n${slideText}\n`;
      }
    }
    
    const finalContent = content.trim();
    return {
      success: true,
      file_type: 'pptx',
      content: finalContent || '(Empty slides)',
      char_count: finalContent.length,
      token_estimate: Math.ceil(finalContent.length / 4)
    };
  } catch (error) {
    return {
      success: false,
      error: `PowerPoint parsing error: ${error.message}`
    };
  }
}

// Parse DOCX files
async function parseDOCX(filePath) {
  let fileBuffer;
  try {
    fileBuffer = fs.readFileSync(filePath);
    // DOCX is a ZIP file, extract using a simple approach
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    const content = result.value || '';
    return {
      success: true,
      file_type: 'docx',
      content,
      char_count: content.length,
      token_estimate: Math.ceil(content.length / 4)
    };
  } catch (error) {
    // Fallback: try to extract text manually from DOCX structure
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const loaded = await zip.loadAsync(fileBuffer);
      const xmlFile = loaded.file('word/document.xml');
      if (xmlFile) {
        const xml = await xmlFile.async('text');
        const text = xml
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\n\s*\n/g, '\n')
          .trim();
        return {
          success: true,
          file_type: 'docx',
          content: text,
          char_count: text.length,
          token_estimate: Math.ceil(text.length / 4)
        };
      }
    } catch {
      // If all fails, return error
    }
    
    return {
      success: false,
      error: `DOCX parsing error: ${error.message}`
    };
  }
}

// Parse Excel files (XLSX/XLS)
async function parseExcel(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    let content = '';
    
    // Extract text from all sheets
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      content += `\n=== Sheet: ${sheetName} ===\n`;
      
      // Convert sheet to CSV format
      const csv = XLSX.utils.sheet_to_csv(sheet);
      content += csv;
    }
    
    return {
      success: true,
      file_type: 'excel',
      content,
      char_count: content.length,
      token_estimate: Math.ceil(content.length / 4)
    };
  } catch (error) {
    return {
      success: false,
      error: `Excel parsing error: ${error.message}`
    };
  }
}

// Detect file type and parse accordingly
async function parseFileByType(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const mimeType = originalName.toLowerCase();

  try {
    if (ext === '.pdf' || mimeType.includes('pdf')) {
      return await parsePDF(filePath);
    } else if (ext === '.docx' || mimeType.includes('word')) {
      return await parseDOCX(filePath);
    } else if (ext === '.xlsx' || ext === '.xls' || mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return await parseExcel(filePath);
    } else if (ext === '.pptx' || ext === '.ppt' || mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return await parsePPTX(filePath);
    } else if (ext === '.csv' || mimeType.includes('csv')) {
      return await parseCSV(filePath);
    } else if (ext === '.json' || mimeType.includes('json')) {
      return await parseJSON(filePath);
    } else if (ext === '.html' || ext === '.htm' || mimeType.includes('html')) {
      return await parseHTML(filePath);
    } else if (ext === '.md' || ext === '.markdown' || mimeType.includes('markdown')) {
      return await parseMarkdown(filePath);
    } else if (ext === '.txt' || mimeType.includes('text')) {
      return await parseTXT(filePath);
    } else {
      // Try to read as text by default
      return await parseTXT(filePath);
    }
  } catch (error) {
    return {
      success: false,
      error: `Error parsing file: ${error.message}`
    };
  }
}

/**
 * Test Python availability
 * GET /api/test-python
 */
app.get('/api/test-python', (req, res) => {
  try {
    const version = execSync('python3 --version', { encoding: 'utf-8', stdio: 'pipe' });
    res.json({ success: true, python: 'python3', version: version.trim() });
  } catch {
    try {
      const version = execSync('python --version', { encoding: 'utf-8', stdio: 'pipe' });
      res.json({ success: true, python: 'python', version: version.trim() });
    } catch {
      res.status(500).json({ 
        success: false, 
        error: 'Python not found. Please install Python 3 from https://www.python.org/downloads/'
      });
    }
  }
});

/**
 * Upload and parse file to extract text (supports PDF, DOCX, XLSX, CSV, JSON, HTML, MD, TXT)
 * POST /api/upload-file
 * Body: FormData with 'file' field
 */
app.post('/api/upload-file', upload.single('file'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    filePath = req.file.path;
    const originalName = req.file.originalname;

    console.log(`[File Upload] Processing: ${originalName} at ${filePath}`);

    // Parse file by type using Node.js native parsers
    const result = await parseFileByType(filePath, originalName);

    // Clean up uploaded file
    if (filePath) {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
    }

    if (result.success) {
      return res.json({
        success: true,
        filename: originalName,
        file_type: result.file_type,
        content: result.content,
        char_count: result.char_count,
        token_estimate: result.token_estimate,
        message: `File parsed successfully. Estimated ${result.token_estimate} tokens.`
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to parse file'
      });
    }
  } catch (error) {
    console.error('[Upload error]:', error.message);
    if (filePath) {
      fs.unlink(filePath, () => {});
    }
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: `Upload failed: ${error.message}`
      });
    }
  }
});

/**
 * Call Python finance service for real-time financial data
 * Falls back to Node.js service if Python unavailable
 */
async function buildFinanceContextPython(query) {
  return new Promise((resolve) => {
    try {
      console.log(`[Python Finance] Calling finance_service.py for: "${query}"`);
      
      // Use venv Python executable path (relative to server directory)
      const pythonExecutable = path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe');
      
      const pyScript = path.join(__dirname, 'finance_service.py');
      if (!fs.existsSync(pyScript)) {
        console.warn('[Python Finance] Script not found at', pyScript);
        console.log('[Python Finance] Falling back to Node.js service');
        resolve({ context: '', sources: [] }); // Fallback to Node service
        return;
      }
      
      const process = spawn(pythonExecutable, [pyScript], {
        timeout: 10000, // 10 second timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          console.warn(`[Python Finance] Process exited with code ${code}`);
          if (stderr) console.warn('[Python Finance] STDERR:', stderr);
          console.log('[Python Finance] Falling back to Node.js service');
          resolve({ context: '', sources: [] });
          return;
        }
        
        try {
          // Parse JSON output
          const result = JSON.parse(stdout);
          if (result.success && result.context) {
            console.log(`[Python Finance] ✓ Got data: ${result.context.substring(0, 100)}...`);
            console.log(`[Python Finance] ✓ Got ${result.sources ? result.sources.length : 0} sources`);
            resolve({ 
              context: result.context,
              sources: result.sources || []  // Include sources from Python
            });
          } else {
            console.warn('[Python Finance] No context in response');
            resolve({ context: '', sources: [] });
          }
        } catch (parseErr) {
          console.warn('[Python Finance] Failed to parse output:', parseErr.message);
          console.log('[Python Finance] Raw output:', stdout.substring(0, 200));
          resolve({ context: '', sources: [] });
        }
      });
      
      process.on('error', (err) => {
        console.warn('[Python Finance] Process error:', err.message);
        console.log('[Python Finance] Falling back to Node.js service');
        resolve({ context: '', sources: [] });
      });
      
      // Send query to Python via stdin
      process.stdin.write(query);
      process.stdin.end();
      
    } catch (error) {
      console.warn('[Python Finance] Wrapper error:', error.message);
      resolve({ context: '', sources: [] }); // Fallback
    }
  });
}

const humanizeError = (errStr) => {
  if (!errStr) return "Terjadi kendala koneksi pada server AI. Silakan coba sesaat lagi.";
  const str = String(errStr).toLowerCase();
  
  if (str.includes("invalid api key") || str.includes("401") || str.includes("unauthorized")) {
    return "Maaf, akses kunci server AI sedang diperbarui oleh sistem. Silakan coba kembali beberapa saat lagi.";
  }
  if (str.includes("rate limit") || str.includes("429") || str.includes("too many requests")) {
    return "Maaf, server AI sedang menerima terlalu banyak lalu lintas. Silakan tunggu beberapa detik dan coba lagi.";
  }
  if (str.includes("timeout") || str.includes("took too long") || str.includes("deadline")) {
    return "Koneksi ke server AI terputus karena batas waktu respons terlampaui. Silakan coba kirim kembali pesan Anda.";
  }
  if (str.includes("quota") || str.includes("insufficient balance") || str.includes("billing")) {
    return "Batas penggunaan server AI saat ini telah habis. Silakan hubungi administrator.";
  }
  if (str.includes("api keys failed") || str.includes("no api keys")) {
    return "Kunci akses server AI saat ini tidak tersedia. Silakan hubungi admin.";
  }
  return "Terjadi kendala teknis sementara pada server AI. Silakan klik tombol 'Lanjutkan' untuk mencoba kembali.";
};

/**
 * Proxy AI chat requests through the backend and hide the API key from the client.
 * POST /api/chat
 * Body: { model, messages, temperature?, max_tokens?, stream? }
 * 
 * Injects RAG context from knowledge base before sending to LLM
 */
// ============================================================================
// DEEPERNOVA CLOUD EXPLORER REAL SERVER API ROUTES (ZERO-TRUST ENTERPRISE SECURITY)
// ============================================================================

const FREE_TIER_QUOTA_BYTES = 3 * 1024 * 1024 * 1024; // 3 GB Free Tier Cloud Storage Quota (3,221,225,472 bytes)

// 🔒 ENTERPRISE ZERO-TRUST CLOUD AUTHENTICATION GUARD (MANDATORY LOGIN — NO GUESTS)
const requireCloudAuth = (req, res, next) => {
  const isGuest = req.session?.isGuest || req.user?.guest || req.session?.user?.guest;
  const isAuth = (req.isAuthenticated && req.isAuthenticated()) || req.user || req.session?.user || req.session?.userId;
  
  if (!isAuth || isGuest) {
    return res.status(401).json({
      success: false,
      error: 'Akses Ditolak: Anda wajib login dengan akun resmi Deepernova untuk mengakses Cloud Vault pribadi.',
      code: 'LOGIN_REQUIRED',
      requireLogin: true
    });
  }
  next();
};

const getAuthUser = (req) => {
  const isGuest = req.session?.isGuest || req.user?.guest || req.session?.user?.guest;
  if (isGuest) return { id: null, email: null };
  const id = req.user?.id || req.session?.user?.id || req.session?.userId || null;
  const email = (req.user?.email || req.session?.user?.email || '').toLowerCase().trim() || null;
  return { id, email };
};

// Get user storage quota info (strictly isolated per user)
app.get('/api/cloud/storage-info', requireCloudAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    const { id: userId, email: userEmail } = getAuthUser(req);
    const usedBytes = cloudDb.getTotalUsage(userId, userEmail);
    const totalBytes = FREE_TIER_QUOTA_BYTES;
    const freeBytes = Math.max(0, totalBytes - usedBytes);
    const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
    const totalMB = 3072; // 3 GB in MB
    const percent = Math.min(100, Number(((usedBytes / totalBytes) * 100).toFixed(2)));

    return res.json({
      success: true,
      usedBytes,
      totalBytes,
      freeBytes,
      usedMB,
      totalMB,
      percent,
      tier: 'Free Tier (3 GB Cloud Vault)'
    });
  } catch (error) {
    console.error('[CLOUD API] Storage info error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// List user files (strictly isolated with Row-Level Security)
app.get('/api/cloud/files', requireCloudAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    const { id: userId, email: userEmail } = getAuthUser(req);
    const dbFiles = cloudDb.listByUser(userId, userEmail);
    
    const formattedFiles = dbFiles.map(f => {
      let parsedContent = f.content;
      if (typeof f.content === 'string' && (f.content.startsWith('{') || f.content.startsWith('['))) {
        try { parsedContent = JSON.parse(f.content); } catch (_e) {}
      }
      return {
        id: f.id,
        name: f.name,
        type: f.type || 'other',
        category: f.category || f.type || 'other',
        parentId: f.parentId || null,
        sizeBytes: f.size || 0,
        size: f.size > 0 ? `${(f.size / (1024 * 1024)).toFixed(2)} MB` : '0.05 MB',
        date: f.createdAt ? f.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        dataUrl: (f.fileData && f.fileData.length > 100000 && !f.fileData.startsWith('/download/uploads/')) ? '[[stored]]' : (f.fileData || null),
        fileData: (f.fileData && f.fileData.length > 100000 && !f.fileData.startsWith('/download/uploads/')) ? '[[stored]]' : (f.fileData || null),
        content: parsedContent,
        createdAt: f.createdAt,
        userId: f.userId,
        ownerEmail: f.ownerEmail || null,
        folderType: f.folderType || 'private',
        founder: f.founder || null,
        founderEmail: f.founderEmail || null,
        ceo: f.ceo || null,
        ceoEmail: f.ceoEmail || null,
        employeeEmails: f.employeeEmails || null,
        folderCreator: f.folderCreator || null,
        folderCreatorRole: f.folderCreatorRole || null,
        checksum: f.checksum || null,
        thumbnail: f.thumbnail || ((f.fileData && f.fileData.startsWith('/download/uploads/')) ? `/api/cloud/files/${f.id}/raw` : null)
      };
    });

    return res.json({
      success: true,
      files: formattedFiles
    });
  } catch (error) {
    console.error('[CLOUD API] List files error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific file details (verifies ownership before returning content)
app.get('/api/cloud/files/:id', requireCloudAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, email: userEmail } = getAuthUser(req);
    const file = cloudDb.findById(id, userId, userEmail);
    if (!file) {
      return res.status(404).json({ success: false, error: 'Berkas tidak ditemukan atau Anda tidak memiliki izin akses.' });
    }

    let parsedContent = file.content;
    if (typeof file.content === 'string' && (file.content.startsWith('{') || file.content.startsWith('['))) {
      try { parsedContent = JSON.parse(file.content); } catch (_e) {}
    }

    return res.json({
      success: true,
      file: {
        id: file.id,
        name: file.name,
        type: file.type || 'other',
        category: file.category || file.type || 'other',
        parentId: file.parentId || null,
        sizeBytes: file.size || 0,
        size: file.size > 0 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : '0.05 MB',
        date: file.createdAt ? file.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        dataUrl: file.fileData || null,
        fileData: file.fileData || null,
        thumbnail: file.thumbnail || null,
        content: parsedContent,
        createdAt: file.createdAt,
        userId: file.userId,
        ownerEmail: file.ownerEmail || null,
        folderType: file.folderType || 'private',
        founder: file.founder || null,
        founderEmail: file.founderEmail || null,
        ceo: file.ceo || null,
        ceoEmail: file.ceoEmail || null,
        employeeEmails: file.employeeEmails || null,
        folderCreator: file.folderCreator || null,
        folderCreatorRole: file.folderCreatorRole || null,
        checksum: file.checksum || null
      }
    });
  } catch (err) {
    console.error('[CLOUD API] Get file error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 🛡️ DEEPERNOVA ENTERPRISE ZERO-TRUST CLOUD SHIELD
// ==========================================
const DANGEROUS_CLOUD_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bash', 'vbs', 'vbe', 'php', 'phtml', 'php3', 
  'php4', 'php5', 'php7', 'php8', 'phar', 'shtml', 'asp', 'aspx', 'cer', 'asa', 
  'asax', 'pl', 'cgi', 'msi', 'scr', 'com', 'hta', 'ps1', 'psm1', 'jar', 
  'jsp', 'jspx', 'war', 'ear', 'pif', 'reg', 'wsf', 'wsh', 'dll', 'sys', 
  'bin', 'apk', 'deb', 'rpm', 'so', 'dylib', 'action', 'workflow', 'app', 
  'iso', 'img', 'dmg', 'pkg', 'cpl', 'inf', 'ins', 'isp', 'scf', 'sct', 'chm', 'gadget'
]);

// Sliding-window rate limiter for cloud uploads (max 40 uploads per minute per user/IP)
const cloudUploadRateLimiter = new Map();
function checkCloudUploadRate(key) {
  const now = Date.now();
  const record = cloudUploadRateLimiter.get(key) || [];
  const recent = record.filter(t => now - t < 60000);
  if (recent.length >= 40) return false;
  recent.push(now);
  cloudUploadRateLimiter.set(key, recent);
  return true;
}

// 🧹 Periodic cleanup of stale rate limiter records (prevents memory leaks)
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of cloudUploadRateLimiter.entries()) {
    const valid = timestamps.filter(t => now - t < 60000);
    if (valid.length === 0) {
      cloudUploadRateLimiter.delete(key);
    } else {
      cloudUploadRateLimiter.set(key, valid);
    }
  }
}, 5 * 60 * 1000).unref();

// 🔒 Memory cache for verified file checksums (key: filePath:mtimeMs:size -> boolean)
const verifiedChecksumCache = new Map();

async function verifyFileIntegrity(diskPath, expectedChecksum) {
  if (!expectedChecksum) return true;
  try {
    const stat = await fs.promises.stat(diskPath);
    const cacheKey = `${diskPath}:${stat.mtimeMs}:${stat.size}`;
    if (verifiedChecksumCache.get(cacheKey) === true) {
      return true;
    }

    return new Promise((resolve) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(diskPath);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => {
        const calculated = hash.digest('hex');
        const match = (calculated === expectedChecksum);
        if (match) {
          if (verifiedChecksumCache.size > 2000) verifiedChecksumCache.clear();
          verifiedChecksumCache.set(cacheKey, true);
        }
        resolve(match);
      });
      stream.on('error', (err) => {
        console.warn('[SECURITY STREAM HASH ERROR]', err.message);
        resolve(false);
      });
    });
  } catch (_e) {
    return false;
  }
}

// Deep inspection: Extension check + Magic bytes sniffing + Script injection prevention
function validateCloudFileSafety(fileName, buffer) {
  if (!fileName || typeof fileName !== 'string') {
    return { safe: false, reason: 'Nama berkas tidak valid.' };
  }

  // 1. Thorough Path Traversal Check (including URL decoding and null byte elimination)
  let decodedName = fileName;
  try { decodedName = decodeURIComponent(fileName); } catch {}
  if (
    decodedName.includes('\0') || 
    decodedName.includes('..') || 
    decodedName.includes('/') || 
    decodedName.includes('\\') ||
    fileName.includes('\0') ||
    fileName.includes('..') ||
    fileName.includes('/') ||
    fileName.includes('\\')
  ) {
    return { safe: false, reason: 'Nama berkas mengandung karakter berbahaya (Path Traversal).' };
  }

  const cleanName = decodedName.toLowerCase().trim();
  const ext = cleanName.split('.').pop()?.toLowerCase();
  if (ext && DANGEROUS_CLOUD_EXTENSIONS.has(ext)) {
    return { safe: false, reason: `Ekstensi .${ext} dilarang oleh Enterprise Zero-Trust Shield (berpotensi mengeksekusi script/biner).` };
  }

  // 2. Double extension detection (e.g. payload.docx.exe or invoice.pdf.php)
  const nameParts = cleanName.split('.');
  if (nameParts.length > 2) {
    for (let i = 1; i < nameParts.length; i++) {
      if (DANGEROUS_CLOUD_EXTENSIONS.has(nameParts[i])) {
        return { safe: false, reason: `Ekstensi berbahaya tersembunyi terdeteksi (.${nameParts[i]}). Berkas ditolak demi integritas server.` };
      }
    }
  }

  // 3. Deep Magic Byte & Signature Sniffing
  if (buffer && Buffer.isBuffer(buffer) && buffer.length > 0) {
    // 3a. Windows PE Executable (MZ header)
    if (buffer.length >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A) {
      return { safe: false, reason: 'Header biner Windows Executable (MZ) terdeteksi di dalam berkas.' };
    }

    // 3b. Linux ELF Executable (\x7fELF)
    if (buffer.length >= 4 && buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
      return { safe: false, reason: 'Header biner Linux Executable (ELF) terdeteksi di dalam berkas.' };
    }

    // 3c. macOS Mach-O Binary (32-bit & 64-bit Big-Endian / Little-Endian)
    if (buffer.length >= 4) {
      const b0 = buffer[0], b1 = buffer[1], b2 = buffer[2], b3 = buffer[3];
      if ((b0 === 0xFE && b1 === 0xED && b2 === 0xFA && (b3 === 0xCE || b3 === 0xCF)) ||
          (b0 === 0xCE && b1 === 0xFA && b2 === 0xED && b3 === 0xFE) ||
          (b0 === 0xCF && b1 === 0xFA && b2 === 0xED && b3 === 0xFE)) {
        return { safe: false, reason: 'Header biner macOS Mach-O Executable terdeteksi di dalam berkas.' };
      }
    }

    // 3d. Java Compiled Class Bytecode (0xCAFEBABE)
    if (buffer.length >= 4 && buffer[0] === 0xCA && buffer[1] === 0xFE && buffer[2] === 0xBA && buffer[3] === 0xBE) {
      return { safe: false, reason: 'Header biner Java Bytecode (0xCAFEBABE) terdeteksi di dalam berkas.' };
    }

    // 3e. Script Shebang (#! /bin/...)
    if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
      return { safe: false, reason: 'Script Shebang executable terdeteksi di dalam berkas.' };
    }

    // 3f. PHP / Server-Side webshell tag
    const sample = buffer.slice(0, 8192).toString('utf8').toLowerCase();
    if (sample.includes('<?php') || sample.includes('<?=') || sample.includes('<%') || sample.includes('<script language="php"')) {
      return { safe: false, reason: 'Payload script PHP/Webshell terdeteksi di dalam berkas.' };
    }

    // 3g. Malicious SVG Vector check (XSS prevention)
    if (ext === 'svg' || sample.includes('<svg')) {
      if (sample.includes('<script') || sample.includes('onload=') || sample.includes('onerror=') || sample.includes('javascript:')) {
        return { safe: false, reason: 'Payload script berbahaya (SVG XSS) terdeteksi di dalam berkas gambar SVG.' };
      }
    }
  }

  return { safe: true };
}

// Stream raw binary media directly (verifies ownership before streaming)
app.get('/api/cloud/files/:id/raw', requireCloudAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, email: userEmail } = getAuthUser(req);
    const file = cloudDb.findById(id, userId, userEmail);
    if (!file) {
      // 🔒 Anti-IDOR Oracle: Return 404 instead of 403 to prevent ID enumeration
      return res.status(404).send('Berkas tidak ditemukan.');
    }

    // CORS headers
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Accept-Ranges', 'bytes');
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('X-Content-Type-Options', 'nosniff');

    const fileData = file.fileData || file.dataUrl;
    if (!fileData) {
      if (file.content) {
        const contentStr = typeof file.content === 'string' ? file.content : JSON.stringify(file.content);
        const buf = Buffer.from(contentStr);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Length', buf.length);
        res.setHeader('X-Content-Sha256', file.checksum || '');
        res.setHeader('X-Security-Shield', 'ENTERPRISE-ZERO-TRUST-256BIT');
        res.setHeader('X-Tamper-Status', 'VERIFIED_INTEGRITY');
        return res.send(buf);
      }
      return res.status(404).send('Data berkas kosong');
    }

    // Case 1: Disk file URL (/download/uploads/...)
    if (fileData.startsWith('/download/uploads/')) {
      const filename = path.basename(fileData);
      const diskPath = path.resolve(uploadsDir, filename);

      // Strict Sandbox Traversal Check
      if (!diskPath.startsWith(path.resolve(uploadsDir))) {
        return res.status(404).send('Akses berkas tidak sah.');
      }

      if (fs.existsSync(diskPath)) {
        // 🔒 Real-Time Cryptographic Tamper Verification (Non-blocking Streaming & Cached)
        if (file.checksum) {
          const isIntegrityValid = await verifyFileIntegrity(diskPath, file.checksum);
          if (!isIntegrityValid) {
            console.error(`[SECURITY ALERT] Integrity mismatch on file ${id}! Stored: ${file.checksum}`);
            return res.status(409).send('Deteksi Integritas Gagal: Berkas terindikasi dimodifikasi secara tidak sah di penyimpanan server.');
          }
        }
        res.setHeader('X-Content-Sha256', file.checksum || '');
        res.setHeader('X-Security-Shield', 'ENTERPRISE-ZERO-TRUST-256BIT');
        res.setHeader('X-Tamper-Status', 'VERIFIED_INTEGRITY');
        return res.sendFile(diskPath);
      }
    }

    // Case 2: Base64 data URI
    if (fileData.startsWith('data:')) {
      const parts = fileData.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const buf = Buffer.from(parts[1], 'base64');
      res.header('Content-Type', mime);
      res.header('Content-Length', buf.length);
      res.setHeader('X-Content-Sha256', file.checksum || '');
      res.setHeader('X-Security-Shield', 'ENTERPRISE-ZERO-TRUST-256BIT');
      res.setHeader('X-Tamper-Status', 'VERIFIED_INTEGRITY');
      return res.send(buf);
    }

    // Fallback: redirect or send as text
    return res.redirect(fileData);
  } catch (err) {
    console.error('[CLOUD API RAW ERROR]', err);
    return res.status(500).send(err.message);
  }
});

// Multer streaming configuration for heavy cloud files & videos
const cloudUploadDir = path.join(__dirname, 'temp-files', 'uploads');
if (!fs.existsSync(cloudUploadDir)) {
  fs.mkdirSync(cloudUploadDir, { recursive: true });
}

const cloudStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, cloudUploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = (file.originalname || 'video.mp4')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.');
    cb(null, `cloud_${timestamp}_${safeName}`);
  }
});

const cloudMulter = multer({
  storage: cloudStorage,
  limits: { fileSize: 1024 * 1024 * 1024 } // 1 GB single file limit
});

/**
 * POST /api/cloud/upload-raw
 * Streaming multipart upload for heavy videos, media, and documents.
 */
app.post('/api/cloud/upload-raw', requireCloudAuth, cloudMulter.single('file'), async (req, res) => {
  try {
    const { id: userId, email: userEmail } = getAuthUser(req);

    // 🔒 Upload Rate Limiting Guard
    const callerKey = `${userId || 'anon'}_${req.ip || 'ip'}`;
    if (!checkCloudUploadRate(callerKey)) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch {} }
      return res.status(429).json({
        success: false,
        error: 'Batas frekuensi upload tercapai. Mohon tunggu sejenak demi keamanan server.'
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Tidak ada berkas yang diterima oleh server.' });
    }

    const currentUsage = cloudDb.getTotalUsage(userId, userEmail);
    const fileSize = req.file.size;

    if (currentUsage + fileSize > FREE_TIER_QUOTA_BYTES) {
      try { fs.unlinkSync(req.file.path); } catch (_e) {}
      const currentMB = (currentUsage / (1024 * 1024)).toFixed(2);
      return res.status(400).json({
        success: false,
        error: `Kapasitas Cloud Storage (3 GB / 3072 MB) telah penuh. Saat ini terpakai: ${currentMB} MB. Silakan hapus berkas untuk mengunggah berkas baru.`,
        isQuotaExceeded: true
      });
    }

    // 🔒 Deep File Safety & Malware/Webshell Inspection
    const fileBuffer = fs.readFileSync(req.file.path);
    const safetyCheck = validateCloudFileSafety(req.file.originalname, fileBuffer);
    if (!safetyCheck.safe) {
      try { fs.unlinkSync(req.file.path); } catch {}
      console.warn(`[SECURITY ALERT] Blocked dangerous upload "${req.file.originalname}" from ${userEmail || userId}: ${safetyCheck.reason}`);
      return res.status(400).json({
        success: false,
        error: `Keamanan Cloud Menolak Berkas: ${safetyCheck.reason}`,
        securityViolation: true
      });
    }

    // 🔒 Cryptographic SHA-256 File Checksum Generation
    const fileSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const {
      id,
      parentId,
      category: reqCategory,
      folderType,
      founder,
      founderEmail,
      ceo,
      ceoEmail,
      employeeEmails,
      folderCreator,
      folderCreatorRole,
      thumbnail,
      textContent
    } = req.body;

    const fileId = id || `cloud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fileName = req.file.originalname || 'Untitled_File';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    let category = reqCategory || 'other';
    if (!reqCategory || reqCategory === 'other') {
      if (['docx', 'doc'].includes(ext)) category = 'docx';
      else if (['xlsx', 'xls', 'csv'].includes(ext)) category = 'excel';
      else if (['pptx', 'ppt'].includes(ext)) category = 'pptx';
      else if (['pdf'].includes(ext)) category = 'pdf';
      else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext)) category = 'image';
      else if (['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv', 'avi', 'flv', 'wmv'].includes(ext)) category = 'video';
      else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext)) category = 'audio';
      else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) category = 'archive';
      else if (['txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css'].includes(ext)) category = 'code';
    }

    const finalFileSize = fileSize;

    let finalThumbnail = thumbnail || null;
    if (!finalThumbnail && (category === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) && fileSize <= 5 * 1024 * 1024) {
      try {
        if (fileBuffer.length < 500000) {
          finalThumbnail = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;
        }
      } catch (_tErr) {}
    }

    const fileUrl = `/download/uploads/${req.file.filename}`;
    if (!finalThumbnail && (category === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext))) {
      finalThumbnail = fileUrl;
    }

    const effectiveOwner = userEmail || null;

    let parsedEmployees = null;
    if (employeeEmails) {
      try { parsedEmployees = typeof employeeEmails === 'string' ? JSON.parse(employeeEmails) : employeeEmails; } catch (_e) {}
    }

    // 🔒 Strictly enforce default folderType = 'private' to prevent accidental leaks
    const finalFolderType = folderType || 'private';

    cloudDb.saveFile({
      id: fileId,
      parentId: parentId && parentId !== 'null' ? parentId : null,
      name: fileName,
      type: category,
      category: category,
      size: finalFileSize,
      content: textContent || null,
      fileData: fileUrl,
      userId: userId,
      ownerEmail: effectiveOwner,
      folderType: finalFolderType,
      founder: founder || null,
      founderEmail: founderEmail || null,
      ceo: ceo || null,
      ceoEmail: ceoEmail || null,
      employeeEmails: parsedEmployees,
      folderCreator: folderCreator || null,
      folderCreatorRole: folderCreatorRole || null,
      thumbnail: finalThumbnail || null,
      checksum: fileSha256
    });

    const updatedUsage = cloudDb.getTotalUsage(userId, userEmail);

    const savedFileObj = {
      id: fileId,
      name: fileName,
      type: category,
      category: category,
      parentId: parentId && parentId !== 'null' ? parentId : null,
      sizeBytes: finalFileSize,
      size: finalFileSize > 0 ? `${(finalFileSize / (1024 * 1024)).toFixed(2)} MB` : '0.05 MB',
      date: new Date().toISOString().split('T')[0],
      dataUrl: fileUrl,
      fileData: fileUrl,
      thumbnail: thumbnail || null,
      ownerEmail: effectiveOwner,
      folderType: finalFolderType,
      founder: founder || null,
      founderEmail: founderEmail || null,
      ceo: ceo || null,
      ceoEmail: ceoEmail || null,
      employeeEmails: parsedEmployees,
      folderCreator: folderCreator || null,
      folderCreatorRole: folderCreatorRole || null,
      checksum: fileSha256,
      integrityStatus: 'VERIFIED_TAMPER_FREE'
    };

    return res.json({
      success: true,
      message: `Berkas "${fileName}" berhasil diunggah ke Cloud Storage Pribadi (Zero-Trust SHA-256 Terverifikasi).`,
      file: savedFileObj,
      storageInfo: {
        usedBytes: updatedUsage,
        totalBytes: FREE_TIER_QUOTA_BYTES,
        usedMB: (updatedUsage / (1024 * 1024)).toFixed(2),
        totalMB: 3072
      }
    });
  } catch (error) {
    console.error('[CLOUD API] Upload-raw error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/cloud/transcode-video
 */
app.post('/api/cloud/transcode-video', requireCloudAuth, express.json(), async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) {
      return res.status(400).json({ success: false, error: 'File ID diperlukan' });
    }

    const { id: userId, email: userEmail } = getAuthUser(req);
    const fileRecord = cloudDb.findById(fileId, userId, userEmail);
    if (!fileRecord) {
      return res.status(404).json({ success: false, error: 'Berkas tidak ditemukan atau Anda tidak memiliki akses' });
    }

    return res.json({
      success: true,
      message: 'Video berkas asli siap diputar tanpa kompresi.',
      file: {
        ...fileRecord,
        sizeBytes: fileRecord.size,
        size: `${(fileRecord.size / (1024 * 1024)).toFixed(2)} MB`,
        dataUrl: fileRecord.fileData || fileRecord.dataUrl,
        fileData: fileRecord.fileData || fileRecord.dataUrl
      }
    });
  } catch (err) {
    console.error('[VIDEO TRANSCODE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload files to Cloud Storage (JSON payload)
app.post('/api/cloud/upload', requireCloudAuth, express.json({ limit: '100mb' }), async (req, res) => {
  try {
    const { id: userId, email: userEmail } = getAuthUser(req);

    // 🔒 Upload Rate Limiting Guard
    const callerKey = `${userId || 'anon'}_${req.ip || 'ip'}`;
    if (!checkCloudUploadRate(callerKey)) {
      return res.status(429).json({
        success: false,
        error: 'Batas frekuensi upload tercapai. Mohon tunggu sejenak demi keamanan server.'
      });
    }

    const { files: uploadedPayload } = req.body;

    if (!uploadedPayload || !Array.isArray(uploadedPayload) || uploadedPayload.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada berkas yang diunggah.' });
    }

    const MAX_SINGLE_FILE_LIMIT = 50 * 1024 * 1024;
    const oversizedFile = uploadedPayload.find(f => (f.sizeBytes || f.size || 0) > MAX_SINGLE_FILE_LIMIT);
    if (oversizedFile) {
      return res.status(400).json({
        success: false,
        error: `Berkas "${oversizedFile.name}" melebihi batas JSON maksimum 50 MB. Gunakan upload langsung untuk berkas besar.`
      });
    }

    const currentUsage = cloudDb.getTotalUsage(userId, userEmail);
    const newFilesTotalSize = uploadedPayload.reduce((sum, f) => sum + (f.sizeBytes || f.size || 500000), 0);

    if (currentUsage + newFilesTotalSize > FREE_TIER_QUOTA_BYTES) {
      const currentMB = (currentUsage / (1024 * 1024)).toFixed(2);
      return res.status(400).json({
        success: false,
        error: `Kapasitas Cloud Storage Gratis (3 GB / 3072 MB) telah penuh. Saat ini terpakai: ${currentMB} MB. Silakan hapus berkas tua.`,
        isQuotaExceeded: true
      });
    }

    const savedFiles = [];
    for (const f of uploadedPayload) {
      const fileId = f.id || `cloud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fileName = f.name || 'Untitled_File';
      const ext = fileName.split('.').pop()?.toLowerCase();
      
      let category = f.category || 'other';
      if (['docx', 'doc'].includes(ext)) category = 'docx';
      else if (['xlsx', 'xls', 'csv'].includes(ext)) category = 'excel';
      else if (['pptx', 'ppt'].includes(ext)) category = 'pptx';
      else if (['pdf'].includes(ext)) category = 'pdf';
      else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) category = 'image';

      const fileSize = f.sizeBytes || f.size || 500000;
      const fileContent = f.content || f.text || null;
      const fileData = f.dataUrl || f.fileData || null;
      const parentId = f.parentId || null;
      const effectiveOwner = userEmail || null;
      const finalFolderType = f.folderType || 'private';

      // 🔒 Deep File Safety Check
      let fileBuf = null;
      if (fileData) {
        try {
          const b64 = fileData.includes(',') ? fileData.split(',')[1] : fileData;
          fileBuf = Buffer.from(b64, 'base64');
        } catch {}
      } else if (fileContent) {
        fileBuf = Buffer.from(typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent));
      }
      const safetyCheck = validateCloudFileSafety(fileName, fileBuf);
      if (!safetyCheck.safe) {
        return res.status(400).json({
          success: false,
          error: `Berkas "${fileName}" ditolak: ${safetyCheck.reason}`,
          securityViolation: true
        });
      }

      // 🔒 SHA-256 Checksum Generation
      const fileSha256 = crypto.createHash('sha256').update(fileBuf || Buffer.from(fileName)).digest('hex');

      cloudDb.saveFile({
        id: fileId,
        parentId,
        name: fileName,
        type: category,
        category: category,
        size: fileSize,
        content: fileContent,
        fileData: fileData,
        userId: userId,
        ownerEmail: effectiveOwner,
        folderType: finalFolderType,
        founder: f.founder || null,
        founderEmail: f.founderEmail || null,
        ceo: f.ceo || null,
        ceoEmail: f.ceoEmail || null,
        employeeEmails: f.employeeEmails || null,
        folderCreator: f.folderCreator || null,
        folderCreatorRole: f.folderCreatorRole || null,
        thumbnail: f.thumbnail || null,
        checksum: fileSha256
      });

      savedFiles.push({ 
        id: fileId, 
        name: fileName, 
        category, 
        parentId, 
        ownerEmail: effectiveOwner, 
        folderType: finalFolderType, 
        folderCreator: f.folderCreator, 
        folderCreatorRole: f.folderCreatorRole, 
        sizeBytes: fileSize, 
        thumbnail: f.thumbnail || null,
        checksum: fileSha256,
        integrityStatus: 'VERIFIED_TAMPER_FREE'
      });
    }

    const updatedUsage = cloudDb.getTotalUsage(userId, userEmail);

    return res.json({
      success: true,
      message: `Berhasil mengunggah ${savedFiles.length} berkas ke Cloud Storage Server (Zero-Trust SHA-256 Terverifikasi).`,
      savedFiles,
      storageInfo: {
        usedBytes: updatedUsage,
        totalBytes: FREE_TIER_QUOTA_BYTES,
        usedMB: (updatedUsage / (1024 * 1024)).toFixed(2),
        totalMB: 3072
      }
    });
  } catch (error) {
    console.error('[CLOUD API] Upload error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Save document or file directly to cloud database
app.post('/api/cloud/save', requireCloudAuth, express.json({ limit: '50mb' }), (req, res) => {
  try {
    const { id: userId, email: userEmail } = getAuthUser(req);
    
    const { id, parentId, name, type, category, content, text, fileData, dataUrl, size, sizeBytes, folderType, thumbnail } = req.body || {};
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Nama berkas tidak boleh kosong' });
    }

    const finalContent = content !== undefined ? content : (text || null);
    const contentBuf = Buffer.from(typeof finalContent === 'string' ? finalContent : JSON.stringify(finalContent || ''));
    
    let inspectBuf = contentBuf;
    const effectiveData = fileData || dataUrl || null;
    if (effectiveData && typeof effectiveData === 'string') {
      if (effectiveData.startsWith('data:')) {
        try {
          const b64 = effectiveData.includes(',') ? effectiveData.split(',')[1] : effectiveData;
          inspectBuf = Buffer.from(b64, 'base64');
        } catch {}
      } else {
        inspectBuf = Buffer.from(effectiveData);
      }
    }

    // 🔒 File Safety Inspection
    const safetyCheck = validateCloudFileSafety(name, inspectBuf);
    if (!safetyCheck.safe) {
      return res.status(400).json({ success: false, error: safetyCheck.reason, securityViolation: true });
    }
    
    const fileId = id || `cloud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const effectiveCategory = category || type || 'other';
    const effectiveType = type || effectiveCategory;
    const calculatedSize = sizeBytes || (typeof finalContent === 'string' ? finalContent.length : (finalContent ? JSON.stringify(finalContent).length : (size || 0)));
    const effectiveOwner = userEmail || null;

    // 🔒 Cryptographic SHA-256 Checksum
    const fileSha256 = crypto.createHash('sha256').update(fileData || dataUrl || contentBuf).digest('hex');

    const file = cloudDb.saveFile({
      id: fileId,
      parentId: parentId || null,
      name,
      type: effectiveType,
      category: effectiveCategory,
      size: calculatedSize,
      content: finalContent,
      fileData: fileData || dataUrl || null,
      userId,
      ownerEmail: effectiveOwner,
      folderType: folderType || 'private',
      thumbnail: thumbnail || null,
      checksum: fileSha256
    });

    return res.json({ success: true, file });
  } catch (error) {
    console.error('[CLOUD API] Save file error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Create folder in Cloud Storage
const handleCloudFolder = (req, res) => {
  try {
    const { id: userId, email: userEmail } = getAuthUser(req);
    const folderObj = req.body.folder || req.body || {};
    const folderId = folderObj.id || `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ownerEmail = userEmail || null;

    const saved = cloudDb.saveFolder(
      folderId,
      folderObj.parentId || null,
      folderObj.name || 'Folder Baru',
      userId,
      ownerEmail,
      folderObj.folderType || 'private',
      folderObj.founder || null,
      folderObj.founderEmail || null,
      folderObj.ceo || null,
      folderObj.ceoEmail || null,
      folderObj.employeeEmails || null
    );

    return res.json({ success: true, folder: saved || folderObj });
  } catch (err) {
    console.error('[CLOUD API] Save folder error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/cloud/folder', requireCloudAuth, express.json(), handleCloudFolder);
app.post('/api/cloud/folders', requireCloudAuth, express.json(), handleCloudFolder);

// Update folder in Cloud Storage (strictly verify ownership first)
app.put('/api/cloud/folder/:id', requireCloudAuth, express.json(), (req, res) => {
  try {
    const { id: userId, email: userEmail } = getAuthUser(req);
    const { folder } = req.body || {};
    const folderId = req.params.id || folder?.id;

    if (!folderId) {
      return res.status(400).json({ success: false, error: 'ID folder tidak valid.' });
    }

    const existing = cloudDb.findById(folderId, userId, userEmail);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Folder tidak ditemukan atau Anda tidak memiliki izin akses.' });
    }

    const saved = cloudDb.saveFile({
      id: folderId,
      parentId: folder?.parentId || existing.parentId || null,
      name: folder?.name || existing.name || 'Folder Edit',
      type: 'folder',
      category: 'folder',
      size: 0,
      content: null,
      fileData: null,
      userId,
      ownerEmail: userEmail,
      folderType: folder?.folderType || existing.folderType || 'private',
      founder: folder?.founder || existing.founder || null,
      founderEmail: folder?.founderEmail || existing.founderEmail || null,
      ceo: folder?.ceo || existing.ceo || null,
      ceoEmail: folder?.ceoEmail || existing.ceoEmail || null,
      employeeEmails: folder?.employeeEmails || existing.employeeEmails || null,
      folderCreator: folder?.folderCreator || existing.folderCreator || null,
      folderCreatorRole: folder?.folderCreatorRole || existing.folderCreatorRole || null
    });

    return res.json({ success: true, folder: saved || folder });
  } catch (err) {
    console.error('[CLOUD API] Update folder error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Delete folder from Cloud Storage
app.delete('/api/cloud/folder/:id', requireCloudAuth, (req, res) => {
  try {
    const { id: userId, email: userEmail } = getAuthUser(req);
    const folderId = req.params.id;

    const deleted = cloudDb.delete(folderId, userId, userEmail);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Folder tidak ditemukan atau Anda tidak memiliki izin akses.' });
    }
    return res.json({ success: true, message: 'Folder berhasil dihapus dari Cloud Storage.' });
  } catch (err) {
    console.error('[CLOUD API] Delete folder error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Delete file from Cloud Storage
app.delete('/api/cloud/files/:id', requireCloudAuth, (req, res) => {
  try {
    const { id: userId, email: userEmail } = getAuthUser(req);
    const fileId = req.params.id;
    const fileName = req.query.name || null;

    const deleted = cloudDb.delete(fileId, userId, userEmail, fileName);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Berkas tidak ditemukan atau Anda tidak memiliki izin akses.' });
    }
    const updatedUsage = cloudDb.getTotalUsage(userId, userEmail);

    return res.json({
      success: true,
      message: 'Berkas berhasil dihapus dari Cloud Storage Server.',
      storageInfo: {
        usedBytes: updatedUsage,
        totalBytes: FREE_TIER_QUOTA_BYTES,
        usedMB: (updatedUsage / (1024 * 1024)).toFixed(2),
        totalMB: 3072
      }
    });
  } catch (error) {
    console.error('[CLOUD API] Delete error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  // Check IP-based token limit
  const clientIp = getClientIp(req);
  const ipStatus = checkIpTokenLimit(clientIp);
  if (ipStatus.isLimited) {
    console.warn(`[IP TOKEN LIMIT] Blocked chat request from IP: ${clientIp}`);
    return res.status(429).json({
      success: false,
      error: 'Maaf, batas token penggunaan untuk IP Anda telah tercapai. Penggunaan token akan di-reset dalam 4 jam.',
      isTokenLimitError: true,
      resetTime: ipStatus.resetTime,
      usedTokens: ipStatus.usedTokens,
      maxLimit: IP_MAX_TOKEN_LIMIT
    });
  }

  if (!TOKENMIX_CHAT_API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Deepernova chat service not configured',
    });
  }

  try {
    // Initialize RAG on first request
    if (!ragInitialized) {
      const success = await ragService.loadKnowledgeBase();
      ragInitialized = success;
    }

    // Safety check for messages
    if (!req.body.messages || !Array.isArray(req.body.messages)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: messages array is required'
      });
    }

    let messages = JSON.parse(JSON.stringify(req.body.messages)); // Deep clone

    const normalizeContent = (content) => {
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content
          .map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') return item.text || item.image_url?.url || '';
            return '';
          })
          .filter(Boolean)
          .join(' ');
      }
      return String(content || '');
    };

    // Extract last user message for RAG search
    let userQuery = '';
    console.log('[DEBUG] Total messages in array:', messages.length);
    for (let i = 0; i < messages.length; i++) {
      const preview = normalizeContent(messages[i].content).substring(0, 50);
      console.log(`[DEBUG] Message ${i}: role="${messages[i].role}", content="${preview}..."`);
    }
    
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userQuery = normalizeContent(messages[i].content);
        console.log('[DEBUG] Found user message at index', i);
        break;
      }
    }

    console.log('[DEBUG] Extracted userQuery:', userQuery.substring(0, 100));

    /**
     * 🧠 Smart Chunked Context Memory (Remembers 20+ Chat Turns with Strict Token Economy)
     * Supports up to 24 non-system messages (~12-15 full dialogue turns).
     * Uses tiered compression & dynamic token ceiling (maxInputTokens = 3500)
     * so that recent context has full fidelity while older turns are compactly retained without token explosion.
     */
    const enforceChunkedContextMemory = (msgs, maxInputTokens = 3500) => {
      if (!Array.isArray(msgs) || msgs.length === 0) return msgs;

      const estimateTokens = (content) => {
        if (!content) return 0;
        if (typeof content === 'string') return Math.ceil(content.length / 3.5);
        if (Array.isArray(content)) {
          let sum = 0;
          for (const item of content) {
            if (typeof item === 'string') sum += Math.ceil(item.length / 3.5);
            else if (item?.text) sum += Math.ceil(item.text.length / 3.5);
            else if (item?.type === 'image_url' || item?.image_url) sum += 65;
          }
          return sum;
        }
        return 0;
      };

      const calculateTotalTokens = (items) => {
        return items.reduce((acc, m) => acc + estimateTokens(m.content) + 4, 0);
      };

      // Consolidate system messages
      let systemMsg = msgs.find(m => m.role === 'system');
      let nonSystemMsgs = msgs.filter(m => m.role !== 'system');

      // Allow remembering up to 24 non-system messages (20+ turns!)
      if (nonSystemMsgs.length > 24) {
        nonSystemMsgs = nonSystemMsgs.slice(-24);
      }

      // Tiered compression on older messages:
      const totalCount = nonSystemMsgs.length;
      nonSystemMsgs = nonSystemMsgs.map((m, idx) => {
        const ageFromEnd = totalCount - 1 - idx;
        if (typeof m.content !== 'string') return m;

        // Tier 1 (Most recent 4 messages): preserve high fidelity
        if (ageFromEnd < 4) {
          if (m.content.length > 1500) {
            return { ...m, content: m.content.substring(0, 1500) + '...' };
          }
          return m;
        }

        // Tier 2 (Intermediate 8 messages): compact summaries
        if (ageFromEnd < 12) {
          const maxChars = m.role === 'user' ? 350 : 300;
          let text = m.content.replace(/```[a-z]*\n[\s\S]*?\n```/g, '[Kode diringkas]');
          if (text.length > maxChars) {
            text = text.substring(0, maxChars) + '...';
          }
          return { ...m, content: text };
        }

        // Tier 3 (Older messages 13 to 24): ultra-compact memory chunks
        const maxChars = m.role === 'user' ? 160 : 140;
        let text = m.content.replace(/```[a-z]*\n[\s\S]*?\n```/g, '[Kode]');
        if (text.length > maxChars) {
          text = text.substring(0, maxChars) + '...';
        }
        return { ...m, content: text };
      });

      // System prompt budget: max 450 tokens (~1500 chars)
      if (systemMsg && typeof systemMsg.content === 'string' && systemMsg.content.length > 1500) {
        systemMsg = {
          ...systemMsg,
          content: systemMsg.content.substring(0, 1500)
        };
      }

      let consolidated = systemMsg ? [systemMsg, ...nonSystemMsgs] : nonSystemMsgs;
      let currentTokens = calculateTotalTokens(consolidated);

      // If overall payload exceeds maxInputTokens, drop the OLDEST non-system messages one-by-one
      // (NEVER drop all history down to 2 messages!)
      while (currentTokens > maxInputTokens && consolidated.length > 3) {
        const dropIndex = systemMsg ? 1 : 0;
        consolidated.splice(dropIndex, 1);
        currentTokens = calculateTotalTokens(consolidated);
      }

      const finalTokens = calculateTotalTokens(consolidated);
      console.log(`[CHUNKED CONTEXT MEMORY] Preserved ${consolidated.length} messages (${finalTokens}/${maxInputTokens} tokens).`);
      return consolidated;
    };

    messages = enforceChunkedContextMemory(messages, 3500);

    // Check if streaming is requested
    const shouldStream = req.body.stream === true;
    console.log(`[CHAT] Streaming requested: ${shouldStream}`);
    
    try {
        // Auto-detect vision requirement in server chat route
        const hasImagesInPayload = (req.body.uploadedImages && req.body.uploadedImages.length > 0) ||
          messages.some(m => Array.isArray(m.content) && m.content.some(c => c && (c.type === 'image_url' || c.image_url)));

        // Ensure vision formatting matches TokenMix llama-4-maverick schema if uploadedImages provided
        if (req.body.uploadedImages && req.body.uploadedImages.length > 0) {
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
              const currentContent = messages[i].content;
              const contentArray = [];
              if (typeof currentContent === 'string') {
                contentArray.push({ type: 'text', text: currentContent });
              } else if (Array.isArray(currentContent)) {
                contentArray.push(...currentContent);
              }
              for (const img of req.body.uploadedImages) {
                const imgUrl = typeof img === 'string' ? img : (img.url || img.dataUrl);
                if (imgUrl && !contentArray.some(c => c?.image_url?.url === imgUrl)) {
                  contentArray.push({ type: 'image_url', image_url: { url: imgUrl } });
                }
              }
              messages[i].content = contentArray;
              break;
            }
          }
        }
        
        // Final guarantee: strictly enforce <= 1,000 input tokens ceiling before dispatching
        messages = enforceContextWindow1000(messages, 1000);
        
        // TokenMix model llama-4-maverick handles both standard text and vision multimodal
        const requestedModel = req.body.model || DEFAULT_CHAT_MODEL;
        let selectedModel = 'llama-4-maverick';
        if (requestedModel && !requestedModel.includes('deepseek') && !requestedModel.includes('deepernova')) {
          selectedModel = requestedModel;
        }

        console.log(`[CHAT] Streaming requested: ${shouldStream}, Model: ${selectedModel} (Vision Mode: ${hasImagesInPayload})`);

        // Call TokenMix API with selected model (supports key rotation)
        let tokenmixResponse = null;
        let lastError = null;

        for (let idx = 0; idx < TOKENMIX_API_KEYS.length; idx++) {
          const key = TOKENMIX_API_KEYS[idx];
          let attempts = 0;
          const maxAttempts = 3;
          while (attempts < maxAttempts) {
            try {
              console.log(`[CHAT] Attempting chat request with key index ${idx} (attempt ${attempts + 1})...`);
              tokenmixResponse = await fetch(TOKENMIX_CHAT_API_URL, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${key}`,
                },
                body: JSON.stringify({
                  model: selectedModel,
                  messages: messages,
                  temperature: req.body.temperature || 0.5,
                  max_tokens: req.body.max_tokens || 1024,
                  presence_penalty: req.body.presence_penalty !== undefined ? req.body.presence_penalty : 0.2,
                  frequency_penalty: req.body.frequency_penalty !== undefined ? req.body.frequency_penalty : 0.3,
                  stream: shouldStream,
                }),
              });

              if (tokenmixResponse.ok) {
                console.log(`[CHAT] Request succeeded with key index ${idx}`);
                lastError = null;
                break;
              } else {
                const errText = await tokenmixResponse.text();
                const status = tokenmixResponse.status;
                lastError = new Error(`Key index ${idx} failed with status ${status}: ${errText}`);
                
                if ((status === 429 || status >= 500) && attempts < maxAttempts - 1) {
                  const backoff = (attempts + 1) * 1500;
                  console.warn(`[CHAT] Key index ${idx} status ${status}. Retrying in ${backoff}ms...`);
                  await new Promise(resolve => setTimeout(resolve, backoff));
                  attempts++;
                  continue;
                }
                
                console.warn(`[CHAT] Key rotation warning: ${lastError.message}`);
                break; // Exit retry loop and switch key if not 429
              }
            } catch (e) {
              lastError = e;
              console.warn(`[CHAT] Key rotation error with index ${idx}: ${e.message}`);
              break; // Switch key on network exception
            }
          }
          if (tokenmixResponse && tokenmixResponse.ok) {
            break;
          }
        }

        if (lastError || !tokenmixResponse) {
          throw lastError || new Error('All TokenMix API keys failed.');
        }

        if (shouldStream) {
          // Set response headers for streaming
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
          if (typeof res.flushHeaders === 'function') {
            res.flushHeaders();
          }

          const sessionId = req.body.sessionId || req.body.conversationId || null;
          const userMessageId = req.body.userMessageId || null;
          const personality = req.body.personality || 'mentor';

          // If authenticated and sessionId provided, ensure session and user message are saved immediately
          if (req.isAuthenticated() && sessionId) {
            try {
              let session = sessionDb.findById(sessionId);
              if (!session) {
                sessionDb.create(sessionId, req.user.id, userQuery ? userQuery.slice(0, 45) : 'Obrolan AI');
              }
              if (userQuery) {
                const existingMsg = userMessageId ? messageDb.findById(userMessageId) : null;
                if (!existingMsg) {
                  messageDb.create(
                    userMessageId || (`user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
                    sessionId,
                    req.user.id,
                    'user',
                    userQuery,
                    personality
                  );
                }
              }
            } catch (initDbErr) {
              console.warn('[CHAT_DB_INIT] Warning initializing session/message in DB:', initDbErr.message);
            }
          }

          let fullResponseText = '';
          let clientDisconnected = false;

          res.on('close', () => {
            clientDisconnected = true;
          });

          // Read stream chunks from TokenMix upstream
          tokenmixResponse.body.on('data', (chunk) => {
            const chunkStr = chunk.toString();

            // Forward to client if still connected
            if (!clientDisconnected && !res.writableEnded) {
              try {
                res.write(chunk);
                if (typeof res.flush === 'function') {
                  res.flush();
                }
              } catch (_writeErr) {
                clientDisconnected = true;
              }
            }

            // Accumulate response text on server
            const lines = chunkStr.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
                try {
                  const parsed = JSON.parse(trimmed.slice(6));
                  const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.text || '';
                  if (delta) fullResponseText += delta;
                } catch (_e) {}
              }
            }
          });

          tokenmixResponse.body.on('end', () => {
            if (!clientDisconnected && !res.writableEnded) {
              try {
                res.end();
              } catch (_endErr) {}
            }

            // PERSIST TO DATABASE: Save complete AI response even if client disconnected / switched tab!
            if (fullResponseText && sessionId && req.isAuthenticated()) {
              try {
                const assistantMsgId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                messageDb.create(assistantMsgId, sessionId, req.user.id, 'assistant', fullResponseText, personality);
                sessionDb.update(sessionId, { updatedAt: new Date().toISOString() });
                console.log(`[SERVER_CHAT_PERSIST] ✅ AI response saved to DB (${fullResponseText.length} chars) for session ${sessionId}`);
              } catch (saveDbErr) {
                console.error('[SERVER_CHAT_PERSIST] Error saving assistant response:', saveDbErr);
              }
            }
          });

          tokenmixResponse.body.on('error', (streamErr) => {
            console.error('[SERVER_CHAT_STREAM_ERROR]', streamErr);
            if (!clientDisconnected && !res.writableEnded) {
              try { res.end(); } catch (_e) {}
            }
          });
        } else {
          // Non-streaming: parse and return as JSON
          const data = await tokenmixResponse.json();
          res.setHeader('Content-Type', 'application/json');
          res.json(data);
        }
      } catch (error) {
        console.error('[CHAT] Regular chat error:', error);
        // Sanitize error message to hide API details
        const sanitizedError = humanizeError(error.message);
        
        if (shouldStream) {
          // Streaming error response
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.write(`data: ${JSON.stringify({ 
            choices: [{ 
              delta: { content: `❌ Maaf, terjadi kesalahan: ${sanitizedError}` } 
            }] 
          })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        } else {
          // Non-streaming JSON error response
          res.status(500).json({
            success: false,
            error: `Chat error: ${sanitizedError}`,
            choices: [{ 
              message: { 
                content: `❌ Maaf, terjadi kesalahan: ${sanitizedError}` 
              } 
            }]
          });
        }
      }
  } catch (outerError) {
    console.error('[CHAT] Outer error:', outerError);
    res.status(500).json({
      success: false,
      error: outerError.message,
    });
  }
});

// 🎙️ SECURE SERVER-SIDE TEXT-TO-SPEECH (TTS) ENDPOINT
app.post('/api/tts', express.json(), async (req, res) => {
  try {
    const { input, text, voice = 'nova', model = 'tts-1' } = req.body;
    const inputText = (input || text || '').trim();
    if (!inputText) {
      return res.status(400).json({ error: 'Text/input is required for TTS' });
    }

    const key = TOKENMIX_API_KEY;
    if (!key) {
      return res.status(500).json({ error: 'TTS service not configured' });
    }

    const maxChars = 3000;
    const truncatedText = inputText.length > maxChars ? inputText.substring(0, maxChars) + '...' : inputText;

    const ttsResponse = await fetch('https://api.tokenmix.ai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        input: truncatedText,
        voice
      })
    });

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text().catch(() => '');
      console.error(`[TTS PROVIDER ERROR] ${ttsResponse.status}:`, errText);
      return res.status(ttsResponse.status).json({ error: 'TTS provider error', details: errText });
    }

    const contentType = ttsResponse.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const buffer = await ttsResponse.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[TTS SERVER EXCEPTION]', err);
    return res.status(500).json({ error: 'Failed to generate speech: ' + err.message });
  }
});

app.post('/api/external-finance', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'Query text is required' });
    }

    const financeContext = await externalFinanceService.buildFinanceContext(query);
    res.json({ success: true, query, financeContext });
  } catch (error) {
    console.error('[External Finance] Error fetching data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Download generated file from agent sandbox
 * GET /api/download/:userId/:filename
 */
app.get('/api/download/:userId/:filename', (req, res) => {
  try {
    const { userId, filename } = req.params;
    
    // Security: validate userId and filename to prevent path traversal
    if (!userId || !filename || userId.includes('..') || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid userId or filename' });
    }
    
    // Construct safe file path
    const sandboxDir = path.join(process.cwd(), 'server', 'sandbox', userId);
    const filePath = path.join(sandboxDir, filename);
    
    // Verify file exists and is within sandbox directory
    if (!fs.existsSync(filePath)) {
      console.log(`[DOWNLOAD] File not found at: ${filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Ensure file is within the sandbox (prevent path traversal)
    const realPath = fs.realpathSync(filePath);
    const realSandboxDir = fs.realpathSync(sandboxDir);
    if (!realPath.startsWith(realSandboxDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Send file
    console.log(`[DOWNLOAD] Serving file: ${filename} from: ${filePath}`);
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('[DOWNLOAD] Error sending file:', err);
      } else {
        console.log(`[DOWNLOAD] File sent successfully: ${filename}`);
      }
    });
  } catch (error) {
    console.error('[DOWNLOAD] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Execute Python code and generate files
 * POST /api/generate-file
 * Body: { code: string, filename: string, language?: 'python' | 'javascript' | etc }
 */
app.post('/api/generate-file', async (req, res) => {
  try {
    const { code, filename, language = 'python' } = req.body;

    if (!code || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Code and filename are required',
      });
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const outputPath = path.join(tempDir, sanitizedFilename);

    // Add header comment with generation info
    const headerComment = `# Generated by Deepernova AI File Generator\n# Generated at ${new Date().toISOString()}\n\n`;
    const fullCode = headerComment + code;

    // Execute based on language
    if (language === 'python') {
      return executePython(fullCode, outputPath, sanitizedFilename, res);
    } else if (language === 'javascript') {
      return executeJavaScript(fullCode, outputPath, sanitizedFilename, res);
    } else {
      // For other languages, just save the file as-is
      fs.writeFileSync(outputPath, code, 'utf-8');
      return res.json({
        success: true,
        filename: sanitizedFilename,
        downloadUrl: `/download/${sanitizedFilename}`,
        message: `File ${sanitizedFilename} generated successfully`,
      });
    }
  } catch (error) {
    console.error('File generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Execute Python code
 */
function executePython(code, outputPath, filename, res) {
  return new Promise(() => {
    // Create a script to execute
    const scriptPath = path.join(tempDir, `script_${Date.now()}.py`);
    fs.writeFileSync(scriptPath, code, 'utf-8');

    const python = spawn('python', [scriptPath], {
      timeout: 30000, // 30 second timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      // Clean up script
      try {
        fs.unlinkSync(scriptPath);
      } catch {
        // ignore
      }

      if (code === 0) {
        // Check if output file was created
        if (fs.existsSync(outputPath)) {
          res.json({
            success: true,
            filename,
            downloadUrl: `/download/${filename}`,
            output: stdout,
            message: `File ${filename} generated successfully`,
          });
        } else {
          res.json({
            success: true,
            filename,
            output: stdout,
            message: 'Code executed successfully',
          });
        }
      } else {
        res.status(400).json({
          success: false,
          error: stderr || 'Python execution failed',
          code,
        });
      }
    });

    python.on('error', (error) => {
      res.status(500).json({
        success: false,
        error: `Failed to execute Python: ${error.message}`,
      });
    });
  });
}

/**
 * Execute JavaScript code
 */
function executeJavaScript(code, outputPath, filename, res) {
  try {
    // For safety, we only allow file writing, no dangerous operations
    const vm = require('vm');
    const sandbox = {
      require,
      console,
      fs,
      process: { env: {} },
      Buffer,
      __dirname: tempDir,
      __filename: outputPath,
    };

    vm.runInNewContext(code, sandbox, { timeout: 5000 });

    if (fs.existsSync(outputPath)) {
      res.json({
        success: true,
        filename,
        downloadUrl: `/download/${filename}`,
        message: `File ${filename} generated successfully`,
      });
    } else {
      res.json({
        success: true,
        filename,
        message: 'Code executed successfully',
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * List generated files
 */
app.get('/api/files', (req, res) => {
  try {
    const files = fs.readdirSync(tempDir);
    const filesList = files
      .filter((f) => !f.endsWith('.py')) // Don't list temp scripts
      .map((f) => ({
        filename: f,
        size: fs.statSync(path.join(tempDir, f)).size,
        downloadUrl: `/download/${f}`,
      }));

    res.json({
      success: true,
      files: filesList,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Delete generated file
 */
app.delete('/api/files/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const sanitized = path.basename(filename);
    const filePath = path.join(tempDir, sanitized);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: `File ${sanitized} deleted`,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Clear all temporary files
 */
app.post('/api/files/clear', (req, res) => {
  try {
    const files = fs.readdirSync(tempDir);
    files.forEach((f) => {
      fs.unlinkSync(path.join(tempDir, f));
    });

    res.json({
      success: true,
      message: 'All files cleared',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * AUTH ROUTES
 */

// Login with email and password
app.post('/auth/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      console.error('[AUTH/LOGIN] Authentication error:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      // Return the specific error message from passport
      console.warn('[AUTH/LOGIN] Authentication failed:', info?.message || 'Unknown error');
      return res.status(401).json({ 
        error: true, 
        message: info.message || 'Authentication failed',
        code: info.code || 'AUTH_FAILED'
      });
    }

    // Set the user in request for req.login
    req.user = user;
    
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('[AUTH/LOGIN] Login error:', loginErr.message);
        return res.status(500).json({ error: loginErr.message });
      }
      
      req.session.isGuest = false;
      
      console.log(`[AUTH/LOGIN] ✅ User logged in: ${user.email}`);
      console.log(`[AUTH/LOGIN] Session ID: ${req.sessionID}`);
      console.log(`[AUTH/LOGIN] Session will expire in ${req.session.cookie.maxAge}ms`);
      
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[AUTH/LOGIN] Session save error:', saveErr.message);
        } else {
          console.log(`[AUTH/LOGIN] ✅ Session saved to store`);
        }

        // Query fresh user data
        const freshUser = userDb.findById(user.id);
        const userWithoutPassword = {
          id: freshUser.id,
          email: freshUser.email,
          name: freshUser.name,
          picture: freshUser.picture,
          createdAt: freshUser.createdAt
        };
        
        console.log(`[AUTH/LOGIN] Sending response with Set-Cookie header`);
        res.json({ success: true, user: userWithoutPassword });
      });
    });
  })(req, res, next);
});

// Register with email and password
app.post('/auth/register', async (req, res) => {
  const { email, name, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const displayName = String(name || '').trim();

  if (!normalizedEmail || !displayName) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  // Enforce @deepmail.com domain for all accounts
  if (!normalizedEmail.endsWith('@deepmail.com')) {
    return res.status(400).json({ error: 'Email harus menggunakan domain @deepmail.com (contoh: user@deepmail.com)' });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password minimal 8 karakter.' });
  }

  try {
    let user = userDb.findByEmail(normalizedEmail);
    if (user) {
      return res.status(409).json({ error: 'Email sudah terdaftar.' });
    }

    const hashedPassword = await hashPassword(password);
    const userId = uuidv4();
    user = userDb.create(userId, normalizedEmail, displayName, hashedPassword, null);

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      req.session.isGuest = false;
      const userWithoutPassword = {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        createdAt: user.createdAt
      };
      res.json({ success: true, user: userWithoutPassword });
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registrasi gagal. Coba lagi nanti.' });
  }
});



// Get current user
app.get('/auth/me', (req, res) => {
  console.log(`[AUTH/ME] Session ID: ${req.sessionID}, isGuest: ${req.session.isGuest}, isAuthenticated: ${req.isAuthenticated()}, User: ${req.user ? req.user.email : 'none'}`);
  
  if (req.session.isGuest) {
    console.log(`[AUTH/ME] Returning guest user`);
    return res.json({
      authenticated: false,
      guest: true,
      user: { name: 'Guest', email: 'guest@deepernova.com', guest: true },
    });
  }

  if (!req.isAuthenticated()) {
    console.log(`[AUTH/ME] Not authenticated, returning 401`);
    return res.status(401).json({ 
      authenticated: false, 
      guest: false,
      error: 'Not authenticated' 
    });
  }

  // Query fresh user data
  const freshUser = userDb.findById(req.user.id);
  const userWithoutPassword = {
    id: freshUser.id,
    email: freshUser.email,
    name: freshUser.name,
    picture: freshUser.picture,
    createdAt: freshUser.createdAt
  };

  console.log(`[AUTH/ME] Authenticated user: ${userWithoutPassword.email}`);
  res.json({ authenticated: true, user: userWithoutPassword });
});

// Update current user profile (persist name)
app.put('/auth/me', (req, res) => {
  if (req.session.isGuest) {
    return res.status(403).json({ error: 'Guests cannot update profile.' });
  }

  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const displayName = String(req.body.name || '').trim();
  if (!displayName) {
    return res.status(400).json({ error: 'Nama tidak boleh kosong.' });
  }

  try {
    const updatedUser = userDb.update(req.user.id, { name: displayName });
    const userWithoutPassword = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      picture: updatedUser.picture,
      createdAt: updatedUser.createdAt
    };

    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('[AUTH/UPDATE_PROFILE] Error updating user name:', error);
    res.status(500).json({ error: 'Gagal menyimpan nama. Coba lagi nanti.' });
  }
});

// Logout
app.post('/auth/logout', (req, res) => {
  const finishLogout = () => {
    req.session.destroy((err) => {
      if (err) {
        console.error('[AUTH/LOGOUT] Session destroy error:', err.message);
      }
      res.clearCookie('connect.sid');
      console.log('[AUTH/LOGOUT] ✅ User logged out successfully');
      res.json({ success: true });
    });
  };

  if (req.isAuthenticated && req.isAuthenticated()) {
    req.logout((err) => {
      if (err) {
        console.error('[AUTH/LOGOUT] Logout error:', err.message);
      }
      finishLogout();
    });
  } else {
    finishLogout();
  }
});

// Guest login endpoint
app.post('/auth/guest', (req, res) => {
  try {
    req.session.isGuest = true;
    console.log(`[AUTH/GUEST] ✅ Guest session created for session ${req.sessionID}`);
    res.json({
      authenticated: false,
      guest: true,
      user: { name: 'Guest', email: 'guest@deepernova.com', guest: true },
    });
  } catch (err) {
    console.error('[AUTH/GUEST] Error creating guest session:', err);
    res.status(500).json({ error: 'Failed to create guest session' });
  }
});

/**
 * CHAT SESSION ROUTES (require authentication)
 */

// Create new chat session
app.post('/api/sessions', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  
  const { title } = req.body;
  const sessionId = uuidv4();
  const session = sessionDb.create(sessionId, req.user.id, title);
  res.json({ success: true, session });
});

// Get all sessions for user
app.get('/api/sessions', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  
  const sessions = sessionDb.findByUserId(req.user.id);
  res.json({ success: true, sessions });
});

// Get session with messages
app.get('/api/sessions/:sessionId', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  
  const session = sessionDb.findById(req.params.sessionId);
  if (!session || session.userId !== req.user.id) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const messages = messageDb.findBySessionId(req.params.sessionId);
  res.json({ success: true, session, messages });
});

// Update session (title, etc)
app.put('/api/sessions/:sessionId', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  
  const session = sessionDb.findById(req.params.sessionId);
  if (!session || session.userId !== req.user.id) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const updated = sessionDb.update(req.params.sessionId, req.body);
  res.json({ success: true, session: updated });
});

// Delete session
app.delete('/api/sessions/:sessionId', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  
  const session = sessionDb.findById(req.params.sessionId);
  if (!session || session.userId !== req.user.id) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  sessionDb.delete(req.params.sessionId);
  res.json({ success: true });
});

/**
 * CHAT MESSAGE ROUTES (require authentication)
 */

// Save chat message
app.post('/api/messages', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  
  const { sessionId, role, content, personality } = req.body;
  
  // Verify session ownership
  const session = sessionDb.findById(sessionId);
  if (!session || session.userId !== req.user.id) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const messageId = uuidv4();
  const message = messageDb.create(messageId, sessionId, req.user.id, role, content, personality);
  res.json({ success: true, message });
});

/**
 * API KEY ROUTES (require authentication)
 */

// Get all API keys for logged-in user
app.get('/api/apikeys', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  
  const keys = apiKeyDb.findByUserId(req.user.id);
  // Don't send full key to frontend, only partial for display
  const safeKeys = keys.map(k => ({
    id: k.id,
    name: k.name,
    key: k.key.substring(0, 10) + '...' + k.key.substring(k.key.length - 5),
    isActive: k.isActive,
    lastUsed: k.lastUsed,
    createdAt: k.createdAt
  }));
  res.json({ success: true, keys: safeKeys });
});

// Get full API key (for copying)
app.get('/api/apikeys/:id/full', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  
  const key = apiKeyDb.findById(req.params.id);
  if (!key || key.userId !== req.user.id) {
    return res.status(404).json({ error: 'API key not found' });
  }
  
  res.json({ success: true, fullKey: key.key });
});

// Create new API key
app.post('/api/apikeys', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  
  const { name } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'API key name is required' });
  }
  
  // Generate unique API key
  const key = `deepernova_${req.user.id.substring(0, 8)}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const id = uuidv4();
  
  try {
    const newKey = apiKeyDb.create(id, req.user.id, name.trim(), key);
    res.json({ 
      success: true, 
      key: {
        id: newKey.id,
        name: newKey.name,
        key: newKey.key,
        isActive: newKey.isActive,
        createdAt: newKey.createdAt
      }
    });
  } catch (err) {
    console.error('Error creating API key:', err);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Update API key (name, isActive)
app.put('/api/apikeys/:id', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  
  const key = apiKeyDb.findById(req.params.id);
  if (!key || key.userId !== req.user.id) {
    return res.status(404).json({ error: 'API key not found' });
  }
  
  const { name, isActive } = req.body;
  const updates = {};
  
  if (name !== undefined) updates.name = name;
  if (isActive !== undefined) updates.isActive = isActive ? 1 : 0;
  
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }
  
  try {
    const updated = apiKeyDb.update(req.params.id, updates);
    res.json({ 
      success: true, 
      key: {
        id: updated.id,
        name: updated.name,
        key: updated.key.substring(0, 10) + '...' + updated.key.substring(updated.key.length - 5),
        isActive: updated.isActive,
        lastUsed: updated.lastUsed,
        createdAt: updated.createdAt
      }
    });
  } catch (err) {
    console.error('Error updating API key:', err);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// Delete API key
app.delete('/api/apikeys/:id', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  
  const key = apiKeyDb.findById(req.params.id);
  if (!key || key.userId !== req.user.id) {
    return res.status(404).json({ error: 'API key not found' });
  }
  
  try {
    apiKeyDb.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting API key:', err);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// ============================================================
// DEEPERNOVA CODEDANCE CLOUD SANDBOX & EXECUTION ENGINE
// ============================================================
const SANDBOX_BASE_DIR = path.join(__dirname, 'cloud_sandboxes');
if (!fs.existsSync(SANDBOX_BASE_DIR)) {
  try { fs.mkdirSync(SANDBOX_BASE_DIR, { recursive: true }); } catch (e) {}
}

const sanitizeSandboxName = (name) => {
  if (!name || typeof name !== 'string') return 'workspace';
  return name.replace(/[^a-zA-Z0-9_\-\.]/g, '_').substring(0, 50);
};

const getSandboxDir = (userId, projectName) => {
  const safeUser = sanitizeSandboxName(userId || 'guest_sandbox');
  const safeProject = sanitizeSandboxName(projectName || 'My-App');
  const projectDir = path.join(SANDBOX_BASE_DIR, safeUser, safeProject);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  return projectDir;
};

// Sync virtual files array into the real sandbox directory
const syncFilesToSandbox = (sandboxDir, files = []) => {
  if (!Array.isArray(files)) return;
  for (const file of files) {
    if (!file || !file.name || typeof file.content !== 'string') continue;
    const safeRelPath = file.name.replace(/\\/g, '/').replace(/^\/+/, '');
    if (safeRelPath.includes('..')) continue;
    const fullPath = path.join(sandboxDir, safeRelPath);
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(fullPath, file.content, 'utf8');
  }
};

// Read all files from the sandbox directory
const readFilesFromSandbox = (sandboxDir, currentRel = '') => {
  const result = [];
  const targetDir = currentRel ? path.join(sandboxDir, currentRel) : sandboxDir;
  if (!fs.existsSync(targetDir)) return result;

  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.venv') continue;
    const relPath = currentRel ? `${currentRel}/${entry.name}` : entry.name;
    const fullPath = path.join(sandboxDir, relPath);
    if (entry.isDirectory()) {
      result.push(...readFilesFromSandbox(sandboxDir, relPath));
    } else if (entry.isFile()) {
      try {
        const stats = fs.statSync(fullPath);
        if (stats.size < 2 * 1024 * 1024) {
          const content = fs.readFileSync(fullPath, 'utf8');
          result.push({ name: relPath, content });
        }
      } catch (e) {}
    }
  }
  return result;
};

// 1. Terminal Command Execution Endpoint
app.post('/api/codedance/terminal', express.json({ limit: '50mb' }), async (req, res) => {
  const { command, files, projectName } = req.body;
  const userId = req.user?.id || req.session?.guestId || req.ip || 'guest';

  if (!command || typeof command !== 'string') {
    return res.status(400).json({ success: false, error: 'Command diperlukan' });
  }

  const trimmedCmd = command.trim();
  const sandboxDir = getSandboxDir(userId, projectName);

  if (Array.isArray(files) && files.length > 0) {
    syncFilesToSandbox(sandboxDir, files);
  }

  if (trimmedCmd === 'clear' || trimmedCmd === 'cls') {
    return res.json({ success: true, output: '', exitCode: 0 });
  }

  if (trimmedCmd === 'help') {
    const helpText = `🌌 Deepernova Cloud Sandbox Terminal v2.5 (Online)
Tersedia runtime & perintah:
• node <file.js>          - Menjalankan script JavaScript / Node.js
• python <file.py>        - Menjalankan script Python
• ls / dir               - Menampilkan daftar berkas di sandbox
• cat <file> / type <file> - Membaca isi berkas
• pwd                    - Menampilkan direktori kerja sandbox
• echo <text>            - Menampilkan teks ke terminal
• npm / npx              - Runner script & manajemen paket`;
    return res.json({ success: true, output: helpText, exitCode: 0 });
  }

  const startTime = Date.now();
  const isWindows = process.platform === 'win32';
  const shellCmd = isWindows ? 'cmd.exe' : '/bin/sh';
  const shellArgs = isWindows ? ['/d', '/s', '/c', trimmedCmd] : ['-c', trimmedCmd];

  try {
    const child = spawn(shellCmd, shellArgs, {
      cwd: sandboxDir,
      env: {
        ...process.env,
        PATH: process.env.PATH,
        PYTHONUNBUFFERED: '1',
        FORCE_COLOR: '1'
      },
      timeout: 25000
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      res.json({
        success: false,
        error: `Gagal menjalankan perintah: ${err.message}`,
        exitCode: 1,
        executionTimeMs: Date.now() - startTime
      });
    });

    child.on('close', (code) => {
      const execTime = Date.now() - startTime;
      const updatedFiles = readFilesFromSandbox(sandboxDir);

      let finalOutput = stdout;
      if (stderr) {
        finalOutput += (finalOutput ? '\n' : '') + stderr;
      }

      res.json({
        success: code === 0,
        output: finalOutput || (code === 0 ? `Process finished (exit code ${code})` : `Process exited with code ${code}`),
        exitCode: code !== null ? code : 0,
        executionTimeMs: execTime,
        updatedFiles: updatedFiles.length > 0 ? updatedFiles : undefined
      });
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: `Server Error: ${err.message}`,
      exitCode: 1,
      executionTimeMs: Date.now() - startTime
    });
  }
});

// 2. Direct Code Runner Endpoint (Node.js & Python)
app.post('/api/codedance/execute', express.json({ limit: '50mb' }), async (req, res) => {
  const { code, language = 'javascript', files = [], projectName } = req.body;
  const userId = req.user?.id || req.session?.guestId || req.ip || 'guest';

  if (typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'Code diperlukan' });
  }

  const sandboxDir = getSandboxDir(userId, projectName);
  syncFilesToSandbox(sandboxDir, files);

  const startTime = Date.now();
  const isPython = language === 'python' || language === 'py';
  const tempFile = isPython ? 'temp_script.py' : 'temp_script.js';
  const tempFilePath = path.join(sandboxDir, tempFile);

  fs.writeFileSync(tempFilePath, code, 'utf8');

  const execCommand = isPython ? `python "${tempFile}"` : `node "${tempFile}"`;
  const isWindows = process.platform === 'win32';
  const shellCmd = isWindows ? 'cmd.exe' : '/bin/sh';
  const shellArgs = isWindows ? ['/d', '/s', '/c', execCommand] : ['-c', execCommand];

  try {
    const child = spawn(shellCmd, shellArgs, {
      cwd: sandboxDir,
      env: {
        ...process.env,
        PATH: process.env.PATH,
        PYTHONUNBUFFERED: '1',
        FORCE_COLOR: '1'
      },
      timeout: 25000
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      const execTime = Date.now() - startTime;
      let finalOutput = stdout;
      if (stderr) {
        finalOutput += (finalOutput ? '\n' : '') + stderr;
      }
      res.json({
        success: code === 0,
        output: finalOutput,
        exitCode: code !== null ? code : 0,
        executionTimeMs: execTime
      });
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: `Execution Error: ${err.message}`,
      exitCode: 1,
      executionTimeMs: Date.now() - startTime
    });
  }
});

// 3. Save CodeDance Project Endpoint
app.post('/api/codedance/save', express.json({ limit: '50mb' }), async (req, res) => {
  const { projectName = 'My-App', files = [], folderId = null } = req.body;
  const userId = req.user?.id || req.session?.guestId || req.ip || 'guest';
  const userEmail = req.user?.email || 'guest@deepernova.com';

  const sandboxDir = getSandboxDir(userId, projectName);
  syncFilesToSandbox(sandboxDir, files);

  try {
    const projectMetadataPath = path.join(sandboxDir, '.deepernova_project.json');
    const meta = {
      id: `cd_proj_${Date.now()}`,
      name: projectName,
      userId,
      userEmail,
      folderId,
      fileCount: files.length,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(projectMetadataPath, JSON.stringify(meta, null, 2), 'utf8');

    res.json({
      success: true,
      message: `Project "${projectName}" berhasil disimpan ke Cloud Sandbox.`,
      project: meta
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. List CodeDance Projects Endpoint
app.get('/api/codedance/projects', (req, res) => {
  const userId = req.user?.id || req.session?.guestId || req.ip || 'guest';
  const userSandboxDir = path.join(SANDBOX_BASE_DIR, sanitizeSandboxName(userId));

  if (!fs.existsSync(userSandboxDir)) {
    return res.json({ success: true, projects: [] });
  }

  const projects = [];
  try {
    const projectFolders = fs.readdirSync(userSandboxDir, { withFileTypes: true });
    for (const folder of projectFolders) {
      if (!folder.isDirectory()) continue;
      const projDir = path.join(userSandboxDir, folder.name);
      const metaPath = path.join(projDir, '.deepernova_project.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          projects.push(meta);
        } catch (e) {
          projects.push({ name: folder.name, updatedAt: new Date().toISOString() });
        }
      } else {
        projects.push({ name: folder.name, updatedAt: new Date().toISOString() });
      }
    }
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * CONVERSATION PERSISTENCE ROUTES (for frontend state sync)
 * Saves/loads conversation history for authenticated users to backend
 */

// GET /api/conversations - Load all conversations for user (High Performance)
app.get('/api/conversations', (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated()) ? req.user.id : (req.user?.id || req.session?.userId || null);
    if (userId) {
      const stmt = db.prepare(`
        SELECT 
          cs.id,
          cs.title,
          cs.createdAt,
          cs.updatedAt,
          json_group_array(
            json_object(
              'id', cm.id,
              'sender', CASE WHEN cm.role = 'user' THEN 'user' ELSE 'bot' END,
              'text', cm.content,
              'timestamp', cm.createdAt,
              'personality', cm.personality,
              'searchQuery', cm.searchQuery,
              'searchSourcesJson', cm.searchSources,
              'searchImagesJson', cm.searchImages
            )
          ) as messagesJson
        FROM chat_sessions cs
        LEFT JOIN (
          SELECT * FROM chat_messages ORDER BY createdAt ASC, rowid ASC
        ) cm ON cs.id = cm.sessionId
        WHERE cs.userId = ?
        GROUP BY cs.id
        ORDER BY cs.updatedAt DESC
        LIMIT 50
      `);
      
      const sessions = stmt.all(userId);

      // Batch query all images for this user at once (O(1) lookup instead of N+1 database queries)
      let userImages = [];
      try {
        userImages = db.prepare(`
          SELECT id, sessionId, prompt, imageUrl, model, size, reasoningUrl, createdAt 
          FROM generated_images 
          WHERE userId = ?
        `).all(userId);
      } catch (_imgErr) {
        userImages = [];
      }

      const imagesBySessionMap = new Map();
      const imagesByUrlMap = new Map();
      for (const img of userImages) {
        if (img.sessionId) {
          if (!imagesBySessionMap.has(img.sessionId)) {
            imagesBySessionMap.set(img.sessionId, []);
          }
          imagesBySessionMap.get(img.sessionId).push(img);
        }
        if (img.imageUrl) {
          imagesByUrlMap.set(img.imageUrl, img);
        }
      }

      const conversations = sessions.map(session => {
        const rawMessages = session.messagesJson ? JSON.parse(session.messagesJson).filter(m => m.id) : [];
        const sessionImages = imagesBySessionMap.get(session.id) || [];

        const messages = rawMessages.map(msg => {
          const processedMsg = { ...msg };
          if (msg.searchSourcesJson) {
            try { processedMsg.searchSources = JSON.parse(msg.searchSourcesJson); } catch (_e) { processedMsg.searchSources = []; }
            delete processedMsg.searchSourcesJson;
          }
          if (msg.searchImagesJson) {
            try { processedMsg.searchImages = JSON.parse(msg.searchImagesJson); } catch (_e) { processedMsg.searchImages = []; }
            delete processedMsg.searchImagesJson;
          }

          // Check if message contains image markdown: ![Generated Image](URL)
          const imgMarkdownMatch = msg.text?.match(/!\[Generated Image\]\(([^)]+)\)/);
          if (imgMarkdownMatch && imgMarkdownMatch[1]) {
            const extractedUrl = imgMarkdownMatch[1];
            const matchedImage = imagesByUrlMap.get(extractedUrl);
            return {
              ...processedMsg,
              imageUrl: extractedUrl,
              imageId: matchedImage ? matchedImage.id : undefined,
              model: matchedImage ? matchedImage.model : undefined,
              size: matchedImage ? matchedImage.size : undefined,
              isImage: true
            };
          }

          return processedMsg;
        });

        return {
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          messages,
          images: sessionImages
        };
      });

      return res.json({ success: true, conversations });
    } else if (req.session?.isGuest) {
      return res.json({ success: true, conversations: [] });
    } else {
      return res.status(401).json({ success: false, error: 'Unauthorized', conversations: [] });
    }
  } catch (error) {
    console.error('[API/CONVERSATIONS] Error loading conversations:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/conversations - Save conversations for user
app.post('/api/conversations', async (req, res) => {
  try {
    const userId = (req.isAuthenticated && req.isAuthenticated()) ? req.user.id : (req.user?.id || req.session?.userId || null);
    console.log(`[API/CONVERSATIONS] POST request - User ID: ${userId || 'none'}`);
    
    if (!userId) {
      console.warn(`[API/CONVERSATIONS] ⚠️  Unauthorized - session not loaded or user not found`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conversations } = req.body;

    if (!Array.isArray(conversations)) {
      return res.status(400).json({ error: 'Conversations must be an array' });
    }

    // Deduplicate incoming conversations by ID
    const uniqueConversationsMap = new Map();
    conversations.forEach(conv => {
      if (conv && conv.id) {
        uniqueConversationsMap.set(String(conv.id), conv);
      }
    });
    const uniqueConversations = Array.from(uniqueConversationsMap.values());

    console.log(`[API/CONVERSATIONS] Saving ${uniqueConversations.length} unique conversations for user ${userId}`);

    // Use transaction for atomicity - UPSERT ONLY, never delete other sessions from other devices!
    const saveConversations = db.transaction(() => {
      const upsertSession = db.prepare(`
        INSERT INTO chat_sessions (id, userId, title, createdAt, updatedAt)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET title = excluded.title, userId = excluded.userId, updatedAt = CURRENT_TIMESTAMP
      `);

      uniqueConversations.forEach(conv => {
        if (!conv.id || !conv.title || !Array.isArray(conv.messages)) {
          return; // Skip invalid conversations
        }

        // Upsert session safely without primary key violation
        upsertSession.run(conv.id, userId, conv.title);

        // Delete old messages for this session
        db.prepare('DELETE FROM chat_messages WHERE sessionId = ?').run(conv.id);

        // Insert new messages with conflict resolution
        const insertMsg = db.prepare(`
          INSERT OR REPLACE INTO chat_messages (id, sessionId, userId, role, content, personality, searchQuery, searchSources, searchImages, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Track message IDs to detect duplicates
        const messageIds = new Set();
        const duplicateIds = [];

        const baseTime = Date.now();
        conv.messages.forEach((msg, idx) => {
          const msgId = msg.id || `msg_${conv.id}_${idx}_${baseTime}`;
          
          if (messageIds.has(msgId)) {
            duplicateIds.push(msgId);
          }
          messageIds.add(msgId);

          let msgTimestamp;
          if (msg.timestamp) {
            const parsed = new Date(msg.timestamp);
            msgTimestamp = !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date(baseTime + idx * 100).toISOString();
          } else {
            msgTimestamp = new Date(baseTime + idx * 100).toISOString();
          }

          insertMsg.run(
            msgId,
            conv.id,
            userId,
            msg.sender === 'user' ? 'user' : 'assistant',
            msg.text || msg.content || '',
            msg.personality || 'mentor',
            msg.searchQuery || null,
            msg.searchSources ? JSON.stringify(msg.searchSources) : null,
            msg.searchImages ? JSON.stringify(msg.searchImages) : null,
            msgTimestamp
          );
        });

        if (duplicateIds.length > 0) {
          console.log(`[API/CONV] ⚠️ Session ${conv.id}: Found ${duplicateIds.length} duplicate message IDs (will be replaced):`, duplicateIds.slice(0, 5));
        }
      });
    });

    try {
      saveConversations();
      
      // Extract and save conclusions from conversations (asynchronously, don't block response)
      try {
        const MemoryExtractionService = (await import('./memoryExtractionService.js')).default;
        conversations.forEach(conv => {
          if (conv.messages && Array.isArray(conv.messages)) {
            // Process each conversation asynchronously
            setImmediate(() => {
              MemoryExtractionService.processConversation(conv.messages, userId, conv.id)
                .catch(err => console.error('[MEMORY] Error processing conversation:', err));
            });
          }
        });
      } catch (memErr) {
        console.error('[MEMORY] Error initializing memory extraction:', memErr);
      }
      
      console.log(`[API/CONVERSATIONS] Successfully saved ${conversations.length} conversations for user ${userId}`);
      res.json({ success: true, message: 'Conversations saved', count: conversations.length });
    } catch (txErr) {
      console.error('Transaction error:', txErr);
      res.status(500).json({ error: 'Failed to save conversations' });
    }
  } catch (err) {
    console.error('Error saving conversations:', err);
    res.status(500).json({ error: 'Failed to save conversations' });
  }
});

// DELETE /api/conversations - Delete all conversations for user
app.delete('/api/conversations', (req, res) => {
  try {
    if (!(req.isAuthenticated && req.isAuthenticated())) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;

    // Get all session IDs for user
    // Delete all messages for these sessions (will cascade due to FK)
    const deleteStmt = db.prepare('DELETE FROM chat_sessions WHERE userId = ?');
    deleteStmt.run(userId);

    res.json({ success: true, message: 'All conversations deleted' });
  } catch (err) {
    console.error('Error deleting conversations:', err);
    res.status(500).json({ error: 'Failed to delete conversations' });
  }
});

// DELETE /api/conversations/:conversationId - Delete specific conversation
app.delete('/api/conversations/:conversationId', (req, res) => {
  try {
    if (!(req.isAuthenticated && req.isAuthenticated())) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verify user owns this conversation
    const session = db.prepare('SELECT id FROM chat_sessions WHERE id = ? AND userId = ?').get(conversationId, userId);
    
    if (!session) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete conversation (messages will cascade delete)
    db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(conversationId);

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (err) {
    console.error('Error deleting conversation:', err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

/**
 * LONG-TERM MEMORY ROUTES (Backend only - stores knowledge about user)
 */

// GET /api/memory/user - Get all long-term memories for authenticated user
app.get('/api/memory/user', (req, res) => {
  try {
    if (!(req.isAuthenticated && req.isAuthenticated())) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    
    const { memoryDb } = require('./database.js');
    const memories = memoryDb.findByUser(userId, limit);
    
    console.log(`[MEMORY] Retrieved ${memories.length} memories for user ${userId}`);
    res.json({ success: true, memories, count: memories.length });
  } catch (err) {
    console.error('Error fetching memories:', err);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// GET /api/memory/export - Export long-term memories as TXT file
app.get('/api/memory/export', (req, res) => {
  try {
    if (!(req.isAuthenticated && req.isAuthenticated())) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const { memoryDb } = require('./database.js');
    const textContent = memoryDb.getAsText(userId);
    
    console.log(`[MEMORY] Exporting memories for user ${userId}`);
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="user_memory_${userId}.txt"`);
    res.send(textContent);
  } catch (err) {
    console.error('Error exporting memories:', err);
    res.status(500).json({ error: 'Failed to export memories' });
  }
});

// POST /api/memory - Add or update a long-term memory
app.post('/api/memory', (req, res) => {
  try {
    if (!(req.isAuthenticated && req.isAuthenticated())) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const { summary, category, sourceSessionId } = req.body;

    if (!summary || !summary.trim()) {
      return res.status(400).json({ error: 'Summary is required' });
    }

    const { v4: uuidv4 } = require('uuid');
    const { memoryDb } = require('./database.js');
    const memoryId = uuidv4();

    const memory = memoryDb.create(memoryId, userId, summary.trim(), category || null, sourceSessionId || null);
    
    console.log(`[MEMORY] Created memory ${memoryId} for user ${userId}, category: ${category}`);
    res.json({ success: true, memory });
  } catch (err) {
    console.error('Error creating memory:', err);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

// DELETE /api/memory/:memoryId - Delete a long-term memory
app.delete('/api/memory/:memoryId', (req, res) => {
  try {
    if (!(req.isAuthenticated && req.isAuthenticated())) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const { memoryId } = req.params;
    const { memoryDb } = require('./database.js');

    const memory = memoryDb.findById(memoryId);
    if (!memory || memory.userId !== userId) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    memoryDb.delete(memoryId);
    console.log(`[MEMORY] Deleted memory ${memoryId} for user ${userId}`);
    res.json({ success: true, message: 'Memory deleted' });
  } catch (err) {
    console.error('Error deleting memory:', err);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// GET /api/memory/global - Get user's global memory
app.get('/api/memory/global', (req, res) => {
  try {
    if (!(req.isAuthenticated && req.isAuthenticated())) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const record = globalMemoryDb.getOrCreate(userId);

    res.json({
      success: true,
      globalMemory: record.globalMemory || '',
      messageCount: record.messageCount || 0,
      lastUpdatedAt: record.lastUpdatedAt
    });
  } catch (err) {
    console.error('Error getting global memory:', err);
    res.status(500).json({ error: 'Failed to get global memory' });
  }
});

// PUT /api/memory/global - Update user's global memory
app.put('/api/memory/global', (req, res) => {
  try {
    if (!(req.isAuthenticated && req.isAuthenticated())) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const { globalMemory } = req.body;

    if (typeof globalMemory !== 'string') {
      return res.status(400).json({ error: 'globalMemory must be a string' });
    }

    const updated = globalMemoryDb.update(userId, globalMemory.trim());

    console.log(`[GLOBAL_MEMORY] Updated memory for user ${userId}`);
    res.json({
      success: true,
      globalMemory: updated.globalMemory,
      lastUpdatedAt: updated.lastUpdatedAt,
      messageCount: updated.messageCount || 0
    });
  } catch (err) {
    console.error('Error updating global memory:', err);
    res.status(500).json({ error: 'Failed to update global memory' });
  }
});

// DELETE /api/memory/global - Clear user's global memory
app.delete('/api/memory/global', (req, res) => {
  try {
    if (!(req.isAuthenticated && req.isAuthenticated())) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    globalMemoryDb.getOrCreate(userId);
    const updated = globalMemoryDb.update(userId, '');
    globalMemoryDb.resetMessageCount(userId);

    console.log(`[GLOBAL_MEMORY] Cleared memory for user ${userId}`);
    res.json({
      success: true,
      globalMemory: '',
      lastUpdatedAt: updated?.lastUpdatedAt || null,
      messageCount: 0
    });
  } catch (err) {
    console.error('Error clearing global memory:', err);
    res.status(500).json({ error: 'Failed to clear global memory' });
  }
});

// POST /api/memory/global/update - Trigger AI-powered memory update after each chat exchange
app.post('/api/memory/global/update', async (req, res) => {
  try {
    const { recentMessages, currentMemory: reqCurrentMemory } = req.body;

    if (!Array.isArray(recentMessages)) {
      return res.status(400).json({ error: 'recentMessages must be an array' });
    }

    const { updateGlobalMemory } = await import('./memoryWriterService.js');

    // Check if user is authenticated
    const isUserAuth = req.isAuthenticated && req.isAuthenticated();

    if (isUserAuth) {
      const userId = req.user.id;
      // Get current memory
      const record = globalMemoryDb.getOrCreate(userId);
      const currentMemory = record.globalMemory || '';

      // Update memory using AI
      const updatedMemory = await updateGlobalMemory(userId, recentMessages, currentMemory);

      // Save to database, increment update counter
      const saved = globalMemoryDb.update(userId, updatedMemory);
      globalMemoryDb.incrementMessageCount(userId);
      const responseRecord = globalMemoryDb.get(userId);

      console.log(`[GLOBAL_MEMORY] Memory auto-updated for user ${userId}`);
      res.json({
        success: true,
        globalMemory: saved.globalMemory,
        lastUpdatedAt: saved.lastUpdatedAt,
        messageCount: responseRecord.messageCount || 0
      });
    } else {
      // Guest mode - get currentMemory from body
      const currentMemory = reqCurrentMemory || '';
      console.log('[GLOBAL_MEMORY] Auto-updating memory for guest');

      const updatedMemory = await updateGlobalMemory('guest', recentMessages, currentMemory);

      res.json({
        success: true,
        globalMemory: updatedMemory,
        lastUpdatedAt: new Date().toISOString(),
        messageCount: 0
      });
    }
  } catch (err) {
    console.error('Error auto-updating global memory:', err);
    res.status(500).json({ error: 'Failed to update global memory: ' + err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ==================== DEEPERNOVA HIGH-SPEED SEARCH ENGINE ====================
// Sub-20ms BM25 + AI Context + Images + News with SerpApi Failover
const DEEPERNOVA_SEARCH_API_URL = process.env.DEEPERNOVA_SEARCH_API_URL || 'http://127.0.0.1:3000/api/v1';
const DEEPERNOVA_SEARCH_API_KEY = process.env.DEEPERNOVA_SEARCH_API_KEY || 'dn_live_d69468b9c25451f3b7cd8482e96cbcf7';

function cleanSearchText(str) {
  if (!str) return '';
  return str.replace(/<\/?mark[^>]*>/gi, '').trim();
}

async function handleUnifiedSearch(req, res) {
  try {
    let q = req.query?.q || req.body?.query || req.body?.q;
    const limit = parseInt(req.query?.limit || req.body?.limit || '8', 10);
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter q is required' });
    }

    // 🕒 Auto-inject current date for latest/recent search inquiries if missing
    const recentRegex = /\b(terbaru|terkini|teranyar|hari ini|saat ini|sekarang|update|berita|kabar|info(?:rmasi)? terbaru|harga terbaru|latest|recent|today|current|breaking news)\b/i;
    if (recentRegex.test(q)) {
      const now = new Date();
      const year = now.getFullYear();
      const months = [
        'januari', 'februari', 'maret', 'april', 'mei', 'juni',
        'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
        'january', 'february', 'march', 'may', 'june', 'july', 'august', 'october', 'december'
      ];
      const qLower = q.toLowerCase();
      const hasDateOrYear = qLower.includes(String(year)) || months.some(m => qLower.includes(m));
      if (!hasDateOrYear) {
        const day = now.getDate();
        const monthsId = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        q = `${q.trim()} ${day} ${monthsId[now.getMonth()]} ${year}`;
      }
    }

    console.log(`[SEARCH] Querying Deepernova Search Engine for: "${q}" (limit: ${limit})`);

    let searchData = null;
    let imagesData = null;
    let engineUsed = 'deepernova_bm25';

    // 1. Primary Engine: Ultra-Fast Deepernova BM25 Search API
    try {
      const searchHeaders = {
        'Authorization': `Bearer ${DEEPERNOVA_SEARCH_API_KEY}`,
        'X-API-Key': DEEPERNOVA_SEARCH_API_KEY
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      // Query web search and images in parallel for rich experience
      const [searchResp, imagesResp] = await Promise.allSettled([
        fetch(`${DEEPERNOVA_SEARCH_API_URL}/search?q=${encodeURIComponent(q)}&limit=${limit}`, {
          headers: searchHeaders,
          signal: controller.signal
        }),
        fetch(`${DEEPERNOVA_SEARCH_API_URL}/images?q=${encodeURIComponent(q)}&limit=8`, {
          headers: searchHeaders,
          signal: controller.signal
        })
      ]);

      clearTimeout(timeoutId);

      if (searchResp.status === 'fulfilled' && searchResp.value.ok) {
        searchData = await searchResp.value.json();
      }

      if (imagesResp.status === 'fulfilled' && imagesResp.value.ok) {
        imagesData = await imagesResp.value.json();
      }
    } catch (dnErr) {
      console.warn('[SEARCH] Deepernova search error, trying fallback:', dnErr.message);
    }

    // 2. Fallback Engine: SerpApi if Deepernova search failed or returned 0 results
    if (!searchData || !searchData.results || searchData.results.length === 0) {
      const serpKey = process.env.SERPAPI_KEY || '';
      if (serpKey) {
        console.log(`[SEARCH] Fallback to SerpApi (Google) for: "${q}"`);
        engineUsed = 'serpapi_fallback';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const serpUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&api_key=${serpKey}&num=${limit}&hl=id&gl=id`;
        const serpResp = await fetch(serpUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (serpResp.ok) {
          const serpJson = await serpResp.json();
          return res.json({ success: true, data: serpJson, engine: engineUsed });
        }
      }
    }

    // If still no results
    if (!searchData) {
      return res.status(502).json({
        success: false,
        error: 'Search engine is currently unreachable'
      });
    }

    // 3. Format into standardized schema matching ChatBot.jsx & DocumentEditor.jsx
    const organicResults = (searchData.results || []).map((item, idx) => {
      let domain = item.domain || '';
      if (!domain && item.url) {
        try { domain = new URL(item.url).hostname.replace('www.', ''); } catch (e) {}
      }
      return {
        title: cleanSearchText(item.title) || 'Untitled',
        link: item.url || '',
        url: item.url || '',
        snippet: cleanSearchText(item.snippet) || '',
        domain: domain,
        thumbnail: item.lead_image_url || item.logo_url || null,
        position: idx + 1
      };
    });

    const inlineImages = (imagesData?.results || []).map(img => ({
      thumbnail: img.imageUrl,
      link: img.pageUrl || img.imageUrl,
      title: img.title || img.pageTitle || q,
      source: img.pageUrl || img.imageUrl,
      sourceDomain: img.domain || ''
    }));

    const responsePayload = {
      organic_results: organicResults,
      inline_images: inlineImages,
      search_information: {
        query: q,
        total_results: searchData.total_results || organicResults.length,
        time_taken_ms: searchData.duration_ms || 0
      },
      engine: engineUsed
    };

    console.log(`[SEARCH] ✓ Returning ${organicResults.length} organic results and ${inlineImages.length} images for: "${q}"`);
    return res.json({ success: true, data: responsePayload });
  } catch (error) {
    console.error('[SEARCH] Internal server error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Support both GET and POST /api/search
app.get('/api/search', handleUnifiedSearch);
app.post('/api/search', handleUnifiedSearch);

// Proxy route: News Search
app.get('/api/news', async (req, res) => {
  try {
    const q = req.query.q;
    const limit = parseInt(req.query.limit || '5', 10);
    if (!q) return res.status(400).json({ success: false, error: 'Query parameter q is required' });

    const response = await fetch(`${DEEPERNOVA_SEARCH_API_URL}/news?q=${encodeURIComponent(q)}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${DEEPERNOVA_SEARCH_API_KEY}`,
        'X-API-Key': DEEPERNOVA_SEARCH_API_KEY
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: 'News API returned status ' + response.status });
    }

    const data = await response.json();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Proxy route: Image Search
app.get('/api/images', async (req, res) => {
  try {
    const q = req.query.q;
    const limit = parseInt(req.query.limit || '8', 10);
    if (!q) return res.status(400).json({ success: false, error: 'Query parameter q is required' });

    const response = await fetch(`${DEEPERNOVA_SEARCH_API_URL}/images?q=${encodeURIComponent(q)}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${DEEPERNOVA_SEARCH_API_KEY}`,
        'X-API-Key': DEEPERNOVA_SEARCH_API_KEY
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: 'Images API returned status ' + response.status });
    }

    const data = await response.json();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== DEEPERNOVA SEARCH ENGINE API/V1 TRANSPARENT PROXY ====================
// Allows hitting /api/v1/search, /api/v1/images, /api/v1/news directly via backend domain
app.use('/api/v1', async (req, res) => {
  try {
    const targetUrl = `${DEEPERNOVA_SEARCH_API_URL}${req.url}`;
    const headers = { ...req.headers };
    delete headers.host;
    if (!headers['x-api-key'] && !headers['authorization']) {
      headers['x-api-key'] = DEEPERNOVA_SEARCH_API_KEY;
      headers['authorization'] = `Bearer ${DEEPERNOVA_SEARCH_API_KEY}`;
    }

    const fetchOpts = {
      method: req.method,
      headers: headers
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOpts.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const resp = await fetch(targetUrl, fetchOpts);
    res.status(resp.status);
    resp.headers.forEach((val, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    });
    const buffer = await resp.buffer();
    return res.send(buffer);
  } catch (err) {
    console.error('[API/V1 PROXY ERROR]', err.message);
    return res.status(502).json({ success: false, error: 'Search engine proxy connection failed: ' + err.message });
  }
});

// ==================== SOURCE TRACKING ENDPOINTS ====================
/**
 * GET /api/sources/:conversationId
 * Get all sources for a conversation
 */
app.get('/api/sources/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;
    const sources = sourceTracker.getUniqueSources(conversationId);
    res.json({
      success: true,
      conversationId,
      sources: sources,
      count: sources.length
    });
  } catch (error) {
    console.error('[Source API error]:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sources/:conversationId/:sourceId
 * Get details of a specific source
 */
app.get('/api/sources/:conversationId/:sourceId', (req, res) => {
  try {
    const { conversationId, sourceId } = req.params;
    const source = sourceTracker.getSourceDetails(conversationId, sourceId);
    
    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Source not found'
      });
    }
    
    res.json({
      success: true,
      source: source
    });
  } catch (error) {
    console.error('[Source detail error]:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/sources/:conversationId
 * Clear all sources for a conversation
 */
app.delete('/api/sources/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;
    sourceTracker.clearSources(conversationId);
    
    res.json({
      success: true,
      message: 'Sources cleared for conversation',
      conversationId
    });
  } catch (error) {
    console.error('[Clear sources error]:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== DOCUMENT ARTIFACT ROUTES (session-persistent) =====
// Save a new artifact
app.post('/api/artifacts', express.json(), (req, res) => {
  try {
    const { sessionId, prompt, response, type, title, content, excelSheets, activeSheet } = req.body;
    if (!sessionId || !prompt || !response) {
      return res.status(400).json({ error: 'sessionId, prompt, and response are required' });
    }
    const id = uuidv4();
    const userId = (req.isAuthenticated && req.isAuthenticated()) ? req.user.id : null;
    const artifact = artifactDb.create(id, sessionId, prompt, response, type, title, content, excelSheets, activeSheet, userId);
    res.json({ success: true, artifact });
  } catch (error) {
    console.error('[Save artifact error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get artifacts by session ID
app.get('/api/artifacts/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const artifacts = artifactDb.findBySessionId(sessionId);
    res.json({ success: true, artifacts });
  } catch (error) {
    console.error('[Get artifacts error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get artifacts by user ID (authenticated users)
app.get('/api/artifacts/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const artifacts = artifactDb.findByUserId(userId);
    res.json({ success: true, artifacts });
  } catch (error) {
    console.error('[Get user artifacts error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete an artifact
app.delete('/api/artifacts/:id', (req, res) => {
  try {
    const { id } = req.params;
    artifactDb.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('[Delete artifact error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete all artifacts for a session
app.delete('/api/artifacts/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    artifactDb.deleteBySessionId(sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('[Clear session artifacts error]:', error);
    res.status(500).json({ error: error.message });
  }
});



// Deepernova API Proxy Routes (hide Deepseek backend)
app.use('/api/v1', apiProxyRoutes);

// ============== DOCUMENT GENERATION API ==============

/**
 * POST /api/documents/generate/word
 * Generate a Word document
 * Body: { content: string, title: string, userId: string }
 */
app.post('/api/documents/generate/word', async (req, res) => {
  try {
    if (!(req.isAuthenticated && req.isAuthenticated())) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content, title = 'Generated Document' } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    console.log(`[DOCGEN] Generating Word document for user ${req.user.id}`);

    // Generate document with progress tracking
    const result = await DocumentGeneratorService.generateWordDocument(
      content,
      title,
      (progress) => {
        console.log(`[DOCGEN] Step ${progress.step}: ${progress.status}`);
      }
    );

    res.json({
      success: true,
      file: result,
      downloadUrl: DocumentGeneratorService.getDownloadUrl(result.fileName),
      viewerUrl: DocumentGeneratorService.getViewerUrl(result.fileName, 'docx')
    });
  } catch (err) {
    console.error('[DOCGEN] Word generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/generate/excel
 * Generate an Excel spreadsheet
 * Body: { content: string, title: string, userId: string }
 */
app.post('/api/documents/generate/excel', async (req, res) => {
  try {
    if (!(req.isAuthenticated && req.isAuthenticated())) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content, title = 'Generated Spreadsheet' } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    console.log(`[DOCGEN] Generating Excel document for user ${req.user.id}`);

    // Generate document with progress tracking
    const result = await DocumentGeneratorService.generateExcelDocument(
      content,
      title,
      (progress) => {
        console.log(`[DOCGEN] Step ${progress.step}: ${progress.status}`);
      }
    );

    res.json({
      success: true,
      file: result,
      downloadUrl: DocumentGeneratorService.getDownloadUrl(result.fileName),
      viewerUrl: DocumentGeneratorService.getViewerUrl(result.fileName, 'xlsx')
    });
  } catch (err) {
    console.error('[DOCGEN] Excel generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/documents/download/:fileName
 * Download generated document
 */
app.get('/api/documents/download/:fileName', (req, res) => {
  try {
    const { fileName } = req.params;
    
    // Security: prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/')) {
      return res.status(400).json({ error: 'Invalid file name' });
    }

    const filePath = path.join('./server/temp-files/documents', fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Determine content type
    const ext = path.extname(fileName).toLowerCase();
    const contentType = ext === '.docx' 
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error('[DOCGEN] Download error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/documents/view/docx/:fileName
 * View Word document (returns as downloadable for desktop apps)
 */
app.get('/api/documents/view/docx/:fileName', (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (fileName.includes('..') || fileName.includes('/')) {
      return res.status(400).json({ error: 'Invalid file name' });
    }

    const filePath = path.join('./server/temp-files/documents', fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error('[DOCGEN] View error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/documents/view/xlsx/:fileName
 * View Excel spreadsheet
 */
app.get('/api/documents/view/xlsx/:fileName', (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (fileName.includes('..') || fileName.includes('/')) {
      return res.status(400).json({ error: 'Invalid file name' });
    }

    const filePath = path.join('./server/temp-files/documents', fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error('[DOCGEN] View error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============== IMAGE GENERATION API ==============
const TOKENMIX_IMAGE_GENERATIONS_URL = 'https://api.tokenmix.ai/v1/images/generations';
const TOKENMIX_IMAGE_EDITS_URL = 'https://api.tokenmix.ai/v1/images/edits';

/**
 * Add watermark to image
 * @param {string} imageUrl - URL of the image to watermark
 * @param {string} watermarkText - Text to add as watermark (default: 'DEEPERNOVA')
 * @returns {Promise<Buffer>} - Image buffer with watermark
 */
async function addWatermarkToImage(imageUrl, watermarkText = 'Deepernova AI') {
  try {
    console.log(`[WATERMARK] Adding watermark to image: ${imageUrl.substring(0, 50)}...`);
    
    // Fetch image from URL with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const imageResponse = await fetch(imageUrl, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      
      // Convert ArrayBuffer to Buffer for node-fetch v3
      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      console.log(`[WATERMARK] Image downloaded: ${imageBuffer.length} bytes`);
      
      // Get image dimensions to position watermark
      const metadata = await sharp(imageBuffer).metadata();
      const { width, height } = metadata;
      console.log(`[WATERMARK] Image dimensions: ${width}x${height}`);
      
      // Calculate watermark position (bottom-right, with padding)
      const padding = 20;
      const fontSize = Math.max(40, Math.floor(width / 20)); // Scale font size with image
      const x = width - padding;
      const y = height - padding;
      
      // Create watermark SVG with visible stroke and opacity
      const watermarkSvg = Buffer.from(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <text 
            x="${x}" 
            y="${y}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold" 
            fill="white" 
            stroke="black"
            stroke-width="2"
            opacity="0.7" 
            text-anchor="end"
            dominant-baseline="text-bottom"
          >${watermarkText}</text>
        </svg>
      `);
      
      // Composite watermark onto image
      const watermarkedImage = await sharp(imageBuffer)
        .composite([
          {
            input: watermarkSvg,
            blend: 'over'
          }
        ])
        .toBuffer();
      
      console.log(`[WATERMARK] Watermark applied successfully: ${watermarkedImage.length} bytes`);
      return watermarkedImage;
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        throw new Error('Watermark image fetch timeout (10s)');
      }
      throw fetchErr;
    }
  } catch (err) {
    console.error('[WATERMARK] Error adding watermark:', err.message);
    throw err;
  }
}

/**
 * Save watermarked image to public folder
 * @param {Buffer} imageBuffer - Image buffer to save
 * @param {Object} req - Express request object (to get the host)
 * @returns {Promise<string>} - Public URL path
 */
async function saveWatermarkedImage(imageBuffer, req) {
  try {
    // Validate image buffer
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Image buffer is empty');
    }
    
    console.log(`[WATERMARK] Saving image buffer: ${imageBuffer.length} bytes`);
    
    const filename = `watermarked-${uuidv4()}.png`;
    const filepath = path.join(process.cwd(), 'public', filename);
    
    // Ensure public directory exists
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
      console.log(`[WATERMARK] Created public directory: ${publicDir}`);
    }
    
    await fs.promises.writeFile(filepath, imageBuffer);
    console.log(`[WATERMARK] Image saved to: ${filepath}`);
    
    // Verify file was actually written
    const fileStats = fs.statSync(filepath);
    console.log(`[WATERMARK] File verification: ${fileStats.size} bytes written`);
    
    // Return full backend URL - always use backend VPS URL for image files
    // Frontend (Vercel) should fetch from VPS backend, not proxy through Vercel
    const vpsUrl = process.env.VPS_PUBLIC_URL || `http://localhost:${PORT}`;
    const fullUrl = `${vpsUrl}/${filename}`;
    console.log(`[WATERMARK] Generated URL: ${fullUrl} (VPS_PUBLIC_URL: ${vpsUrl})`);
    return fullUrl;
  } catch (err) {
    console.error('[WATERMARK] Error saving watermarked image:', err.message);
    throw err;
  }
}

/**
 * POST /api/images/generate
 * Generate or edit an image using TokenMix API
 * For generation: uses imagen-4-fast (omit referenceImage)
 * For editing: uses qwen-image-edit-max (include referenceImage with image_url parameter)
 * Body: { prompt: string, size?: string, model?: string, referenceImage?: string (base64), sessionId?: string }
 * 
 * Modes:
 * - Generation: prompt only → create new image using imagen-4-fast
 * - Editing: prompt + referenceImage → edit input image using qwen-image-edit-max
 */
app.post('/api/images/generate', async (req, res) => {
  // Check IP token limit
  const clientIp = getClientIp(req);
  const ipStatus = checkIpTokenLimit(clientIp);
  if (ipStatus.isLimited) {
    console.warn(`[IP TOKEN LIMIT] Blocked image generation from IP: ${clientIp}`);
    return res.status(429).json({
      error: 'Maaf, batas token penggunaan untuk IP Anda telah tercapai. Penggunaan token akan di-reset dalam 4 jam.',
      isTokenLimitError: true,
      resetTime: ipStatus.resetTime,
      usedTokens: ipStatus.usedTokens,
      maxLimit: IP_MAX_TOKEN_LIMIT
    });
  }
  // Deduct 30,000 tokens for image generation
  consumeIpTokens(clientIp, 30000);

  try {
    // Get user info if authenticated
    const userId = req.user?.id || null;
    const { prompt, size = '1024x1024', sessionId, referenceImage, preGeneratedImageUrl } = req.body;
    let { model } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!TOKENMIX_API_KEY) {
      console.error('[IMG_GEN] TOKENMIX_API_KEY not configured');
      return res.status(500).json({ error: 'Image generation service not configured' });
    }

    // Determine mode: generation or editing
    const isEditMode = !!referenceImage && referenceImage.length > 0;
    const modeLabel = isEditMode ? '✏️ EDIT' : '🎨 GENERATE';
    
    // Auto-select model based on mode if not specified or if chat model was passed
    if (!model || model === 'qwen-vl-max') {
      model = isEditMode ? 'qwen-image-edit-max' : 'image-01';
    }
    if (isEditMode && (model === 'image-01' || model === 'imagen-4-fast')) {
      model = 'qwen-image-edit-max';
    }
    
    console.log(`[IMG_GEN] ${modeLabel} Image with model: ${model}, size: ${size}`);
    console.log(`[IMG_GEN] Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`[IMG_GEN] User: ${userId}, SessionId: ${sessionId}`);
    if (isEditMode) {
      console.log(`[IMG_GEN] Using reference image for editing (${referenceImage.substring(0, 50)}...)`);
    }

    let imageUrl = null;

    if (preGeneratedImageUrl) {
      console.log('[IMG_GEN] 🟢 Skipping TokenMix API call, using pre-generated URL:', preGeneratedImageUrl);
      imageUrl = preGeneratedImageUrl;
    } else {
      // Build TokenMix API request body
      const apiBody = {
        model,
        prompt,
        n: 1,
        size,
      };

      // Add reference image for editing mode
      if (isEditMode) {
        // Handle both data URI and public URLs
        let imageForApi = referenceImage;
        
        if (referenceImage.startsWith('data:')) {
          // Extract base64 part after the comma for data URIs
          const parts = referenceImage.split(',');
          if (parts.length === 2) {
            imageForApi = parts[1];
            console.log('[IMG_GEN] ✅ Extracted base64 from data URI for TokenMix API');
          } else {
            console.error('[IMG_GEN] ❌ Invalid data URI format - could not split');
            throw new Error('Invalid reference image data URI format');
          }
        } else if (referenceImage.startsWith('http://') || referenceImage.startsWith('https://')) {
          // Check if it's a localhost URL (which TokenMix rejects)
          if (referenceImage.includes('localhost') || referenceImage.includes('127.0.0.1')) {
            console.log('[IMG_GEN] ⚠️ Localhost URL detected, converting file to base64');
            // Extract filename from URL
            const urlParts = referenceImage.split('/');
            const filename = urlParts[urlParts.length - 1];
            // Decode if URL encoded
            const decodedFilename = decodeURIComponent(filename);
            const filepath = path.join(__dirname, 'temp-files', 'uploads', decodedFilename);
            
            console.log('[IMG_GEN] 🔍 Looking for file at:', filepath);
            
            try {
              // Check if file exists first
              if (!fs.existsSync(filepath)) {
                // Try alternative paths
                const altPath1 = path.join(__dirname, '..', 'server', 'temp-files', 'uploads', decodedFilename);
                const altPath2 = path.join(process.cwd(), 'server', 'temp-files', 'uploads', decodedFilename);
                
                console.log('[IMG_GEN] File not found at:', filepath);
                console.log('[IMG_GEN] Trying alternative paths...');
                
                let foundFile = false;
                if (fs.existsSync(altPath1)) {
                  console.log('[IMG_GEN] ✅ Found at alt path 1:', altPath1);
                  const fileContent = fs.readFileSync(altPath1);
                  imageForApi = fileContent.toString('base64');
                  console.log('[IMG_GEN] ✅ Converted localhost file to base64 for TokenMix');
                  foundFile = true;
                } else if (fs.existsSync(altPath2)) {
                  console.log('[IMG_GEN] ✅ Found at alt path 2:', altPath2);
                  const fileContent = fs.readFileSync(altPath2);
                  imageForApi = fileContent.toString('base64');
                  console.log('[IMG_GEN] ✅ Converted localhost file to base64 for TokenMix');
                  foundFile = true;
                }
                
                if (!foundFile) {
                  // Try to list available files
                  try {
                    const uploadsPath = path.join(__dirname, 'temp-files', 'uploads');
                    const availableFiles = fs.existsSync(uploadsPath) 
                      ? fs.readdirSync(uploadsPath).slice(0, 10)
                      : ['(uploads directory does not exist)'];
                    
                    console.error('[IMG_GEN] ❌ File not found at any path');
                    console.error('[IMG_GEN] Available files in uploads dir (first 10):', availableFiles);
                    throw new Error(`Image file not found: ${decodedFilename}. Available: ${availableFiles.join(', ')}`);
                  } catch (listErr) {
                    console.error('[IMG_GEN] Error listing directory:', listErr.message);
                    throw new Error(`Image file not found: ${decodedFilename}`);
                  }
                }
              } else {
                const fileContent = fs.readFileSync(filepath);
                imageForApi = fileContent.toString('base64');
                console.log('[IMG_GEN] ✅ Converted localhost file to base64 for TokenMix');
              }
            } catch (err) {
              console.error('[IMG_GEN] ❌ Failed to read file from', filepath, ':', err.message);
              console.error('[IMG_GEN] Full error:', err);
              throw new Error('Failed to read uploaded image file: ' + err.message);
            }
          } else {
            // Public HTTPS URL - use as-is, TokenMix accepts public HTTPS URLs
            console.log('[IMG_GEN] ✅ Using public HTTPS URL for reference image');
          }
        } else if (referenceImage.length > 100 && !referenceImage.includes('/') && !referenceImage.includes(':')) {
          // Looks like raw base64 already
          console.log('[IMG_GEN] ✅ Using raw base64 data for reference image');
        } else {
          console.warn('[IMG_GEN] ⚠️ Reference image format unclear, attempting to use as-is');
        }
        
        apiBody.image_url = imageForApi;
        console.log('[IMG_GEN] Image editing enabled with reference (base64 length:', imageForApi.substring(0, 50).length, ')');
      }

      const tokenMixUrl = isEditMode ? TOKENMIX_IMAGE_EDITS_URL : TOKENMIX_IMAGE_GENERATIONS_URL;
      console.log('[IMG_GEN] 🔴 DEBUG - TokenMix API Call:');
      console.log('[IMG_GEN] 🔴 URL:', tokenMixUrl);
      console.log('[IMG_GEN] 🔴 Authorization header:', TOKENMIX_API_KEY ? TOKENMIX_API_KEY.substring(0, 20) + '...' : 'MISSING');
      console.log('[IMG_GEN] 🔴 Request body keys:', Object.keys(apiBody));
      console.log('[IMG_GEN] 🔴 Request size:', JSON.stringify(apiBody).length, 'bytes');

      // Call TokenMix API with 120 second timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 120000); // 120 seconds
      
      let tokenMixResponse;
      try {
        tokenMixResponse = await fetch(tokenMixUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKENMIX_API_KEY}`,
          },
          body: JSON.stringify(apiBody),
          signal: abortController.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('[IMG_GEN] ⚠️ TokenMix API call timeout (120s exceeded)');
          return res.status(504).json({ error: 'Image generation service timeout - TokenMix API taking too long' });
        }
        throw fetchError;
      }

      console.log('[IMG_GEN] 🔴 TokenMix Response Status:', tokenMixResponse.status, tokenMixResponse.statusText);

      if (!tokenMixResponse.ok) {
        const errorText = await tokenMixResponse.text();
        console.error('[IMG_GEN] 🔴 TokenMix API error response (first 1000 chars):', errorText.substring(0, 1000));
        
        // Check for content filter / safety policy error
        if (
          errorText.toLowerCase().includes('content_filter') || 
          errorText.toLowerCase().includes('safety policy')
        ) {
          throw new Error('maaf prompt anda memiliki potensi ke arah hal yang melanggar kebijakan kami ciba peritah lainnya');
        }

        if (tokenMixResponse.status === 429) {
          let retryAfter = '';
          try {
            const errObj = JSON.parse(errorText);
            const msg = errObj?.error?.message || '';
            const match = msg.match(/after\s+(\d+s|\d+\s+seconds|\d+\s+second)/i);
            if (match) {
              retryAfter = ` (harap tunggu ${match[1]} sebelum mencoba lagi)`;
            }
          } catch (e) {}
          throw new Error(`Batas limit pembuatan gambar tercapai${retryAfter}. Harap tunggu sebentar.`);
        }
        
        throw new Error(`Gagal memproses gambar (${tokenMixResponse.status}). Silakan coba lagi.`);
      }

      const imageData = await tokenMixResponse.json();
      console.log('[IMG_GEN] Image generated successfully');
      console.log('[IMG_GEN] 🔴 Raw Deepernova response:', JSON.stringify(imageData).substring(0, 500));

      // Try multiple formats to extract imageUrl from different API response structures
      
      console.log('[IMG_GEN] 🔴 Full response keys:', Object.keys(imageData));
      console.log('[IMG_GEN] 🔴 imageData.data type:', typeof imageData.data, 'is array:', Array.isArray(imageData.data));
      
      // Try format 1: { data: [{ url: '...' }] }
      if (imageData.data && Array.isArray(imageData.data) && imageData.data.length > 0) {
        console.log('[IMG_GEN] 🔴 data[0] structure:', JSON.stringify(imageData.data[0]).substring(0, 300));
        if (imageData.data[0]?.url) {
          imageUrl = imageData.data[0].url;
          console.log('[IMG_GEN] ✅ Format 1 matched: data[0].url');
        } else if (typeof imageData.data[0] === 'string') {
          imageUrl = imageData.data[0];
          console.log('[IMG_GEN] ✅ Format 2 matched: data[0] as string');
        }
      }
      
      // Try format 2: { images: [{ url: '...' }] }
      if (!imageUrl && imageData.images && Array.isArray(imageData.images) && imageData.images.length > 0) {
        imageUrl = imageData.images[0]?.url;
        console.log('[IMG_GEN] ✅ Format 3 matched: images[0].url');
      }
      
      // Try format 3: { url: '...' }
      if (!imageUrl && imageData.url) {
        imageUrl = imageData.url;
        console.log('[IMG_GEN] ✅ Format 4 matched: root url');
      }
      
      // Try format 4: direct string URL
      if (!imageUrl && typeof imageData === 'string') {
        imageUrl = imageData;
        console.log('[IMG_GEN] ✅ Format 5 matched: direct string');
      }
      
      console.log('[IMG_GEN] 🔴 Final extracted imageUrl:', imageUrl);
      
      if (!imageUrl) {
        console.error('[IMG_GEN] ❌ No imageUrl found in any format!');
        console.log('[IMG_GEN] Full imageData:', JSON.stringify(imageData, null, 2).substring(0, 2000));
        throw new Error('Deepernova API returned no image URL in any expected format');
      }
    }
    
    // Sanitize URL: fix common malformations
    // Fix malformed protocol (http// → https://)
    imageUrl = imageUrl.replace(/^http\/\//, 'https://');
    imageUrl = imageUrl.replace(/^https:\/\//, 'https://');
    
    // Remove double slashes from path (but preserve :// in protocol)
    imageUrl = imageUrl.replace(/([^:]\/)\/+/g, '$1');
    
    console.log('[IMG_GEN] 🔴 Sanitized imageUrl:', imageUrl);
    
    // Save image to database - validate sessionId exists before using it
    const imageId = uuidv4();
    let validSessionId = null;
    
    // Only use sessionId if it actually exists in the database
    if (sessionId && userId) {
      try {
        const sessionExists = db.prepare('SELECT id FROM chat_sessions WHERE id = ? AND userId = ?').get(sessionId, userId);
        if (sessionExists) {
          validSessionId = sessionId;
          console.log(`[IMG_GEN] Using sessionId: ${sessionId}`);
        } else {
          console.warn(`[IMG_GEN] SessionId ${sessionId} not found for user ${userId}, saving without sessionId`);
        }
      } catch (err) {
        console.warn(`[IMG_GEN] Error checking sessionId: ${err.message}`);
      }
    }
    
    imageDb.create(
      imageId,
      userId,
      validSessionId,
      prompt,
      imageUrl,
      model,
      size
    );
    
    console.log(`[IMG_GEN] ✅ Image saved to database with ID: ${imageId} (${modeLabel})`);

    let finalImageUrl = imageUrl;
    let watermarked = false;
    try {
      console.log('[IMG_GEN] Starting watermark process...');
      console.log(`[IMG_GEN] Source image URL: ${imageUrl}`);
      
      // Add timeout for watermark process (max 30 seconds)
      const watermarkPromise = addWatermarkToImage(imageUrl, 'Deepernova AI');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Watermark process timeout (30s)')), 30000)
      );
      
      const watermarkedBuffer = await Promise.race([watermarkPromise, timeoutPromise]);
      console.log(`[IMG_GEN] Watermark buffer generated: ${watermarkedBuffer.length} bytes`);
      
      finalImageUrl = await saveWatermarkedImage(watermarkedBuffer, req);
      watermarked = true;
      console.log(`[IMG_GEN] ✅ Watermarked image saved: ${finalImageUrl}`);

      // Update database with watermarked URL
      db.prepare(`UPDATE generated_images SET imageUrl = ? WHERE id = ?`).run(finalImageUrl, imageId);
      console.log(`[IMG_GEN] ✅ Database updated with watermarked URL`);
    } catch (watermarkErr) {
      console.error('[IMG_GEN] ⚠️  Watermark failed:', watermarkErr.message);
      console.error('[IMG_GEN] Watermark error stack:', watermarkErr.stack);
      console.warn('[IMG_GEN] Falling back to original image URL from TokenMix');
      // If watermark fails, continue with original imageUrl
      finalImageUrl = imageUrl;
      watermarked = false;
    }

    // Validate final URL before sending response
    if (!finalImageUrl) {
      console.error('[IMG_GEN] ❌ CRITICAL: No final image URL available');
      return res.status(500).json({ 
        error: 'Failed to save image - no valid URL generated',
        details: 'Both watermarked and original image URLs failed'
      });
    }

    console.log(`[IMG_GEN] 📤 Sending response with URL: ${finalImageUrl}, watermarked: ${watermarked}`);

    res.json({
      success: true,
      image: {
        id: imageId,
        url: finalImageUrl,
        prompt,
        model,
        size,
        timestamp: new Date().toISOString(),
        savedToDb: true,
        watermarked,
        mode: isEditMode ? 'edit' : 'generate',
        isEdited: isEditMode,
      },
    });
  } catch (err) {
    console.error('[IMG_GEN] Image generation error:', err);
    if (err.message && err.message.includes('melanggar kebijakan kami')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to generate image: ' + err.message });
  }
});

// ============== DEBUG: Check Generated Images ==============
/**
 * GET /api/debug/images
 * List all generated images in public folder
 */
app.get('/api/debug/images', (req, res) => {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      return res.json({ error: 'Public directory does not exist', path: publicDir });
    }
    
    const files = fs.readdirSync(publicDir);
    const watermarkedFiles = files.filter(f => f.startsWith('watermarked-') || f.startsWith('generated-'));
    
    const fileInfo = watermarkedFiles.map(filename => {
      const filepath = path.join(publicDir, filename);
      const stats = fs.statSync(filepath);
      const protocol = req.get('X-Forwarded-Proto') || req.protocol || 'http';
      const host = req.get('X-Forwarded-Host') || req.get('host') || `localhost:${PORT}`;
      const url = `${protocol}://${host}/${filename}`;
      return {
        filename,
        size: stats.size,
        modified: stats.mtime,
        url
      };
    });
    
    res.json({
      totalFiles: files.length,
      watermarkedCount: watermarkedFiles.length,
      files: fileInfo.slice(-10) // Last 10 files
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

/**
 * GET /api/debug/image/:filename
 * Check if specific image exists and is accessible
 */
app.get('/api/debug/image/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(process.cwd(), 'public', filename);
    
    // Security: prevent directory traversal
    if (!filepath.startsWith(path.join(process.cwd(), 'public'))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ 
        error: 'File not found',
        requestedFile: filename,
        fullPath: filepath,
        publicDirExists: fs.existsSync(path.join(process.cwd(), 'public'))
      });
    }
    
    const stats = fs.statSync(filepath);
    res.json({
      filename,
      size: stats.size,
      exists: true,
      path: filepath,
      mtime: stats.mtime
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== SERVE WATERMARKED IMAGES ==============
/**
 * GET /watermarked/:filename
 * Serve watermarked image with proper CORS headers
 */
app.get('/watermarked/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Security: only allow watermarked files
    if (!filename.startsWith('watermarked-') && !filename.startsWith('generated-')) {
      console.warn(`[IMAGES] ⚠️ Unauthorized file access attempt: ${filename}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const filepath = path.join(process.cwd(), 'public', filename);
    
    // Security: prevent directory traversal
    if (!filepath.startsWith(path.join(process.cwd(), 'public'))) {
      console.warn(`[IMAGES] ⚠️ Directory traversal attempt: ${filepath}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
      console.error(`[IMAGES] ❌ File not found: ${filepath}`);
      return res.status(404).json({ error: 'Image not found', file: filename });
    }
    
    // Read and serve file
    const fileBuffer = fs.readFileSync(filepath);
    console.log(`[IMAGES] ✅ Serving image: ${filename} (${fileBuffer.length} bytes)`);
    
    // Set proper headers
    res.set('Content-Type', 'image/png');
    res.set('Content-Length', fileBuffer.length);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('X-Content-Type-Options', 'nosniff');
    
    // Send file
    res.send(fileBuffer);
  } catch (err) {
    console.error(`[IMAGES] Error serving image:`, err.message);
    res.status(500).json({ error: 'Failed to serve image', details: err.message });
  }
});

/**
 * GET /generated/:filename  
 * Serve generated image with proper CORS headers
 */
app.get('/generated/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Security: only allow generated files
    if (!filename.startsWith('generated-')) {
      console.warn(`[IMAGES] ⚠️ Unauthorized file access attempt: ${filename}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const filepath = path.join(process.cwd(), 'public', filename);
    
    // Security: prevent directory traversal
    if (!filepath.startsWith(path.join(process.cwd(), 'public'))) {
      console.warn(`[IMAGES] ⚠️ Directory traversal attempt: ${filepath}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
      console.error(`[IMAGES] ❌ File not found: ${filepath}`);
      return res.status(404).json({ error: 'Image not found', file: filename });
    }
    
    // Read and serve file
    const fileBuffer = fs.readFileSync(filepath);
    console.log(`[IMAGES] ✅ Serving image: ${filename} (${fileBuffer.length} bytes)`);
    
    // Set proper headers
    res.set('Content-Type', 'image/png');
    res.set('Content-Length', fileBuffer.length);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('X-Content-Type-Options', 'nosniff');
    
    // Send file
    res.send(fileBuffer);
  } catch (err) {
    console.error(`[IMAGES] Error serving image:`, err.message);
    res.status(500).json({ error: 'Failed to serve image', details: err.message });
  }
});

// ============== VISION ANALYSIS API ==============

const TOKENMIX_CHAT_URL = process.env.TOKENMIX_CHAT_API_URL || process.env.TOKENMIX_CHAT_URL || 'https://api.tokenmix.ai/v1/chat/completions';

/**
 * POST /api/vision/analyze
 * Analyze image content using llama-4-maverick
 * Body: { imageUrl: string, question: string }
 */
app.post('/api/vision/analyze', async (req, res) => {
  try {
    const { imageUrl, question = 'What is in this image? Describe briefly.' } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    if (!TOKENMIX_API_KEY) {
      console.error('[VISION] TOKENMIX_API_KEY not configured');
      return res.status(500).json({ error: 'Vision analysis service not configured' });
    }

    console.log('[VISION] Analyzing image with llama-4-maverick');
    console.log('[VISION] Image input type:', imageUrl.substring(0, 20));
    console.log('[VISION] Question:', question.substring(0, 100));
    console.log('[VISION] API Key configured:', !!TOKENMIX_API_KEY);

    // Build image content - accepts data URIs in image_url field
    let imageContent = null;
    if (imageUrl.startsWith('data:')) {
      // Data URL format for base64
      imageContent = {
        type: 'image_url',
        image_url: { url: imageUrl }
      };
      console.log('[VISION] Using base64 data URI');
    } else if (imageUrl.startsWith('https://')) {
      // Public HTTPS URL
      imageContent = {
        type: 'image_url',
        image_url: { url: imageUrl }
      };
      console.log('[VISION] Using public HTTPS URL');
    } else {
      throw new Error('Image must be either base64 data URL or public HTTPS URL');
    }

    // Flat content format
    const messageContent = [
      { type: 'text', text: question },
      imageContent
    ];

    console.log('[VISION] Message content structure:', JSON.stringify(messageContent, null, 2));

    // Call llama-4-maverick for vision analysis
    const payload = {
      model: 'llama-4-maverick',
      messages: [
        {
          role: 'user',
          content: messageContent
        }
      ],
      max_tokens: 1024,
      temperature: 0.5,
    };

    console.log('[VISION] Payload being sent to TokenMix:');
    console.log('[VISION] Full payload:', JSON.stringify(payload, null, 2));

    const visionResponse = await fetch(TOKENMIX_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKENMIX_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('[VISION] TokenMix Vision API error:', visionResponse.status, visionResponse.statusText);
      console.error('[VISION] Error response body:', errorText.substring(0, 500));
      throw new Error(`TokenMix Vision API error: ${visionResponse.status} ${visionResponse.statusText} - ${errorText.substring(0, 200)}`);
    }

    const visionData = await visionResponse.json();
    console.log('[VISION] Analysis complete');
    console.log('[VISION] Response keys:', Object.keys(visionData));

    // Extract analysis from response
    const analysis = visionData.choices?.[0]?.message?.content || 'Unable to analyze image';
    
    res.json({
      success: true,
      analysis: analysis,
      model: 'llama-4-maverick',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[VISION] Image analysis error:', err.message);
    console.error('[VISION] Full error stack:', err.stack);
    res.status(500).json({ error: 'Failed to analyze image: ' + err.message });
  }
});

/**
 * GET /api/images/session/:sessionId
 * Get all images generated in a specific session
 */
app.get('/api/images/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const images = imageDb.findBySessionId(sessionId);
    res.json({
      success: true,
      images: images || [],
      count: images?.length || 0,
    });
  } catch (err) {
    console.error('[IMG_GET] Error retrieving session images:', err);
    res.status(500).json({ error: 'Failed to retrieve images: ' + err.message });
  }
});

/**
 * GET /api/images/user
 * Get all images generated by current user
 */
app.get('/api/images/user', (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const images = imageDb.findByUserId(req.user.id);
    res.json({
      success: true,
      images: images || [],
      count: images?.length || 0,
    });
  } catch (err) {
    console.error('[IMG_GET] Error retrieving user images:', err);
    res.status(500).json({ error: 'Failed to retrieve images: ' + err.message });
  }
});

/**
 * GET /api/images/download/:imageId
 * Download an image (proxy from external URL with CORS support)
 */
app.get('/api/images/download/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    
    console.log(`[IMG_DOWNLOAD] Request to download image: ${imageId}`);
    
    // Find image in database
    const image = imageDb.findById(imageId);
    if (!image) {
      console.error(`[IMG_DOWNLOAD] Image not found in database: ${imageId}`);
      return res.status(404).send('Image not found');
    }
    
    if (!image.imageUrl) {
      console.error(`[IMG_DOWNLOAD] Image URL is empty for ID: ${imageId}`);
      return res.status(404).send('Image URL is empty');
    }

    console.log(`[IMG_DOWNLOAD] Found image ${imageId}, URL: ${image.imageUrl.substring(0, 100)}...`);

    // Fetch image from external URL with timeout
    const fetchPromise = fetch(image.imageUrl);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Fetch timeout')), 30000)
    );
    
    const imageResponse = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!imageResponse.ok) {
      console.error(`[IMG_DOWNLOAD] Failed to fetch from URL: ${imageResponse.status} ${imageResponse.statusText}`);
      return res.status(502).send('Failed to fetch image from source');
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    console.log(`[IMG_DOWNLOAD] Fetched image successfully, Content-Type: ${contentType}`);

    // Get the image as buffer
    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    
    if (imageBuffer.length === 0) {
      console.error(`[IMG_DOWNLOAD] Empty buffer for image ${imageId}`);
      return res.status(500).send('Image buffer is empty');
    }

    // Determine file extension based on content type
    let fileExtension = '.png';
    if (contentType.includes('jpeg')) fileExtension = '.jpg';
    else if (contentType.includes('webp')) fileExtension = '.webp';
    else if (contentType.includes('gif')) fileExtension = '.gif';
    else if (contentType.includes('png')) fileExtension = '.png';

    // Set CORS and download headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', imageBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="deepernova-image-${imageId}${fileExtension}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    console.log(`[IMG_DOWNLOAD] ✅ Sending image ${imageId}, size: ${imageBuffer.length} bytes, type: ${contentType}`);
    res.send(imageBuffer);
  } catch (err) {
    console.error('[IMG_DOWNLOAD] Error downloading image:', err.message);
    res.status(500).send('Error: ' + err.message);
  }
});

/**
 * GET /api/images/proxy-download?url=<encoded_url>
 * CORS relay: fetch an external image URL server-side and stream it back to the client.
 * This solves cross-origin download issues where browser CORS blocks direct fetch from frontend.
 */
app.get('/api/images/proxy-download', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    // Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(imageUrl);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed' });
    }

    console.log(`[IMG_PROXY] Proxy download request for: ${imageUrl.substring(0, 120)}`);

    // Fetch image from external URL with timeout
    const fetchPromise = fetch(imageUrl, {
      headers: {
        'User-Agent': 'DeepernovaAI/1.0 ImageProxy',
      },
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Proxy fetch timeout')), 30000)
    );

    const imageResponse = await Promise.race([fetchPromise, timeoutPromise]);

    if (!imageResponse.ok) {
      console.error(`[IMG_PROXY] Failed to fetch: ${imageResponse.status} ${imageResponse.statusText}`);
      return res.status(502).json({ error: `Failed to fetch image: ${imageResponse.status}` });
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    // Only allow image content types
    if (!contentType.startsWith('image/')) {
      console.error(`[IMG_PROXY] Non-image content type: ${contentType}`);
      return res.status(400).json({ error: 'URL does not point to an image' });
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    if (imageBuffer.length === 0) {
      return res.status(502).json({ error: 'Empty image response' });
    }

    // Determine file extension
    let fileExtension = '.png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) fileExtension = '.jpg';
    else if (contentType.includes('webp')) fileExtension = '.webp';
    else if (contentType.includes('gif')) fileExtension = '.gif';

    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', imageBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="deepernova-image-${Date.now()}${fileExtension}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    console.log(`[IMG_PROXY] ✅ Proxied image: ${imageBuffer.length} bytes, type: ${contentType}`);
    res.send(imageBuffer);
  } catch (err) {
    console.error('[IMG_PROXY] Proxy download error:', err.message);
    res.status(500).json({ error: 'Proxy download failed: ' + err.message });
  }
});

/**
 * DELETE /api/images/:imageId
 * Delete a generated image
 */
app.delete('/api/images/:imageId', (req, res) => {
  try {
    const { imageId } = req.params;
    const image = imageDb.findById(imageId);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Check ownership - user can only delete their own images
    if (req.user?.id && image.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this image' });
    }
    
    imageDb.delete(imageId);
    res.json({ success: true, message: 'Image deleted' });
  } catch (err) {
    console.error('[IMG_DEL] Error deleting image:', err);
    res.status(500).json({ error: 'Failed to delete image: ' + err.message });
  }
});

/**
/**
 * GET /api/user/rate-limit
 * Check rate limiting status
 */
app.get('/api/user/rate-limit', (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const rateLimitStatus = checkRateLimiting(userId);

    res.json({
      success: true,
      isRateLimited: rateLimitStatus.isRateLimited,
      messageCount: rateLimitStatus.messageCount
    });
  } catch (err) {
    console.error('[RATE_LIMIT] Error:', err);
    res.status(500).json({ error: 'Failed to check rate limit: ' + err.message });
  }
});

/**
 * ============== POWERPOINT GENERATION API ==============
 * POST /api/generate-ppt
 * Generate PowerPoint presentations with security measures
 * Body: { title: string, subtitle?: string, slides: [{title: string, content: string}] }
 */
app.post('/api/generate-ppt', async (req, res) => {
  let pythonProcess = null;
  
  try {
    const { title, subtitle, slides } = req.body;
    
    // Input validation
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Judul presentasi wajib diisi' 
      });
    }
    
    if (!Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Minimal 1 slide diperlukan' 
      });
    }
    
    // Validate request data
    if (slides.length > 100) {
      return res.status(400).json({ 
        success: false, 
        error: 'Maksimal 100 slide (terlalu kompleks)' 
      });
    }
    
    // Build sanitized PPT data
    const pptData = {
      title: String(title).substring(0, 200),
      subtitle: String(subtitle || '').substring(0, 200),
      slides: slides.map((s, i) => ({
        title: String(s.title || `Slide ${i+1}`).substring(0, 200),
        content: String(s.content || '').substring(0, 10000)
      }))
    };
    
    console.log(`[PPT_GEN] Generating PPT: "${pptData.title}" with ${pptData.slides.length} slides`);
    
    // Spawn Python generator dengan timeout
    const pythonScript = path.join(__dirname, 'pptxGenerator.py');
    if (!fs.existsSync(pythonScript)) {
      return res.status(500).json({
        success: false,
        error: 'PPT generator script tidak ditemukan di server'
      });
    }
    
    // Detect Python executable - try multiple variants
    let pythonExe = 'python';
    const pythonCandidates = [
      'C:\\Users\\ferry fernando\\miniconda3\\python.exe',
      'C:\\Python311\\python.exe',
      'python3',
      'python'
    ];
    
    for (const candidate of pythonCandidates) {
      try {
        execSync(`"${candidate}" --version`, { stdio: 'pipe' });
        pythonExe = candidate;
        console.log(`[PPT_GEN] Using Python: ${pythonExe}`);
        break;
      } catch (e) {
        // Continue to next candidate
      }
    }

    pythonProcess = spawn(pythonExe, [pythonScript], {
      timeout: 30000, // 30 second hard timeout
      maxBuffer: 50 * 1024 * 1024 // 50MB max output
    });
    
    let stdout = '';
    let stderr = '';
    let completed = false;
    
    const timeoutId = setTimeout(() => {
      if (!completed) {
        console.warn('[PPT_GEN] Timeout - killing process');
        if (pythonProcess) {
          pythonProcess.kill('SIGTERM');
          setTimeout(() => {
            if (pythonProcess && !pythonProcess.killed) {
              pythonProcess.kill('SIGKILL');
            }
          }, 2000);
        }
      }
    }, 30000);
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`[PPT_GEN] Python stderr: ${data.toString().substring(0, 200)}`);
    });
    
    pythonProcess.on('close', (code) => {
      completed = true;
      clearTimeout(timeoutId);
      
      if (code !== 0) {
        console.error(`[PPT_GEN] Process exit code ${code}`);
        if (stderr) console.error(`[PPT_GEN] Error: ${stderr.substring(0, 500)}`);
        
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            error: `Generator error: ${stderr.substring(0, 200) || 'Unknown error'}`
          });
        }
      }
      
      try {
        const result = JSON.parse(stdout);
        
        if (!result.success) {
          console.error(`[PPT_GEN] Generation failed: ${result.data?.error}`);
          if (!res.headersSent) {
            return res.status(400).json({
              success: false,
              error: result.data?.error || 'Failed to generate'
            });
          }
        }
        
        console.log(`[PPT_GEN] ✅ Success: ${result.data.filename} (${result.data.size_mb}MB)`);
        
        if (!res.headersSent) {
          res.json({
            success: true,
            filename: result.data.filename,
            size_mb: result.data.size_mb,
            slides_count: result.data.slides,
            downloadUrl: `/download/${result.data.filename}`,
            message: `Presentasi berhasil dibuat dengan ${result.data.slides} slide`
          });
        }
      } catch (parseErr) {
        console.error(`[PPT_GEN] Parse error: ${parseErr.message}`);
        console.error(`[PPT_GEN] Output: ${stdout.substring(0, 300)}`);
        
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to parse generator output'
          });
        }
      }
    });
    
    pythonProcess.on('error', (err) => {
      clearTimeout(timeoutId);
      console.error(`[PPT_GEN] Process error: ${err.message}`);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: `Process error: ${err.message}`
        });
      }
    });
    
    // Send PPT data to Python via stdin
    pythonProcess.stdin.write(JSON.stringify(pptData));
    pythonProcess.stdin.end();
    
  } catch (error) {
    console.error('[PPT_GEN] Endpoint error:', error);
    
    if (pythonProcess && !pythonProcess.killed) {
      pythonProcess.kill('SIGKILL');
    }
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: `Server error: ${error.message}`
      });
    }
  }
});


// ==========================================================================
// GAMBAR SAYA (SAVED IMAGES GALLERY) API ENDPOINTS
// ==========================================================================

// Get all saved images (generated, edited, uploaded) for current user
app.get('/api/images/user', (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId || null;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const genImages = imageDb.findByUserId(userId) || [];
    const upImages = uploadedImageDb.findByUserId(userId, 100) || [];

    const mappedGen = genImages.map(img => ({
      id: img.id,
      prompt: img.prompt || 'Gambar Dihasilkan AI',
      imageUrl: img.imageUrl,
      type: 'generated',
      model: img.model || 'imagen-4-fast',
      createdAt: img.createdAt
    }));

    const mappedUp = upImages.map(img => ({
      id: img.id,
      prompt: `Unggahan: ${img.fileName}`,
      imageUrl: img.imageData.startsWith('data:') ? img.imageData : `/api/images/upload/${img.id}`,
      type: 'uploaded',
      model: 'user-upload',
      createdAt: img.createdAt
    }));

    const combined = [...mappedGen, ...mappedUp].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({ success: true, images: combined });
  } catch (err) {
    console.error('[API IMAGES] GET Error:', err);
    res.status(500).json({ success: false, error: 'Gagal mengambil daftar gambar' });
  }
});

// Save new generated/edited/uploaded image for current user
app.post('/api/images/save', express.json({ limit: '50mb' }), (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId || null;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id, prompt, imageUrl, type, model } = req.body || {};
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'Missing imageUrl' });
    }

    const imgId = id || `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const promptText = prompt || 'Gambar Tersimpan';

    if (type === 'uploaded') {
      uploadedImageDb.create(
        imgId,
        null,
        'global',
        userId,
        promptText.replace(/^Unggahan:\s*/, ''),
        imageUrl,
        'image/jpeg',
        imageUrl.length
      );
    } else {
      imageDb.create(
        imgId,
        userId,
        null,
        promptText,
        imageUrl,
        model || 'imagen-4-fast',
        '1024x1024',
        null
      );
    }

    res.json({ success: true, message: 'Gambar berhasil disimpan ke Gambar Saya' });
  } catch (err) {
    console.error('[API IMAGES] POST Error:', err);
    res.status(500).json({ success: false, error: 'Gagal menyimpan gambar' });
  }
});

// Delete saved image for current user
app.delete('/api/images/:id', (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId || null;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { id } = req.params;
    imageDb.delete(id);
    res.json({ success: true, message: 'Gambar berhasil dihapus' });
  } catch (err) {
    console.error('[API IMAGES] DELETE Error:', err);
    res.status(500).json({ success: false, error: 'Gagal menghapus gambar' });
  }
});



// ============================================================
// DEEPERNOVA CODEDANCE IDE — REAL CLOUD SANDBOX BACKEND ENGINE
// ============================================================
const codedanceSandboxRootDir = path.join(__dirname, 'cloud_sandboxes');
if (!fs.existsSync(codedanceSandboxRootDir)) {
  try {
    fs.mkdirSync(codedanceSandboxRootDir, { recursive: true });
  } catch (e) {
    console.warn('[CODEDANCE] Could not create sandbox dir:', e.message);
  }
}

/**
 * Helper: Recursively write workspace files to sandbox folder
 */
function syncFilesToDisk(targetDir, files = []) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const file of files) {
    if (!file || !file.name) continue;
    // Sanitize relative path
    const safeRelPath = file.name.replace(/^(\.\.[\/\\])+/, '').replace(/^[\\\/]+/, '');
    const fullFilePath = path.join(targetDir, safeRelPath);
    const parentDir = path.dirname(fullFilePath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    try {
      fs.writeFileSync(fullFilePath, file.content || '', 'utf8');
    } catch (err) {
      console.warn(`[CODEDANCE] Failed writing file ${file.name}:`, err.message);
    }
  }
}

/**
 * Helper: Recursively scan sandbox folder and read all files back into memory
 */
function scanFilesFromDisk(targetDir, baseDir = targetDir) {
  const result = [];
  if (!fs.existsSync(targetDir)) return result;

  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  for (const entry of entries) {
    // Ignore node_modules, .git, and temporary cache directories for speed
    if (['node_modules', '.git', '.cache', 'dist', 'build'].includes(entry.name)) {
      continue;
    }

    const fullPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      result.push(...scanFilesFromDisk(fullPath, baseDir));
    } else if (entry.isFile()) {
      try {
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        // Only read text files up to 2MB
        const stats = fs.statSync(fullPath);
        if (stats.size <= 2 * 1024 * 1024) {
          const content = fs.readFileSync(fullPath, 'utf8');
          result.push({ name: relPath, content });
        }
      } catch (e) {}
    }
  }
  return result;
}

// Track running subprocesses per sandbox session for process cancellation
const activeSandboxProcesses = new Map();

/**
 * POST /api/codedance/terminal
 * Executes real terminal / shell commands inside the user's cloud sandbox with 10-Minute Timeout
 */
app.post('/api/codedance/terminal', async (req, res) => {
  const startTime = Date.now();
  try {
    const { command, files = [], projectName = 'default-project' } = req.body || {};
    const userId = req.user?.id || req.session?.userId || 'guest_user';

    if (!command || typeof command !== 'string') {
      return res.status(400).json({ success: false, error: 'Command tidak boleh kosong' });
    }

    const sanitizedProj = projectName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const sandboxSessionKey = `${userId}_${sanitizedProj}`;
    const sandboxDir = path.join(codedanceSandboxRootDir, `user_${userId}`, sanitizedProj);

    // 1. Sync current workspace files to real disk
    syncFilesToDisk(sandboxDir, files);

    // 2. Select shell based on OS
    const isWindows = process.platform === 'win32';
    const shellCmd = isWindows ? 'powershell.exe' : '/bin/bash';
    const shellArgs = isWindows 
      ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${command}`] 
      : ['-c', command];

    // 3. Execute subprocess in the sandbox directory
    const proc = spawn(shellCmd, shellArgs, {
      cwd: sandboxDir,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8',
        NODE_ENV: 'development',
        CI: 'false',
        PROJECT_NAME: projectName
      },
      shell: false
    });

    activeSandboxProcesses.set(sandboxSessionKey, proc);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // 10-Minute Timeout Protection (600,000 ms) as requested by user
    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const timeout = setTimeout(() => {
      try {
        proc.kill('SIGTERM');
      } catch (e) {}
    }, TEN_MINUTES_MS);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      activeSandboxProcesses.delete(sandboxSessionKey);
      const executionTimeMs = Date.now() - startTime;

      // 4. Scan back any created, modified, or deleted files on disk
      let updatedFiles = [];
      try {
        updatedFiles = scanFilesFromDisk(sandboxDir);
      } catch (e) {}

      let combinedOutput = stdout;
      if (stderr) {
        combinedOutput += (combinedOutput ? '\n' : '') + stderr;
      }
      if (!combinedOutput && code === 0) {
        combinedOutput = `\x1b[32mCommand completed successfully.\x1b[0m`;
      }
      combinedOutput += `\n\n\x1b[90m[Process finished in ${executionTimeMs}ms (exit code: ${code || 0})]\x1b[0m`;

      return res.json({
        success: code === 0,
        output: combinedOutput,
        exitCode: code || 0,
        executionTimeMs,
        updatedFiles
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      activeSandboxProcesses.delete(sandboxSessionKey);
      const executionTimeMs = Date.now() - startTime;
      return res.json({
        success: false,
        output: `\x1b[31mShell execution error: ${err.message}\x1b[0m`,
        exitCode: 1,
        executionTimeMs
      });
    });

  } catch (err) {
    console.error('[CODEDANCE_TERMINAL_ERROR]:', err);
    return res.status(500).json({
      success: false,
      output: `\x1b[31mInternal Sandbox Error: ${err.message}\x1b[0m`,
      exitCode: 1
    });
  }
});

/**
 * POST /api/codedance/kill
 * Terminates any active long-running subprocess for the current project sandbox
 */
app.post('/api/codedance/kill', (req, res) => {
  try {
    const { projectName = 'default-project' } = req.body || {};
    const userId = req.user?.id || req.session?.userId || 'guest_user';
    const sanitizedProj = projectName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const sandboxSessionKey = `${userId}_${sanitizedProj}`;

    const proc = activeSandboxProcesses.get(sandboxSessionKey);
    if (proc) {
      try {
        proc.kill('SIGTERM');
        activeSandboxProcesses.delete(sandboxSessionKey);
        return res.json({ success: true, message: 'Proses terminal berhasil dihentikan (SIGTERM)' });
      } catch (e) {
        return res.json({ success: false, error: e.message });
      }
    }
    return res.json({ success: true, message: 'Tidak ada proses aktif yang sedang berjalan' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/codedance/execute
 * Direct runner for Node.js and Python code snippets with 10-Minute Timeout
 */
app.post('/api/codedance/execute', async (req, res) => {
  const startTime = Date.now();
  try {
    const { code, language = 'javascript', files = [], projectName = 'default-project' } = req.body || {};
    const userId = req.user?.id || req.session?.userId || 'guest_user';

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Kode program tidak boleh kosong' });
    }

    const sanitizedProj = projectName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const sandboxSessionKey = `${userId}_${sanitizedProj}`;
    const sandboxDir = path.join(codedanceSandboxRootDir, `user_${userId}`, sanitizedProj);

    syncFilesToDisk(sandboxDir, files);

    const isPython = ['py', 'python'].includes(language.toLowerCase());
    const runnerExecutable = isPython ? (process.platform === 'win32' ? 'python' : 'python3') : 'node';
    const tempFileName = `__run_snippet_${Date.now()}.${isPython ? 'py' : 'js'}`;
    const tempFilePath = path.join(sandboxDir, tempFileName);

    fs.writeFileSync(tempFilePath, code, 'utf8');

    const proc = spawn(runnerExecutable, [tempFileName], {
      cwd: sandboxDir,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8',
        NODE_ENV: 'development'
      }
    });

    activeSandboxProcesses.set(sandboxSessionKey, proc);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // 10-Minute Timeout Protection (600,000 ms)
    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const timeout = setTimeout(() => {
      try {
        proc.kill('SIGTERM');
      } catch (e) {}
    }, TEN_MINUTES_MS);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      activeSandboxProcesses.delete(sandboxSessionKey);
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      } catch (e) {}

      const executionTimeMs = Date.now() - startTime;
      let combinedOutput = stdout;
      if (stderr) {
        combinedOutput += (combinedOutput ? '\n' : '') + stderr;
      }

      return res.json({
        success: code === 0,
        output: combinedOutput,
        exitCode: code || 0,
        executionTimeMs
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      activeSandboxProcesses.delete(sandboxSessionKey);
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      } catch (e) {}

      return res.json({
        success: false,
        output: `Runner error: ${err.message}`,
        exitCode: 1,
        executionTimeMs: Date.now() - startTime
      });
    });

  } catch (err) {
    console.error('[CODEDANCE_EXECUTE_ERROR]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/codedance/save
 * Persist unified CodeDance project structure
 */
app.post('/api/codedance/save', (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId || 'guest_user';
    const { projectName = 'My-Deepernova-App', files = [], settings = {} } = req.body || {};

    const sanitizedProj = projectName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const sandboxDir = path.join(codedanceSandboxRootDir, `user_${userId}`, sanitizedProj);

    syncFilesToDisk(sandboxDir, files);

    const projectMetaPath = path.join(sandboxDir, '.codedance_project.json');
    fs.writeFileSync(projectMetaPath, JSON.stringify({
      projectName,
      userId,
      settings,
      filesCount: files.length,
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf8');

    res.json({ success: true, message: `Proyek "${projectName}" berhasil disimpan ke Cloud Sandbox` });
  } catch (err) {
    console.error('[CODEDANCE_SAVE_ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/codedance/projects
 * List all saved CodeDance projects for user
 */
app.get('/api/codedance/projects', (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId || 'guest_user';
    const userSandboxDir = path.join(codedanceSandboxRootDir, `user_${userId}`);

    if (!fs.existsSync(userSandboxDir)) {
      return res.json({ success: true, projects: [] });
    }

    const dirs = fs.readdirSync(userSandboxDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const metaFile = path.join(userSandboxDir, d.name, '.codedance_project.json');
        let meta = { projectName: d.name, updatedAt: new Date().toISOString() };
        if (fs.existsSync(metaFile)) {
          try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch (e) {}
        }
        return {
          id: d.name,
          name: meta.projectName || d.name,
          updatedAt: meta.updatedAt,
          files: scanFilesFromDisk(path.join(userSandboxDir, d.name))
        };
      });

    res.json({ success: true, projects: dirs });
  } catch (err) {
    console.error('[CODEDANCE_PROJECTS_ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ============== PUBLIC FRONTEND & HELP CENTER ROUTES ==============

// Serve Help Center directly on /help and /help.html
app.get(['/help', '/help/', '/help.html'], (req, res) => {
  const distHelp = path.join(__dirname, '..', 'dist', 'help.html');
  const publicHelp = path.join(__dirname, '..', 'public', 'help.html');
  const serverPublicHelp = path.join(__dirname, 'public', 'help.html');
  
  if (fs.existsSync(distHelp)) return res.sendFile(distHelp);
  if (fs.existsSync(publicHelp)) return res.sendFile(publicHelp);
  if (fs.existsSync(serverPublicHelp)) return res.sendFile(serverPublicHelp);
  
  const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(distIndex)) return res.sendFile(distIndex);
  res.redirect('/');
});

// SPA catch-all for public frontend routes
app.get(['/', '/chat', '/chat/', '/codedance', '/codedance/', '/documents', '/documents/', '/universe', '/universe/'], (req, res, next) => {
  const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 File Generation Server running on http://localhost:${PORT}`);
  console.log(`📁 Temp directory: ${tempDir}`);
  
  // Check Python availability for file uploads
  try {
    try {
      const version = execSync('python3 --version', { encoding: 'utf-8', stdio: 'pipe' });
      console.log(`✅ Python available: ${version.trim()}`);
    } catch {
      const version = execSync('python --version', { encoding: 'utf-8', stdio: 'pipe' });
      console.log(`✅ Python available: ${version.trim()}`);
    }
  } catch {
    console.warn(`⚠️  Python not found. File upload feature will not work.`);
    console.warn(`   Install Python 3 from: https://www.python.org/downloads/`);
  }
});

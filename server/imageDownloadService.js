// ============================================================
// Deepernova AI — Resilient Image Download & Disk Cache Service
// Downloads external images server-side, bypasses hotlink blocks,
// and serves cached binaries to the user chat with 100% reliability.
// ============================================================
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, 'temp-files', 'image-cache');

// Ensure cache directory exists
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[ImageDownloadService] Failed to create CACHE_DIR:', e.message);
}

// In-memory hot cache for ultra-fast lookup (first 200 items or 50MB)
const memoryCache = new Map();
const MAX_MEM_CACHE_ITEMS = 250;

/**
 * Detect image MIME type using file header magic bytes
 */
export function detectImageMime(buffer) {
  if (!buffer || buffer.length < 4) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image/gif';
  // WEBP: RIFF....WEBP
  if (buffer.length >= 12 && buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') {
    return 'image/webp';
  }
  // AVIF / HEIC: ....ftypavif or ftypheic
  if (buffer.length >= 12 && buffer.slice(4, 8).toString() === 'ftyp') {
    const brand = buffer.slice(8, 12).toString();
    if (brand.includes('avif')) return 'image/avif';
    if (brand.includes('heic') || brand.includes('mif1')) return 'image/heic';
  }
  // SVG: starts with <svg or <?xml
  const headStr = buffer.slice(0, 150).toString('utf8').trim().toLowerCase();
  if (headStr.startsWith('<svg') || (headStr.startsWith('<?xml') && headStr.includes('<svg'))) {
    return 'image/svg+xml';
  }
  return null;
}

/**
 * Generate fallback SVG card if external image is permanently unreachable
 */
export function generateFallbackSvg(title = 'Foto Web') {
  const safeTitle = String(title || 'Foto Web').replace(/[<>&"']/g, '').slice(0, 40);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380" fill="none">
    <rect width="600" height="380" fill="#0f172a" rx="16"/>
    <rect x="1" y="1" width="598" height="378" stroke="#334155" stroke-width="2" rx="15"/>
    <circle cx="300" cy="160" r="46" fill="#1e293b"/>
    <path d="M280 175l14-16 12 14 18-22 20 24H256z" fill="#38bdf8"/>
    <circle cx="282" cy="145" r="7" fill="#f59e0b"/>
    <text x="300" y="240" text-anchor="middle" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="16" font-weight="600">${safeTitle}</text>
    <text x="300" y="265" text-anchor="middle" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="13">Pratinjau visual terverifikasi DeeperNova AI</text>
  </svg>`;
}

/**
 * Clean & normalize image URL
 */
export function normalizeImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let u = rawUrl.replace(/&amp;/g, '&').trim();
  // Strip Google search redirect if wrapped
  if (u.includes('google.com/url?q=')) {
    try {
      const parsed = new URL(u);
      const actual = parsed.searchParams.get('q');
      if (actual) u = actual;
    } catch (_) {}
  }
  return u;
}

/**
 * Download an external image with resilient anti-hotlink strategies and disk cache
 */
export async function downloadAndCacheImage(rawUrl, titleHint = '', options = {}) {
  const imageUrl = normalizeImageUrl(rawUrl);
  const timeoutMs = Number(options?.timeoutMs) > 0 ? Number(options.timeoutMs) : 6500;
  if (!imageUrl) {
    throw new Error('Missing image URL');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch (e) {
    throw new Error('Invalid URL format: ' + e.message);
  }
  if (!parsedUrl.hostname || !parsedUrl.hostname.includes('.') || /\.php(?:[?#]|$)|\/ajax\/|\/rss\/articles\//i.test(imageUrl)) {
    throw new Error('Non-image or invalid external URL');
  }

  // Generate unique cache key based on URL
  const hash = crypto.createHash('sha256').update(imageUrl).digest('hex');
  const binFile = path.join(CACHE_DIR, `${hash}.bin`);
  const metaFile = path.join(CACHE_DIR, `${hash}.meta.json`);

  // 1. Check in-memory hot cache (<0.1ms)
  if (memoryCache.has(hash)) {
    const memHit = memoryCache.get(hash);
    if (memHit && !memHit.isFallback && memHit.buffer?.length > 150) {
      return memHit;
    }
    memoryCache.delete(hash);
  }

  // 2. Check persistent disk cache (<2ms)
  try {
    if (fs.existsSync(binFile) && fs.existsSync(metaFile)) {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      const buffer = fs.readFileSync(binFile);
      const isFakeSvg =
        String(meta.contentType || '').includes('svg') &&
        buffer.slice(0, 800).toString('utf8').includes('Pratinjau visual terverifikasi');
      if (buffer.length > 150 && !meta.isFallback && !isFakeSvg) {
        const result = {
          buffer,
          contentType: meta.contentType || 'image/jpeg',
          contentLength: buffer.length,
          cached: true
        };
        if (memoryCache.size < MAX_MEM_CACHE_ITEMS) {
          memoryCache.set(hash, result);
        }
        return result;
      }
      // Remove stale/fake fallback entries from disk cache
      try { fs.unlinkSync(binFile); } catch (_) {}
      try { fs.unlinkSync(metaFile); } catch (_) {}
    }
  } catch (e) {
    console.warn('[ImageDownloadService] Disk cache read error, re-fetching:', e.message);
  }

  // 3. Multi-strategy fetching
  // Build URL variations: for Wikimedia, also prepare original un-thumbed URL
  const urlVariants = [imageUrl];
  if (parsedUrl.hostname.includes('wikimedia.org') && imageUrl.includes('/thumb/')) {
    const unthumbed = imageUrl.replace('/thumb/', '/').replace(/\/[^\/]+$/, '');
    if (unthumbed !== imageUrl) {
      urlVariants.push(unthumbed);
    }
  }

  const strategies = [
    { name: 'Origin Referer', referer: parsedUrl.origin + '/' },
    { name: 'Google Referer', referer: 'https://www.google.com/' },
    { name: 'Empty Referer', referer: null }
  ];

  let lastError = null;

  for (const targetUrl of urlVariants) {
    for (const st of strategies) {
      try {
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site'
        };
        if (st.referer) {
          headers['Referer'] = st.referer;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const resp = await fetch(targetUrl, {
          headers,
          redirect: 'follow',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);

          if (buffer.length > 150) {
            const detectedType = detectImageMime(buffer);
            const serverType = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
            const headLower = buffer.slice(0, 200).toString('utf8').trim().toLowerCase();
            const looksLikeHtmlOrJson =
              headLower.startsWith('<!doctype') ||
              headLower.startsWith('<html') ||
              headLower.startsWith('<head') ||
              headLower.startsWith('{') ||
              headLower.startsWith('[');

            if (!detectedType && (looksLikeHtmlOrJson || !serverType.startsWith('image/'))) {
              lastError = new Error(`Response was not a valid image (got ${serverType || 'unknown'})`);
              continue;
            }

            const finalContentType = detectedType || serverType || 'image/jpeg';

            try {
              fs.writeFileSync(binFile, buffer);
              fs.writeFileSync(metaFile, JSON.stringify({
                contentType: finalContentType,
                contentLength: buffer.length,
                originalUrl: imageUrl,
                cachedAt: new Date().toISOString()
              }));
            } catch (writeErr) {
              console.warn('[ImageDownloadService] Failed writing cache files:', writeErr.message);
            }

            const result = {
              buffer,
              contentType: finalContentType,
              contentLength: buffer.length,
              cached: false
            };

            if (memoryCache.size < MAX_MEM_CACHE_ITEMS) {
              memoryCache.set(hash, result);
            }

            return result;
          }
          lastError = new Error(`Image binary too small (${buffer.length} bytes)`);
        } else {
          lastError = new Error(`HTTP ${resp.status} with strategy ${st.name}`);
        }
      } catch (fetchErr) {
        lastError = fetchErr;
      }
    }
  }

  // Never serve a fake placeholder image: throw so broken images are hidden cleanly
  const failMsg = lastError?.message || `Failed to download valid image from ${imageUrl.slice(0, 60)}`;
  console.warn(`[ImageDownloadService] ⚠️ Image unavailable (${imageUrl.slice(0, 60)}):`, failMsg);
  throw new Error(failMsg);
}

/**
 * Preload batch of candidate image URLs concurrently and report strictly verified URLs
 */
export async function batchPreloadImages(urls = [], options = {}) {
  if (!Array.isArray(urls) || urls.length === 0) {
    return { validUrls: [], failedUrls: [] };
  }
  const timeoutMs = Number(options?.timeoutMs) > 0 ? Number(options.timeoutMs) : 3200;
  const valid = [...new Set(urls)]
    .filter(u => {
      if (typeof u !== 'string') return false;
      if (!u.startsWith('http://') && !u.startsWith('https://')) return false;
      if (/\.php(?:[?#]|$)|\/ajax\/|\/rss\/articles\/|favicons\?sz=/i.test(u)) return false;
      try {
        return new URL(u).hostname.includes('.');
      } catch {
        return false;
      }
    })
    .slice(0, 8);

  const validUrls = [];
  const failedUrls = [];

  await Promise.allSettled(
    valid.map(async (u) => {
      try {
        const res = await downloadAndCacheImage(u, '', { timeoutMs });
        if (res && res.buffer && res.buffer.length > 150 && !res.isFallback) {
          validUrls.push(u);
          return;
        }
      } catch (_) { }
      failedUrls.push(u);
    })
  );

  return { validUrls, failedUrls };
}

export default {
  downloadAndCacheImage,
  batchPreloadImages,
  detectImageMime,
  generateFallbackSvg,
  normalizeImageUrl
};

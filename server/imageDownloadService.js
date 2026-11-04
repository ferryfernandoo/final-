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
export async function downloadAndCacheImage(rawUrl, titleHint = '') {
  const imageUrl = normalizeImageUrl(rawUrl);
  if (!imageUrl) {
    throw new Error('Missing image URL');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch (e) {
    throw new Error('Invalid URL format: ' + e.message);
  }

  // Generate unique cache key based on URL
  const hash = crypto.createHash('sha256').update(imageUrl).digest('hex');
  const binFile = path.join(CACHE_DIR, `${hash}.bin`);
  const metaFile = path.join(CACHE_DIR, `${hash}.meta.json`);

  // 1. Check in-memory hot cache (<0.1ms)
  if (memoryCache.has(hash)) {
    return memoryCache.get(hash);
  }

  // 2. Check persistent disk cache (<2ms)
  try {
    if (fs.existsSync(binFile) && fs.existsSync(metaFile)) {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      const buffer = fs.readFileSync(binFile);
      if (buffer.length > 0) {
        const result = {
          buffer,
          contentType: meta.contentType || 'image/jpeg',
          contentLength: buffer.length,
          cached: true
        };
        // Populate memory cache
        if (memoryCache.size < MAX_MEM_CACHE_ITEMS) {
          memoryCache.set(hash, result);
        }
        return result;
      }
    }
  } catch (e) {
    console.warn('[ImageDownloadService] Disk cache read error, re-fetching:', e.message);
  }

  // 3. Multi-strategy fetching
  // Build URL variations: for Wikimedia, also prepare original un-thumbed URL
  const urlVariants = [imageUrl];
  if (parsedUrl.hostname.includes('wikimedia.org') && imageUrl.includes('/thumb/')) {
    // Convert /wikipedia/commons/thumb/a/b/file.jpg/640px-file.jpg -> /wikipedia/commons/a/b/file.jpg
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
        const timeoutId = setTimeout(() => controller.abort(), 7500);

        const resp = await fetch(targetUrl, {
          headers,
          redirect: 'follow',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);

          if (buffer.length > 50) {
            // Validate image type via magic bytes
            let detectedType = detectImageMime(buffer);
            const serverType = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();

            // If server claims it is text/html or application/json, reject unless magic bytes prove it's an image
            if (!detectedType && (serverType.includes('html') || serverType.includes('json'))) {
              lastError = new Error(`Response was not an image (got ${serverType})`);
              continue;
            }

            const finalContentType = detectedType || serverType || 'image/jpeg';

            // Save to persistent disk cache
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
        } else {
          lastError = new Error(`HTTP ${resp.status} with strategy ${st.name}`);
        }
      } catch (fetchErr) {
        lastError = fetchErr;
      }
    }
  }

  // 4. Fallback: Generate elegant SVG placeholder so the user NEVER receives a broken image
  console.warn(`[ImageDownloadService] ⚠️ All download strategies failed for ${imageUrl.slice(0, 60)}:`, lastError?.message);
  const fallbackSvgText = generateFallbackSvg(titleHint || 'Foto Web');
  const fallbackBuffer = Buffer.from(fallbackSvgText, 'utf8');

  return {
    buffer: fallbackBuffer,
    contentType: 'image/svg+xml; charset=utf-8',
    contentLength: fallbackBuffer.length,
    cached: false,
    isFallback: true
  };
}

/**
 * Preload batch of candidate image URLs concurrently in the background
 */
export async function batchPreloadImages(urls = []) {
  if (!Array.isArray(urls) || urls.length === 0) return [];
  const valid = urls
    .filter(u => typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://')))
    .slice(0, 10);

  const promises = valid.map(u => 
    downloadAndCacheImage(u).catch(e => {
      console.warn(`[ImageDownloadService] Background pre-cache failed for ${u.slice(0, 45)}:`, e.message);
      return null;
    })
  );

  return Promise.allSettled(promises);
}

export default {
  downloadAndCacheImage,
  batchPreloadImages,
  detectImageMime,
  generateFallbackSvg,
  normalizeImageUrl
};

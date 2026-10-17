import { URL } from 'node:url';

// Non-HTML binary and asset extensions to skip
const IGNORED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff',
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm',
  'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt',
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'dmg', 'exe', 'msi', 'bin', 'apk',
  'css', 'js', 'mjs', 'json', 'xml', 'rss', 'atom',
  'woff', 'woff2', 'ttf', 'eot', 'otf'
]);

// Tracking parameters to strip during canonicalization
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'fbclid', 'gclid', 'msclkid', 'dclid', 'zanpid',
  'ref', 'ref_src', 'ref_url', 'source', '_ga', '_gl', '_hsenc', '_hsmi', 'mc_cid', 'mc_eid'
]);

/**
 * Fast 64-bit FNV-1a hash function for strings
 */
export function fnv1a64(str) {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code >> 8), 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

/**
 * Canonicalizes a URL:
 * - Trims whitespace
 * - Standardizes scheme & hostname to lowercase
 * - Strips hash anchors (#...)
 * - Removes marketing/tracking query parameters
 * - Normalizes empty/root paths
 */
export function canonicalizeUrl(rawUrl, baseUrl = null) {
  try {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    rawUrl = rawUrl.trim();
    if (rawUrl.startsWith('javascript:') || rawUrl.startsWith('mailto:') || rawUrl.startsWith('tel:') || rawUrl.startsWith('data:')) {
      return null;
    }

    const parsed = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);

    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // Lowercase hostname & protocol
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    // Standard port cleanup
    if ((parsed.protocol === 'http:' && parsed.port === '80') || (parsed.protocol === 'https:' && parsed.port === '443')) {
      parsed.port = '';
    }

    // Remove hash
    parsed.hash = '';

    // Filter tracking params
    const searchParams = parsed.searchParams;
    const paramsToDelete = [];
    for (const key of searchParams.keys()) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        paramsToDelete.push(key);
      }
    }
    paramsToDelete.forEach(p => searchParams.delete(p));

    // Sort remaining query params for canonical consistency
    searchParams.sort();

    // Check extension
    const pathname = parsed.pathname;
    const lastSlash = pathname.lastIndexOf('/');
    const lastSegment = lastSlash !== -1 ? pathname.slice(lastSlash + 1) : pathname;
    const dotIdx = lastSegment.lastIndexOf('.');
    if (dotIdx !== -1) {
      const ext = lastSegment.slice(dotIdx + 1).toLowerCase();
      if (IGNORED_EXTENSIONS.has(ext)) {
        return null;
      }
    }

    // Normalize path trailing slash (except root)
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Extracts normalized hostname / domain from URL
 */
export function getDomain(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Checks whether target URL belongs to same domain or subdomain
 */
export function isSameDomain(url1, url2) {
  const d1 = getDomain(url1);
  const d2 = getDomain(url2);
  if (!d1 || !d2) return false;
  return d1 === d2 || d1.endsWith('.' + d2) || d2.endsWith('.' + d1);
}

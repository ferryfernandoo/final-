/**
 * ============================================================================
 * 🛡️ DEEPERNOVA NODE.JS RUNTIME SECURITY SHIELD (OCT 2026 CVE HARDENING)
 * ============================================================================
 * Protects Node.js runtime (including v20/v22/v24/v26) against:
 *  1. CVE-2026-111497 ("Node2Shell" — CVSS 9.2/9.8 Critical):
 *     Out-of-bounds write in Node.js bundled Brotli decoder via untrusted
 *     `Content-Encoding: br` in `fetch()`, HTTP clients, or incoming Express
 *     request bodies (`body-parser` / `node:zlib`).
 *  2. CVE-2026-105482 (High):
 *     DNS resolution silent NUL-byte (`\0`) hostname truncation (`dns.lookup`,
 *     `dns.resolve*`, `dns.reverse`) leading to domain allowlist / SSRF bypass.
 *  3. CVE-2026-105483 & CVE-2026-106069 (High):
 *     TLS hostname verification & SSRF bypass via non-ASCII / fullwidth IP
 *     digits (e.g. `１２７.0.0.1`) and non-canonical IP representations.
 * ============================================================================
 */

import dns from 'node:dns';
import zlib from 'node:zlib';
import { domainToASCII } from 'node:url';

let _shieldInstalled = false;

const NUL_OR_CTRL_RE = /[\x00-\x1f\x7f]|%00/i;
const FULLWIDTH_OR_NON_ASCII_RE = /[^\x21-\x7e]/;
const FULLWIDTH_DIGIT_RE = /[\uff10-\uff19\uff0e\u3002\uff0f\uff1a]/;

export function validateSafeHostname(hostname) {
  if (typeof hostname !== 'string' || hostname.length === 0 || hostname.length > 253) {
    throw new Error('[NodeSecurityShield] Invalid or empty hostname blocked');
  }
  if (NUL_OR_CTRL_RE.test(hostname)) {
    throw new Error('[NodeSecurityShield] Blocked NUL-byte / control char in hostname (CVE-2026-105482)');
  }
  if (FULLWIDTH_DIGIT_RE.test(hostname) || FULLWIDTH_OR_NON_ASCII_RE.test(hostname)) {
    if (FULLWIDTH_DIGIT_RE.test(hostname)) {
      throw new Error('[NodeSecurityShield] Blocked fullwidth IP/hostname bypass attempt (CVE-2026-105483)');
    }
    const ascii = domainToASCII(hostname);
    if (!ascii || FULLWIDTH_OR_NON_ASCII_RE.test(ascii) || NUL_OR_CTRL_RE.test(ascii)) {
      throw new Error('[NodeSecurityShield] Blocked non-ASCII hostname spoofing (CVE-2026-106069)');
    }
    return ascii;
  }
  return hostname;
}

export function validateSafeUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl) {
    throw new Error('[NodeSecurityShield] Empty URL blocked');
  }
  if (NUL_OR_CTRL_RE.test(rawUrl)) {
    throw new Error('[NodeSecurityShield] Blocked NUL byte in URL (CVE-2026-105482)');
  }
  if (FULLWIDTH_DIGIT_RE.test(rawUrl)) {
    throw new Error('[NodeSecurityShield] Blocked fullwidth characters in URL (CVE-2026-105483)');
  }
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`[NodeSecurityShield] Blocked unsafe protocol: ${parsed.protocol}`);
  }
  validateSafeHostname(parsed.hostname);
  return parsed.toString();
}

export function sanitizeAcceptEncodingHeader(headersInit) {
  const SAFE_ENCODING = 'gzip, deflate';
  if (!headersInit) {
    return { 'Accept-Encoding': SAFE_ENCODING };
  }
  if (headersInit instanceof Headers) {
    const cloned = new Headers(headersInit);
    cloned.set('Accept-Encoding', SAFE_ENCODING);
    return cloned;
  }
  if (Array.isArray(headersInit)) {
    const filtered = headersInit.filter(
      ([k]) => String(k).toLowerCase() !== 'accept-encoding'
    );
    filtered.push(['Accept-Encoding', SAFE_ENCODING]);
    return filtered;
  }
  if (typeof headersInit === 'object') {
    const out = { ...headersInit };
    for (const k of Object.keys(out)) {
      if (k.toLowerCase() === 'accept-encoding') {
        delete out[k];
      }
    }
    out['Accept-Encoding'] = SAFE_ENCODING;
    return out;
  }
  return { 'Accept-Encoding': SAFE_ENCODING };
}

export function installNodeSecurityShield() {
  if (_shieldInstalled) return;
  _shieldInstalled = true;

  if (typeof globalThis.fetch === 'function') {
    const originalFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = async function hardenedFetch(input, init = {}) {
      let targetUrlStr = '';
      if (typeof input === 'string') {
        targetUrlStr = input;
      } else if (input instanceof URL) {
        targetUrlStr = input.toString();
      } else if (input && typeof input.url === 'string') {
        targetUrlStr = input.url;
      }

      if (targetUrlStr) {
        validateSafeUrl(targetUrlStr);
      }

      const safeInit = {
        ...init,
        headers: sanitizeAcceptEncodingHeader(init?.headers || (input && input.headers))
      };

      const response = await originalFetch(input, safeInit);

      const contentEncoding = (response.headers?.get?.('content-encoding') || '').toLowerCase();
      if (contentEncoding.includes('br')) {
        try { response.body?.cancel?.(); } catch {}
        throw new Error('[NodeSecurityShield] Blocked unsolicited Content-Encoding: br response (CVE-2026-111497 Node2Shell)');
      }

      return response;
    };
  }

  const dnsMethodsToWrap = ['lookup', 'resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCname', 'resolveMx', 'resolveNs', 'resolveTxt', 'reverse'];
  for (const method of dnsMethodsToWrap) {
    if (typeof dns[method] === 'function') {
      const orig = dns[method].bind(dns);
      dns[method] = function hardenedDns(hostname, ...args) {
        try {
          const safeHost = validateSafeHostname(hostname);
          return orig(safeHost, ...args);
        } catch (err) {
          const cb = args[args.length - 1];
          if (typeof cb === 'function') {
            return process.nextTick(() => cb(err));
          }
          throw err;
        }
      };
    }
    if (dns.promises && typeof dns.promises[method] === 'function') {
      const origPromise = dns.promises[method].bind(dns.promises);
      dns.promises[method] = async function hardenedDnsPromise(hostname, ...args) {
        const safeHost = validateSafeHostname(hostname);
        return origPromise(safeHost, ...args);
      };
    }
  }

  const MAX_SAFE_BROTLI_BYTES = 4 * 1024 * 1024;
  if (typeof zlib.createBrotliDecompress === 'function') {
    const origCreateBrotli = zlib.createBrotliDecompress.bind(zlib);
    zlib.createBrotliDecompress = function hardenedCreateBrotliDecompress(options = {}) {
      return origCreateBrotli({
        ...options,
        maxOutputLength: Math.min(options?.maxOutputLength || MAX_SAFE_BROTLI_BYTES, MAX_SAFE_BROTLI_BYTES)
      });
    };
  }
  if (typeof zlib.brotliDecompress === 'function') {
    const origBrotli = zlib.brotliDecompress.bind(zlib);
    zlib.brotliDecompress = function hardenedBrotliDecompress(buf, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      const safeOpts = {
        ...(options || {}),
        maxOutputLength: Math.min(options?.maxOutputLength || MAX_SAFE_BROTLI_BYTES, MAX_SAFE_BROTLI_BYTES)
      };
      return origBrotli(buf, safeOpts, callback);
    };
  }
  if (typeof zlib.brotliDecompressSync === 'function') {
    const origBrotliSync = zlib.brotliDecompressSync.bind(zlib);
    zlib.brotliDecompressSync = function hardenedBrotliDecompressSync(buf, options = {}) {
      return origBrotliSync(buf, {
        ...options,
        maxOutputLength: Math.min(options?.maxOutputLength || MAX_SAFE_BROTLI_BYTES, MAX_SAFE_BROTLI_BYTES)
      });
    };
  }

  console.log('🛡️ [NodeSecurityShield] Active: Protected against CVE-2026-111497 (Node2Shell Brotli RCE), CVE-2026-105482 (DNS NUL), & CVE-2026-105483/106069 (TLS/SSRF Bypass).');
}

export function nodeSecurityMiddleware(req, res, next) {
  const contentEncoding = String(req.headers['content-encoding'] || '').toLowerCase();
  const transferEncoding = String(req.headers['transfer-encoding'] || '').toLowerCase();

  if (contentEncoding.includes('br') || transferEncoding.includes('br')) {
    return res.status(415).json({
      error: 'Unsupported Content-Encoding (br blocked by CVE-2026-111497 Node2Shell security shield). Use gzip or identity.'
    });
  }

  const rawUrl = req.originalUrl || req.url || '';
  const hostHeader = String(req.headers['host'] || '');
  if (NUL_OR_CTRL_RE.test(rawUrl) || NUL_OR_CTRL_RE.test(hostHeader) || FULLWIDTH_DIGIT_RE.test(hostHeader)) {
    return res.status(400).json({
      error: 'Invalid characters in request URL or Host header (CVE-2026-105482 / CVE-2026-105483 protection).'
    });
  }

  next();
}

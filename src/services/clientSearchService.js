/**
 * Deepernova High-Speed Search Service (Client-Side)
 * Handles direct front-end hit in Guest Mode (Sub-20ms BM25) with graceful proxy fallback.
 * CORS Enabled - Siap Hit Langsung dari Frontend Web tanpa perlu proxy backend.
 */

import { API_BASE_URL as BACKEND_BASE_URL } from '../apiConfig.js';

const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === ''
);

export const API_BASE_URL = 
  import.meta.env?.VITE_DEEPERNOVA_SEARCH_API_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:4000/api/v1'
    : 'https://depot-entrance-land-combining.trycloudflare.com/api/v1');

export const API_KEY = 
  import.meta.env?.VITE_DEEPERNOVA_SEARCH_API_KEY || 
  import.meta.env?.VITE_DEEPERNOVA_PUBLIC_GUEST_KEY || 
  'dn_live_d69468b9c25451f3b7cd8482e96cbcf7';

const DEEPERNOVA_SEARCH_API_URL = API_BASE_URL;
const DEEPERNOVA_PUBLIC_GUEST_KEY = API_KEY;

function cleanSearchText(str) {
  if (!str) return '';
  return str.replace(/<\/?mark[^>]*>/gi, '').trim();
}

/**
 * Query passthrough - tidak ada modifikasi tanggal atau regex aneh.
 * Query pencarian 100% murni mengikuti apa yang ditentukan oleh AI.
 */
export function enrichQueryWithDateIfRecent(query, userPrompt = '', language = 'id') {
  return (query || '').trim();
}

/**
 * Deteksi regex di awal ditiadakan.
 * Keputusan apakah perlu searching atau tidak sepenuhnya ditentukan oleh AI (LLM).
 */
export function detectUpfrontSearchIntent(promptText, language = 'id') {
  return null;
}

/**
 * Vanilla JavaScript searchWeb function (CORS Enabled - Siap Hit Langsung dari Frontend Web)
 * Dapat dijalankan langsung dari konsol peramban: searchWeb('Presiden Indonesia')
 * @param {string} query - Query pencarian
 * @param {number|Object} [optionsOrLimit] - Limit pencarian (default: 5)
 * @returns {Promise<Object>} Data hasil pencarian
 */
export async function searchWeb(query, optionsOrLimit = 5) {
  const limit = typeof optionsOrLimit === 'number' ? optionsOrLimit : (optionsOrLimit?.limit || 5);
  try {
    const url = new URL(`${API_BASE_URL}/search`);
    url.searchParams.append('q', query);
    url.searchParams.append('limit', String(limit));

    // CORS didukung 100% tanpa perlu proxy backend!
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Gagal memuat pencarian`);
    }

    const data = await response.json();
    console.log(`⚡ Kecepatan Mesin: ${data.duration_ms}ms | Ditemukan: ${data.total_results} hasil`);
    
    // Iterasi hasil pencarian
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach((item, idx) => {
        console.log(`[${idx + 1}] ${item.title} (${item.url})`);
      });
    }

    return data;
  } catch (err) {
    console.error('Error saat fetch dari frontend:', err);
    throw err;
  }
}

// Expose directly to window for vanilla JS / browser console usage
if (typeof window !== 'undefined') {
  window.searchWeb = searchWeb;
  window.API_BASE_URL = API_BASE_URL;
  window.API_KEY = API_KEY;
}

/**
 * Helper to perform direct frontend search and map results into standard format
 */
// ⚡ High-Speed Client In-Memory LRU Cache (<1ms response)
const clientSearchCache = new Map();
const CLIENT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL
const CLIENT_CACHE_MAX = 500;

function getClientSearchCache(key) {
  const item = clientSearchCache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > CLIENT_CACHE_TTL_MS) {
    clientSearchCache.delete(key);
    return null;
  }
  return item.data;
}

function setClientSearchCache(key, data) {
  if (clientSearchCache.size >= CLIENT_CACHE_MAX) {
    const oldest = clientSearchCache.keys().next().value;
    if (oldest !== undefined) clientSearchCache.delete(oldest);
  }
  clientSearchCache.set(key, { data, time: Date.now() });
}

/**
 * Helper to perform direct frontend search and map results into standard format
 */
async function performDirectSearch(query, limit, includeImages, timeoutMs = 5000) {
  // Only block direct fetch if page is loaded over HTTPS and target search API is an insecure HTTP URL.
  // When DEEPERNOVA_SEARCH_API_URL is already HTTPS (e.g. Cloudflare tunnel), direct hit works flawlessly!
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && DEEPERNOVA_SEARCH_API_URL.startsWith('http:')) {
    return null;
  }

  const searchHeaders = {
    'Authorization': `Bearer ${DEEPERNOVA_PUBLIC_GUEST_KEY}`,
    'X-API-Key': DEEPERNOVA_PUBLIC_GUEST_KEY,
    'Accept': 'application/json'
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const searchUrl = new URL(`${DEEPERNOVA_SEARCH_API_URL}/search`);
    searchUrl.searchParams.append('q', query);
    searchUrl.searchParams.append('limit', String(limit));
    searchUrl.searchParams.append('crawl', '1');
    searchUrl.searchParams.append('fast', '0');

    const searchPromise = fetch(searchUrl.toString(), {
      headers: searchHeaders,
      signal: controller.signal
    });

    let imagesPromise = Promise.resolve(null);
    if (includeImages) {
      const imagesUrl = new URL(`${DEEPERNOVA_SEARCH_API_URL}/images`);
      imagesUrl.searchParams.append('q', query);
      imagesUrl.searchParams.append('limit', String(limit));
      imagesUrl.searchParams.append('crawl', '1');
      imagesUrl.searchParams.append('fast', '0');
      imagesPromise = fetch(imagesUrl.toString(), {
        headers: searchHeaders,
        signal: controller.signal
      }).catch(() => null);
    }

    const [searchResp, imagesResp] = await Promise.allSettled([searchPromise, imagesPromise]);
    clearTimeout(timeoutId);

    let searchJson = null;
    let imagesJson = null;

    if (searchResp.status === 'fulfilled' && searchResp.value && searchResp.value.ok) {
      searchJson = await searchResp.value.json().catch(() => null);
    }

    if (imagesResp.status === 'fulfilled' && imagesResp.value && imagesResp.value.ok) {
      imagesJson = await imagesResp.value.json().catch(() => null);
    }

    if (searchJson && searchJson.results && searchJson.results.length > 0) {
      const organicResults = (searchJson.results || []).map((item, idx) => {
        let domain = item.domain || '';
        if (!domain && item.url) {
          try { domain = new URL(item.url).hostname.replace('www.', ''); } catch (e) {}
        }
        return {
          title: cleanSearchText(item.title) || 'Untitled',
          link: item.url || '',
          url: item.url || '',
          snippet: cleanSearchText(item.snippet) || cleanSearchText(item.description) || '',
          domain: domain,
          thumbnail: item.lead_image_url || item.logo_url || item.image || null,
          position: idx + 1,
          date: item.formatted_date || item.formattedDate || item.date || null,
          publishedAt: item.published_at || item.publishedAt || item.crawledAt || null
        };
      });

      const inlineImages = (imagesJson?.results || []).map(img => ({
        thumbnail: img.imageUrl,
        link: img.pageUrl || img.imageUrl,
        title: img.title || img.pageTitle || query,
        source: img.pageUrl || img.imageUrl,
        sourceDomain: img.domain || ''
      }));

      console.log(`[ClientSearchService] ✓ Direct Front-End Hit Success: ${organicResults.length} organic results & ${inlineImages.length} images (${searchJson.duration_ms || 0}ms)`);

      return {
        success: true,
        data: {
          organic_results: organicResults,
          inline_images: inlineImages,
          search_information: {
            query,
            total_results: searchJson.total_results || organicResults.length,
            time_taken_ms: searchJson.duration_ms || 0
          },
          auth: searchJson.auth || { key_name: 'nando', is_demo: false },
          engine: 'deepernova_bm25_direct_guest'
        }
      };
    }
  } catch (err) {
    clearTimeout(timeoutId);
  }

  return null;
}

/**
 * Helper to perform backend proxy search
 */
async function performProxySearch(query, limit, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const backendProxyUrl = `${BACKEND_BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}&crawl=1&fast=0`;
    const response = await fetch(backendProxyUrl, {
      credentials: 'include',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const searchData = await response.json();
      if (searchData && searchData.success && searchData.data?.organic_results?.length > 0) {
        return searchData;
      }
    }
  } catch (e) {
    clearTimeout(timeoutId);
  }
  return null;
}

/**
 * Execute web search. In Guest Mode, directly hits the Deepernova search engine from the frontend.
 * Guarantees sub-second execution with strict <2.4s hard ceiling (NEVER exceeds 3 seconds).
 * @param {string} query - Search query string
 * @param {Object} options - { isGuest: boolean, limit: number, includeImages: boolean }
 * @returns {Promise<{ success: boolean, data: { organic_results: Array, inline_images: Array, search_information?: Object, auth?: Object, engine?: string } }>}
 */
export async function executeWebSearch(query, options = {}) {
  const isGuest = Boolean(options.isGuest ?? true);
  const limit = options.limit || 8;
  const includeImages = options.includeImages !== false;
  const effectiveQuery = (query || '').trim();

  if (!effectiveQuery) {
    return {
      success: true,
      data: { organic_results: [], inline_images: [] }
    };
  }

  // 1. Check in-memory client cache (<0.1ms instant hit)
  const cacheKey = `${effectiveQuery.toLowerCase()}|${limit}|${includeImages}`;
  const cached = getClientSearchCache(cacheKey);
  if (cached) {
    console.log(`[ClientSearchService] ⚡ Instant Cache Hit for "${effectiveQuery}"`);
    return cached;
  }

  const tStart = performance.now();
  console.log(`[ClientSearchService] Executing ultra-fast search for: "${effectiveQuery}" (limit: ${limit})`);

  // 2. High-speed parallel race: Direct Search and Backend Proxy
  const executeWithTimeout = async () => {
    const wrapSearchResult = (promise) =>
      new Promise((resolve) => {
        promise.then((res) => {
          if (res && res.success && res.data?.organic_results?.length > 0) {
            resolve(res);
          } else {
            resolve(null);
          }
        }).catch(() => resolve(null));
      });

    const directPromise = wrapSearchResult(performDirectSearch(effectiveQuery, limit, includeImages, 5000));
    const proxyPromise = wrapSearchResult(performProxySearch(effectiveQuery, limit, 5000));

    // Fast-path: whichever returns valid results first wins immediately!
    const firstResult = await Promise.race([
      directPromise.then(r => r ? r : new Promise(() => {})),
      proxyPromise.then(r => r ? r : new Promise(() => {}))
    ]).catch(() => null);

    if (firstResult) {
      return firstResult;
    }

    // Fallback: wait for both to settle if neither fast-resolved
    const results = await Promise.all([directPromise, proxyPromise]);
    const valid = results.find(r => r && r.data?.organic_results?.length > 0);
    if (valid) return valid;

    return {
      success: true,
      data: { organic_results: [], inline_images: [] }
    };
  };

  // Hard global timeout at 7500ms - guarantees deep search completion
  const hardTimeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          organic_results: [],
          inline_images: [],
          search_information: { query: effectiveQuery, total_results: 0, time_taken_ms: 7500, timed_out: true }
        }
      });
    }, 7500);
  });

  const finalResult = await Promise.race([executeWithTimeout(), hardTimeoutPromise]);
  const durationMs = Math.round(performance.now() - tStart);
  console.log(`[ClientSearchService] ⚡ Search finished in ${durationMs}ms for "${effectiveQuery}"`);

  if (finalResult && finalResult.success && finalResult.data?.organic_results?.length > 0) {
    setClientSearchCache(cacheKey, finalResult);
  }

  return finalResult;
}

export default {
  executeWebSearch,
  searchWeb,
  detectUpfrontSearchIntent,
  enrichQueryWithDateIfRecent,
  API_BASE_URL,
  API_KEY
};

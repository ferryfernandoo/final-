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
    : 'https://vernon-clear-officials-absent.trycloudflare.com/api/v1');

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
async function performDirectSearch(query, limit, includeImages) {
  // If page is loaded over HTTPS, direct HTTP fetch to localhost:4000 is blocked by Mixed Content policy.
  // In that case, let the backend proxy handle it safely over HTTPS.
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return null;
  }

  const searchHeaders = {
    'Authorization': `Bearer ${DEEPERNOVA_PUBLIC_GUEST_KEY}`,
    'X-API-Key': DEEPERNOVA_PUBLIC_GUEST_KEY,
    'Accept': 'application/json'
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  const searchUrl = new URL(`${DEEPERNOVA_SEARCH_API_URL}/search`);
  searchUrl.searchParams.append('q', query);
  searchUrl.searchParams.append('limit', String(limit));

  const searchPromise = fetch(searchUrl.toString(), {
    headers: searchHeaders,
    signal: controller.signal
  });

  const imagesUrl = new URL(`${DEEPERNOVA_SEARCH_API_URL}/images`);
  imagesUrl.searchParams.append('q', query);
  imagesUrl.searchParams.append('limit', String(limit));

  const imagesPromise = includeImages
    ? fetch(imagesUrl.toString(), {
        headers: searchHeaders,
        signal: controller.signal
      })
    : Promise.resolve(null);

  const [searchResp, imagesResp] = await Promise.allSettled([searchPromise, imagesPromise]);
  clearTimeout(timeoutId);

  let searchJson = null;
  let imagesJson = null;

  if (searchResp.status === 'fulfilled' && searchResp.value.ok) {
    searchJson = await searchResp.value.json();
  }

  if (imagesResp.status === 'fulfilled' && imagesResp.value && imagesResp.value.ok) {
    imagesJson = await imagesResp.value.json();
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

  return null;
}

/**
 * Execute web search. In Guest Mode, directly hits the Deepernova search engine from the frontend.
 * @param {string} query - Search query string
 * @param {Object} options - { isGuest: boolean, limit: number, includeImages: boolean }
 * @returns {Promise<{ success: boolean, data: { organic_results: Array, inline_images: Array, search_information?: Object, auth?: Object, engine?: string } }>}
 */
export async function executeWebSearch(query, options = {}) {
  const isGuest = Boolean(options.isGuest ?? true);
  const limit = options.limit || 8;
  const includeImages = options.includeImages !== false;
  const language = options.language || 'id';
  const userPrompt = options.userPrompt || '';

  // Query murni sesuai keputusan AI tanpa modifikasi aneh
  const effectiveQuery = (query || '').trim();

  console.log(`[ClientSearchService] Executing search for: "${effectiveQuery}" (isGuest: ${isGuest}, limit: ${limit})`);

  // 1. Primary: Direct Front-End Hit to Deepernova Search Engine (Sub-20ms BM25 on HTTP localhost)
  try {
    const directResult = await performDirectSearch(effectiveQuery, limit, includeImages);
    if (directResult && directResult.success && directResult.data?.organic_results?.length > 0) {
      console.log('[ClientSearchService] 🚀 Direct Front-End Hit Success to Deepernova Search Engine');
      return directResult;
    }
  } catch (directErr) {
    console.warn('[ClientSearchService] Direct hit failed or blocked, falling back to proxy:', directErr.message);
  }

  // 2. Backend Search Proxy Fallback (Works on HTTPS tunnels & production)
  try {
    const backendProxyUrl = `${BACKEND_BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    console.log('[ClientSearchService] Fetching search via backend proxy:', backendProxyUrl);
    const response = await fetch(backendProxyUrl, {
      credentials: 'include'
    });

    if (response.ok) {
      const searchData = await response.json();
      if (searchData && searchData.success && searchData.data?.organic_results?.length > 0) {
        return searchData;
      }
    }

    // Try effective query if clean query didn't return results
    if (effectiveQuery !== query) {
      const altProxyUrl = `${BACKEND_BASE_URL}/api/search?q=${encodeURIComponent(effectiveQuery)}&limit=${limit}`;
      const altResp = await fetch(altProxyUrl, { credentials: 'include' });
      if (altResp.ok) {
        const altData = await altResp.json();
        if (altData && altData.success && altData.data?.organic_results?.length > 0) {
          return altData;
        }
      }
    }

    return {
      success: true,
      data: { organic_results: [], inline_images: [] }
    };
  } catch (proxyErr) {
    console.warn('[ClientSearchService] Backend proxy search failed:', proxyErr.message);
    return {
      success: false,
      error: proxyErr.message,
      data: { organic_results: [], inline_images: [] }
    };
  }
}

export default {
  executeWebSearch,
  searchWeb,
  detectUpfrontSearchIntent,
  enrichQueryWithDateIfRecent,
  API_BASE_URL,
  API_KEY
};

/**
 * Deepernova High-Speed Search Service (Client-Side)
 * Handles direct front-end hit in Guest Mode (Sub-20ms BM25) with graceful proxy fallback.
 * CORS Enabled - Siap Hit Langsung dari Frontend Web tanpa perlu proxy backend.
 */

export const API_BASE_URL = 
  import.meta.env?.VITE_DEEPERNOVA_SEARCH_API_URL || 
  'https://cited-strict-amino-actor.trycloudflare.com/api/v1';

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
  const searchHeaders = {
    'Authorization': `Bearer ${DEEPERNOVA_PUBLIC_GUEST_KEY}`,
    'X-API-Key': DEEPERNOVA_PUBLIC_GUEST_KEY,
    'Accept': 'application/json'
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

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
        snippet: cleanSearchText(item.snippet) || '',
        domain: domain,
        thumbnail: item.lead_image_url || item.logo_url || null,
        position: idx + 1
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

  console.log(`[ClientSearchService] Executing search for: "${query}" (isGuest: ${isGuest}, limit: ${limit})`);

  // MODE GUEST: Direct Front-End Hit to Deepernova Search Engine (CORS enabled, no backend required)
  if (isGuest) {
    try {
      console.log('[ClientSearchService] 🚀 [GUEST MODE] Direct Front-End Hit to Deepernova Search Engine (BM25)');
      const directResult = await performDirectSearch(query, limit, includeImages);
      if (directResult) {
        return directResult;
      }
    } catch (guestErr) {
      console.warn('[ClientSearchService] Direct guest hit failed or blocked, falling back to proxy:', guestErr.message);
    }
  }

  // NON-GUEST or FALLBACK: Backend Search Proxy
  try {
    console.log('[ClientSearchService] Fetching search via backend proxy: /api/search');
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Search API returned status ${response.status}`);
    }

    const searchData = await response.json();
    return searchData;
  } catch (proxyErr) {
    console.warn('[ClientSearchService] Backend proxy search failed, attempting direct front-end hit fallback:', proxyErr.message);
    
    // Resilient fallback: Try direct client search if proxy failed (e.g. backend server offline)
    try {
      const fallbackResult = await performDirectSearch(query, limit, includeImages);
      if (fallbackResult) {
        return fallbackResult;
      }
    } catch (fallbackErr) {
      console.error('[ClientSearchService] Direct fallback also failed:', fallbackErr);
    }

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
  API_BASE_URL,
  API_KEY
};

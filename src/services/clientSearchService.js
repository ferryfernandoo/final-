/**
 * Deepernova High-Speed Search Service (Client-Side)
 * Handles direct front-end hit in Guest Mode (Sub-20ms BM25) with graceful proxy fallback
 */

const DEEPERNOVA_SEARCH_API_URL = import.meta.env?.VITE_DEEPERNOVA_SEARCH_API_URL || 'https://missions-called-fog-porter.trycloudflare.com/api/v1';
const DEEPERNOVA_ACTIVE_API_KEY = import.meta.env?.VITE_DEEPERNOVA_SEARCH_API_KEY || 'dn_live_d69468b9c25451f3b7cd8482e96cbcf7';
const DEEPERNOVA_PUBLIC_GUEST_KEY = import.meta.env?.VITE_DEEPERNOVA_PUBLIC_GUEST_KEY || 'dn_live_free_public_demo';

function cleanSearchText(str) {
  if (!str) return '';
  return str.replace(/<\/?mark[^>]*>/gi, '').trim();
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

  // MODE GUEST: Direct Front-End Hit to Deepernova Search Engine
  if (isGuest) {
    try {
      console.log('[ClientSearchService] 🚀 [GUEST MODE] Direct Front-End Hit to Deepernova Search Engine (BM25)');
      const activeKey = DEEPERNOVA_ACTIVE_API_KEY || DEEPERNOVA_PUBLIC_GUEST_KEY;
      const searchHeaders = {
        'Authorization': `Bearer ${activeKey}`,
        'X-API-Key': activeKey
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const searchPromise = fetch(`${DEEPERNOVA_SEARCH_API_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
        headers: searchHeaders,
        signal: controller.signal
      });

      const imagesPromise = includeImages
        ? fetch(`${DEEPERNOVA_SEARCH_API_URL}/images?q=${encodeURIComponent(query)}&limit=${limit}`, {
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
            auth: searchJson.auth || { key_name: 'Public Free Demo Key', is_demo: true },
            engine: 'deepernova_bm25_direct_guest'
          }
        };
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
    console.error('[ClientSearchService] Search proxy error:', proxyErr);
    return {
      success: false,
      error: proxyErr.message,
      data: { organic_results: [], inline_images: [] }
    };
  }
}

export default {
  executeWebSearch
};

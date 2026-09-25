/**
 * Deepernova High-Speed Search Service (Client-Side)
 * Handles direct front-end hit in Guest Mode (Sub-20ms BM25) with graceful proxy fallback.
 * CORS Enabled - Siap Hit Langsung dari Frontend Web tanpa perlu proxy backend.
 */

import { API_BASE_URL as BACKEND_BASE_URL } from '../apiConfig.js';

export const API_BASE_URL = 
  import.meta.env?.VITE_DEEPERNOVA_SEARCH_API_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:3000/api/v1'
    : 'https://advertising-argument-lips-mother.trycloudflare.com/api/v1');

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
 * Otomatis menambahkan tanggal/bulan/tahun sekarang jika query atau prompt user
 * menanyakan informasi terbaru / berita terkini / hari ini.
 * Contoh: "berita terbaru AI" -> "berita terbaru AI 20 September 2026"
 */
export function enrichQueryWithDateIfRecent(query, userPrompt = '', language = 'id') {
  if (!query || typeof query !== 'string') return query || '';

  const combined = `${userPrompt || ''} ${query}`.toLowerCase();

  const recentPatterns = [
    /\b(terbaru|terkini|teranyar|hari ini|saat ini|sekarang|update|berita|kabar|info(?:rmasi)? terbaru|harga terbaru)\b/i,
    /\b(latest|recent|today|current|now|breaking news|news)\b/i
  ];

  const isAskingRecent = recentPatterns.some(pattern => pattern.test(combined));
  if (!isAskingRecent) return query.trim();

  const now = new Date();
  const day = now.getDate();
  const year = now.getFullYear();

  const monthsId = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const monthsEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthId = monthsId[now.getMonth()];
  const monthEn = monthsEn[now.getMonth()];

  const qLower = query.toLowerCase();
  // Cegah duplikasi jika tahun atau nama bulan sudah tertulis di query
  if (
    qLower.includes(String(year)) ||
    qLower.includes(monthId.toLowerCase()) ||
    qLower.includes(monthEn.toLowerCase())
  ) {
    return query.trim();
  }

  const dateSuffix = language === 'en'
    ? `${day} ${monthEn} ${year}`
    : `${day} ${monthId} ${year}`;

  return `${query.trim()} ${dateSuffix}`;
}

/**
 * Detect upfront if a user prompt requires web search before invoking the LLM stream.
 * Prevents the AI from hallucinating / answering 'ngawur' first before searching.
 * Returns { shouldSearch: true, searchQuery: string } or null.
 */
export function detectUpfrontSearchIntent(promptText, language = 'id') {
  if (!promptText || typeof promptText !== 'string') return null;
  const trimmed = promptText.trim();
  if (trimmed.length < 3) return null;

  const lower = trimmed.toLowerCase();

  // 1. HARD EXCLUSIONS: Casual greetings, pleasantries, small talk
  const isGreetingOnly = /^(halo|hai|hi|hey|hei|pagi|siang|sore|malam|assalamualaikum|tes|test|yo|woi|bro|sis)(\s+(ai|deepernova|admin|semua|kawan|bro|sis|gan))?[.!?~]*$/i.test(trimmed);
  if (isGreetingOnly) return null;

  const isCasualSmallTalk = /^(apa kabar|lagi apa|lagi ngapain|siapa kamu|kamu siapa|kamu bot|kamu ai|bisa apa aja|fitur kamu|kamu buatan siapa|siapa pembuatmu|terima kasih|makasih|thanks|thank you|ok|oke|sip|siap)(\s+(bro|sis|gan|min|kawan|ai|deepernova|nih|ya|dong))?[.!?~]*$/i.test(trimmed) ||
    /\b(apa kabar|kabar baik)\b/i.test(lower);
  if (isCasualSmallTalk) return null;

  // 2. EXCLUSION: Coding, programming, debugging, math, creative writing (unless explicitly instructed to search web)
  const hasExplicitWebDirective = /\b(cari\s+di\s+(internet|google|web)|cariin|coba\s+cari|tolong\s+cari|search\s+on\s+web|search\s+online|googling|browsing|cek\s+(di\s+)?(internet|google|web))\b/i.test(lower);

  if (!hasExplicitWebDirective) {
    // Code / programming queries
    const isCodeQuery = /\b(buatkan|tulis|bikin|contoh)?\s*(fungsi|function|kode|script|kodingan|program|syntax|algoritma|query sql|component react|css|html)\b/i.test(lower) ||
      /\b(kenapa error|cara fix error|debug|perbaiki kode|bug pada|exception in|undefined is not)\b/i.test(lower);
    if (isCodeQuery) return null;

    // Math / calculation queries
    const isMathQuery = /\b(hitung|berapakah hasil|pecahkan persamaan|rumus|integral|turunan|limit)\b/i.test(lower);
    if (isMathQuery) return null;

    // Creative writing
    const isCreativeQuery = /\b(buatkan|tuliskan|bikin|ciptakan)\s+(puisi|cerita|pantun|cerpen|novel|lirik lagu|dongeng)\b/i.test(lower);
    if (isCreativeQuery) return null;

    // Platform identity
    const isPlatformQuery = /\b(apa itu deepernova|fitur deepernova|siapa ferry fernando|ceo deepernova)\b/i.test(lower);
    if (isPlatformQuery) return null;
  }

  // 3. POSITIVE DETECTION: Clear search intent
  let matched = false;

  // Group A: Explicit search directives
  if (hasExplicitWebDirective || /^(cari|search|googling|browsing)\s+/i.test(lower)) {
    matched = true;
  }

  // Group B: Breaking news & current events
  if (!matched && /\b(berita\s+terbaru|berita\s+terkini|berita\s+hari\s+ini|kabar\s+terbaru|kabar\s+terkini|info\s+terkini|update\s+terbaru|breaking\s+news|peristiwa\s+terkini|isu\s+terkini|berita\s+viral)\b/i.test(lower)) {
    matched = true;
  }

  // Group C: News mentions with topic (e.g., "berita persib", "berita gempa", "kabar duka")
  if (!matched && /\b(berita|kabar|headline)\s+[a-z0-9]/i.test(lower) && !/\b(apa kabar|kabar baik|bikin berita|buat berita)\b/i.test(lower)) {
    matched = true;
  }

  // Group D: Real-time prices & financial rates
  if (!matched && /\b(harga\s+emas|harga\s+btc|harga\s+bitcoin|kurs\s+dollar|kurs\s+usd|kurs\s+rupiah|harga\s+bbm|ihsg|harga\s+saham)\b/i.test(lower)) {
    matched = true;
  }

  // Group E: Weather & Natural disasters
  if (!matched && /\b(cuaca\s+(hari\s+ini|besok|sekarang|di)|prakiraan\s+cuaca|suhu\s+udara|gempa\s+(hari\s+ini|terkini|barusan|bumi)|info\s+banjir|tsunami)\b/i.test(lower)) {
    matched = true;
  }

  // Group F: Sports / Schedules / Match results
  if (!matched && /\b(jadwal\s+(pertandingan|bola|siaran|tayang)|skor\s+(pertandingan|bola|akhir)|hasil\s+pertandingan|klasemen\s+(sementara|liga)|siapa\s+(juara|pemenang)\s+(piala dunia|liga|euro|ucl|champions|pemilu|pilpres))\b/i.test(lower)) {
    matched = true;
  }

  // Group G: Time-anchored current inquiries ("hari ini", "terkini", "terbaru", "saat ini", year 2025/2026 events)
  if (!matched && /\b(hari ini|terkini|terbaru|saat ini|teranyar)\b/i.test(lower) && /\b(siapa|apa|berapa|bagaimana|kapan|apakah|update|kejadian|peristiwa|kondisi|status)\b/i.test(lower)) {
    matched = true;
  }

  if (!matched) return null;

  // Extract clean search query
  let cleanQuery = trimmed;
  // Strip directive prefixes
  cleanQuery = cleanQuery.replace(/^(tolong\s+)?(coba\s+)?(cariin|carikan|cari\s+di\s+(internet|google|web)|cari\s+info\s+tentang|cari\s+tentang|cari|search\s+for|search\s+on\s+(web|internet|google)|search|googling|browsing|cek\s+di\s+(internet|google|web)|cek\s+web|cek\s+google|cek\s+info\s+tentang|cek)\s*:?\s*/i, '');
  // Strip conversational suffixes
  cleanQuery = cleanQuery.replace(/\s+(dong|ya|plis|please|bro|gan|min|sih|kah)\s*[?.!]*$/i, '');
  cleanQuery = cleanQuery.replace(/[?.!]+$/, '').trim();

  return {
    shouldSearch: true,
    searchQuery: cleanQuery || trimmed
  };
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

  // 🕒 Auto-inject current date for recent/latest searches
  const effectiveQuery = enrichQueryWithDateIfRecent(query, userPrompt, language);

  console.log(`[ClientSearchService] Executing search for: "${effectiveQuery}" (orig: "${query}", isGuest: ${isGuest}, limit: ${limit})`);

  // MODE GUEST: Direct Front-End Hit to Deepernova Search Engine (CORS enabled, no backend required)
  if (isGuest) {
    try {
      console.log('[ClientSearchService] 🚀 [GUEST MODE] Direct Front-End Hit to Deepernova Search Engine (BM25)');
      const directResult = await performDirectSearch(effectiveQuery, limit, includeImages);
      if (directResult) {
        return directResult;
      }
    } catch (guestErr) {
      console.warn('[ClientSearchService] Direct guest hit failed or blocked, falling back to proxy:', guestErr.message);
    }
  }

  // NON-GUEST or FALLBACK: Backend Search Proxy (always using BACKEND_BASE_URL)
  try {
    const backendProxyUrl = `${BACKEND_BASE_URL}/api/search?q=${encodeURIComponent(effectiveQuery)}&limit=${limit}`;
    console.log('[ClientSearchService] Fetching search via backend proxy:', backendProxyUrl);
    const response = await fetch(backendProxyUrl, {
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
      const fallbackResult = await performDirectSearch(effectiveQuery, limit, includeImages);
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
  detectUpfrontSearchIntent,
  enrichQueryWithDateIfRecent,
  API_BASE_URL,
  API_KEY
};

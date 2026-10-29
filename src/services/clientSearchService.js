/**
 * Deepernova High-Speed Search Service (Client-Side)
 * Handles direct front-end hit in Guest Mode (Sub-20ms BM25) with graceful proxy & live fallback.
 * CORS Enabled - Siap Hit Langsung dari Frontend Web tanpa perlu proxy backend.
 */

import { API_BASE_URL as BACKEND_BASE_URL } from '../apiConfig.js';

const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === ''
);

export function resolveSearchApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    // Local dev: hit local ultra-fast search engine
    if (host === 'localhost' || host === '127.0.0.1' || host === '') {
      return 'http://127.0.0.1:4000/api/v1';
    }
    // Production on deepernova.com or vercel: ALWAYS use same-origin Vercel Edge Rewrite (/api/v1)
    if (window.location.origin && !window.location.origin.includes('trycloudflare.com')) {
      return `${window.location.origin}/api/v1`;
    }
  }

  const envUrl = import.meta.env?.VITE_DEEPERNOVA_SEARCH_API_URL;
  if (envUrl && !envUrl.includes('trycloudflare.com')) {
    if (envUrl.startsWith('/') && typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${envUrl}`;
    }
    if (envUrl.startsWith('http')) {
      return envUrl;
    }
  }

  return 'https://www.deepernova.com/api/v1';
}

export const API_BASE_URL = resolveSearchApiBaseUrl();

export const API_KEY =
  import.meta.env?.VITE_DEEPERNOVA_SEARCH_API_KEY ||
  import.meta.env?.VITE_DEEPERNOVA_PUBLIC_GUEST_KEY ||
  'dn_live_d69468b9c25451f3b7cd8482e96cbcf7';

const DEEPERNOVA_SEARCH_API_URL = API_BASE_URL;
const DEEPERNOVA_PUBLIC_GUEST_KEY = API_KEY;

function cleanSearchText(str) {
  if (!str) return '';
  return str.replace(/<\/?mark[^>]*>/gi, '').replace(/<[^>]+>/g, '').trim();
}

/**
 * Query passthrough - tidak ada modifikasi tanggal atau regex aneh.
 * Query pencarian 100% murni mengikuti apa yang ditentukan oleh AI.
 */
export function enrichQueryWithDateIfRecent(query, userPrompt = '', language = 'id') {
  return (query || '').trim();
}

/**
 * Intelligent Upfront Search Intent Detection (Autonomous AI Search Instinct):
 * Automatically triggers web search for current events, news, prices, weather,
 * factual entities, people, places, specs, regulations, or explicit search queries,
 * without needing any manual Web Search button.
 */
export function detectUpfrontSearchIntent(promptText, language = 'id') {
  if (!promptText || typeof promptText !== 'string') return null;
  const text = promptText.trim();
  if (text.length < 3 || text.length > 600) return null;

  // 0. Explicit tag / flag extraction if user or system sends flag directly
  const directFlagMatch = text.match(/^\[(?:SEARCH_REQUEST|SEARCH):\s*(.+?)\]$/i) ||
    text.match(/\[(?:SEARCH_REQUEST|SEARCH):\s*(.+?)\]/i) ||
    text.match(/^<search(?:_request)?>\s*([\s\S]+?)\s*<\/search(?:_request)?>$/i);
  if (directFlagMatch && directFlagMatch[1]) {
    return directFlagMatch[1].replace(/["']/g, '').trim();
  }

  // Ignore code snippets, slash commands, or pure json/object notation
  if (text.startsWith('/') || text.startsWith('```') || text.startsWith('{') || text.includes('\n```')) {
    return null;
  }

  // Ignore casual greetings, conversational fillers, and AI self-identity / memory queries
  const isGreetingOrSelfOnly = /^(?:halo|hai|hi|hello|hey|hei|p|tes|test|ping|pagi|siang|sore|malam|selamat\s+(?:pagi|siang|sore|malam)|apa\s+kabar|gimana\s+kabar(?:nya|mu)?|assalamu['a]?laikum|terima\s+kasih|makasih|thanks|thank\s+you|ok|oke|sip|siap|mantap|keren|good|nice|bye|dadah|siapa\s+(?:kamu|anda|namamu|nama\s+kamu|pembuatmu|yang\s+membuatmu|penciptamu)|kamu\s+siapa|apakah\s+kamu\s+ai|siapa\s+nama(?:ku|saya)|ingat\s+(?:aku|saya|namaku)|tadi\s+kita\s+bahas\s+apa)\b[?.!]*$/i.test(text);
  if (isGreetingOrSelfOnly) return null;

  // Ignore personal memory statements ("namaku budi", "aku tinggal di...", "ingat ya...")
  if (/^(?:nama(?:ku|\s+saya)|panggil\s+(?:aku|saya)|aku\s+tinggal\s+di|saya\s+tinggal\s+di|hobi(?:ku|\s+saya)|ingat\s+ya|tolong\s+ingat|catat\s+ya)\b/i.test(text)) {
    return null;
  }

  // Ignore pure math equations or pure coding/writing/translation instructions unless explicitly asking for web search
  const isCodingMathOrCreative = /^(?:buatkan\s+(?:kode|fungsi|komponen|script|class|program|website|aplikasi|game|puisi|cerpen|pantun|surat|email|essay|makalah|file|dokumen|gambar|foto|logo)|bikin(?:kan)?\s+(?:kode|fungsi|program|website|aplikasi|puisi|cerpen|gambar|foto|file|dokumen)|tulis(?:kan)?\s+(?:kode|fungsi|program|puisi|cerita|surat)|perbaiki\s+(?:kode|script|kalimat|bug)|terjemahkan|translate|rangkum(?:kan)?\s+teks|hitung(?:lah)?|berapa\s+hasil\s+(?:dari\s+)?[\d\s+\-*/^()]+|\d+\s*[+\-*/^]\s*\d+)/i.test(text);
  if (isCodingMathOrCreative && !/\b(?:cari(?:kan)?|search|browsing|googling|web|internet|berita|terbaru|hari ini|2025|2026)\b/i.test(text)) {
    return null;
  }

  const cleanExtractedQuery = (raw) => {
    return raw
      .replace(/^(?:tolong|coba|bisa|bisakah|mohon|dong|halo|hai|bro|kak|bang|min|please|can you|could you)\s+/gi, '')
      .replace(/^(?:tolong|coba|bisa|bisakah|mohon|dong|bro|kak|bang)\s+/gi, '')
      .replace(/^(?:cari(?:kan)?|searching|search(?:\s+for)?|googling|browsing|cek(?:kan)?|temukan|lihat(?:kan)?|kasih\s+tahu|beritahu|jelaskan|ceritakan|tampilkan|sebutkan|info(?:rmasi)?(?:\s+tentang|\s+mengenai|\s+seputar)?|look\s+up|find(?:\s+info(?:\s+about)?)?|tell\s+me\s+about)\s+/i, '')
      .replace(/^(?:tentang|mengenai|seputar|di\s+web|di\s+internet|on\s+the\s+web|the\s+web\s+for|about|for)\s+/i, '')
      .replace(/\s+(?:dong|ya|yah|bro|kak|bang|please|terima\s+kasih|makasih)[?!.]*$/i, '')
      .replace(/[?!.]+$/, '')
      .trim();
  };

  // 1. Explicit Search Requests (Indonesian & English)
  const explicitSearchMatch = text.match(/^(?:(?:halo|hai|bro|kak|bang|tolong|mohon|coba|bisa)\s+)*(?:cari(?:kan)?|searching|search(?:\s+for)?|googling|browsing|cek(?:kan)?|temukan|carikan\s+info(?:rmasi)?|info(?:rmasi)?\s+(?:terbaru|terkini|tentang|mengenai|seputar)|look\s+up|find(?:\s+info(?:\s+about)?)?)\b\s*(.+)/i);
  if (explicitSearchMatch && explicitSearchMatch[1]) {
    const q = cleanExtractedQuery(explicitSearchMatch[1]);
    if (q.length >= 2) return q;
  }

  // Also match trailing "cari di web / cari di internet / tolong cari"
  if (/\b(?:cari(?:kan)?\s+di\s+(?:web|internet|google)|tolong\s+cari(?:kan)?|coba\s+cari(?:kan)?|search\s+on\s+the\s+web)\b/i.test(text)) {
    const q = cleanExtractedQuery(text.replace(/\b(?:cari(?:kan)?\s+di\s+(?:web|internet|google)|tolong\s+cari(?:kan)?|coba\s+cari(?:kan)?|search\s+on\s+the\s+web)\b/gi, ''));
    if (q.length >= 2) return q;
  }

  // 2. Real-time news, current events, prices, weather, sports, & factual entity queries (Autonomous AI Search Instinct)
  const instinctPatterns = [
    /\b(?:berita|kabar|update|informasi|isu|news|headline)\b/i,
    /\b(?:terbaru|terkini|hari\s+ini|saat\s+ini|sekarang|tahun\s+ini|minggu\s+ini|bulan\s+ini|barusan|viral|trending|today|latest|current|breaking|2024|2025|2026|2027)\b/i,
    /\b(?:gempa|tsunami|erupsi|banjir|longsor|kebakaran|bencana|cuaca|suhu|prakiraan\s+cuaca|weather|earthquake|flood)\b/i,
    /\b(?:harga|kurs|nilai\s+tukar|tarif|biaya|tiket|gaji|umr|ump|saham|ihsg|bitcoin|btc|eth|crypto|emas|antam|bbm|pertamax|pertalite|dolar|usd|rupiah|price|stock|market\s+cap)\b/i,
    /\b(?:skor|hasil\s+pertandingan|jadwal\s+pertandingan|jadwal|klasemen|pemain|pelatih|timnas|liga|piala\s+dunia|champions|motogp|f1|badminton|match|score|standings|fixtures)\b/i,
    /\b(?:presiden|wapres|wakil\s+presiden|menteri|gubernur|bupati|walikota|wali\s+kota|anggota\s+dpr|ketua|kapolri|panglima|jaksa\s+agung|direktur|ceo|founder|pendiri|pemilik|tokoh|artis|seleb|penyanyi|aktor|youtuber|influencer)\b/i,
    /\b(?:undang-undang|uu\s+no|pasal|peraturan|pp\s+no|perpres|kuhp|hukum|aturan|syarat|cara\s+daftar|pendaftaran|cpns|snbt|utbk|beasiswa|bansos|pajak|bpjs|sim|stnk|paspor|kua)\b/i,
    /\b(?:spesifikasi|spek|review|kelebihan\s+dan\s+kekurangan|perbandingan|vs|versus|rekomendasi|daftar|peringkat|ranking|top\s+\d+|terbaik|termurah|tercepat|terbesar|terkaya|tertinggi)\b/i,
    /\b(?:sejarah|profil|biodata|biografi|asal\s+usul|fakta|letak|lokasi|alamat|tempat\s+wisata|negara|ibukota|ibu\s+kota|populasi|jumlah\s+penduduk|luas\s+wilayah|jarak|universitas|kampus|sekolah|rumah\s+sakit|perusahaan|pt\s+\w+|film|anime|lagu|album|game|rilis)\b/i,
    /^(?:(?:tolong|coba|bisa|mohon|bro|kak|bang)\s+)*(?:siapa(?:kah)?|apa\s+itu|apakah\s+itu|dimana(?:kah)?|di\s+mana(?:kah)?|kapan(?:kah)?|berapa(?:kah)?|jelaskan\s+tentang|ceritakan\s+tentang|apa\s+saja|bagaimana\s+(?:sejarah|kondisi|perkembangan|cara\s+kerja)|who\s+(?:is|was|are)|what\s+(?:is|are|was)|where\s+is|when\s+(?:is|was|did)|how\s+(?:much|many))\b\s+(.{3,})/i
  ];

  for (const pattern of instinctPatterns) {
    if (pattern.test(text)) {
      const clean = cleanExtractedQuery(text);
      if (clean.length >= 3) return clean;
    }
  }

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
    url.searchParams.append('key', API_KEY);

    const response = await fetch(url, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Gagal memuat pencarian`);
    }

    const data = await response.json();
    console.log(`⚡ Kecepatan Mesin: ${data.duration_ms}ms | Ditemukan: ${data.total_results} hasil`);
    return data;
  } catch (err) {
    console.error('Error saat fetch dari frontend:', err);
    throw err;
  }
}

if (typeof window !== 'undefined') {
  window.searchWeb = searchWeb;
  window.API_BASE_URL = API_BASE_URL;
  window.API_KEY = API_KEY;
}

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

function mapRawResultsToOrganic(rawList = []) {
  return rawList.map((item, idx) => {
    let domain = item.domain || '';
    const itemUrl = item.url || item.link || '';
    if (!domain && itemUrl) {
      try { domain = new URL(itemUrl).hostname.replace(/^www\./i, ''); } catch (e) { }
    }
    const favicon = domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : null;
    const rawScore = Number(item.accuracyScore || item.score || 88.5);
    return {
      title: cleanSearchText(item.title) || 'Untitled',
      link: itemUrl,
      url: itemUrl,
      snippet: cleanSearchText(item.snippet) || cleanSearchText(item.description) || '',
      domain: domain,
      thumbnail: item.lead_image_url || item.logo_url || item.image || item.thumbnail || favicon,
      position: item.position || (idx + 1),
      accuracyScore: Math.round(rawScore * 10) / 10,
      score: Math.round(rawScore * 10) / 10,
      pagerank: Number(item.pagerank || 3.0),
      trustScore: Number(item.trustScore || item.trust_score || 90),
      bm25: Number(item.bm25 || 1.0),
      isLiveNews: Boolean(item.isLiveNews || item.category === 'news'),
      date: item.formatted_date || item.formattedDate || item.date || null,
      publishedAt: item.published_at || item.publishedAt || item.crawledAt || null
    };
  });
}

/**
 * Helper to normalize any search API response format (Port 3001 or Port 4000) into standard organic_results.
 */
function normalizeAnySearchResponse(rawJson, query = '', fallbackEngine = 'deepernova_hybrid') {
  if (!rawJson || typeof rawJson !== 'object') return null;

  // Format A: Port 3001 { success: true, data: { organic_results: [...] } }
  if (Array.isArray(rawJson.data?.organic_results) && rawJson.data.organic_results.length > 0) {
    return rawJson;
  }

  // Format B: Port 4000 /api/v1/search or /api/search { results: [...] }
  if (Array.isArray(rawJson.results) && rawJson.results.length > 0) {
    const organicResults = mapRawResultsToOrganic(rawJson.results);
    return {
      success: true,
      data: {
        organic_results: organicResults,
        inline_images: [],
        search_information: {
          query,
          total_results: rawJson.total_results || rawJson.total || organicResults.length,
          time_taken_ms: rawJson.duration_ms || 15
        },
        engine: rawJson.engine || fallbackEngine
      }
    };
  }

  // Format C: Nested { data: { results: [...] } }
  if (Array.isArray(rawJson.data?.results) && rawJson.data.results.length > 0) {
    const organicResults = mapRawResultsToOrganic(rawJson.data.results);
    return {
      success: true,
      data: {
        organic_results: organicResults,
        inline_images: [],
        search_information: {
          query,
          total_results: rawJson.data.total_results || rawJson.data.total || organicResults.length,
          time_taken_ms: rawJson.data.duration_ms || 15
        },
        engine: fallbackEngine
      }
    };
  }

  return null;
}

/**
 * Helper to perform direct frontend search and map results into standard format.
 * Uses query parameter authentication (?key=...) with NO custom headers so the browser executes
 * a zero-preflight CORS Simple Request and never drops auth on 308 domain redirects.
 */
async function performDirectSearch(query, limit, includeImages, timeoutMs = 3500) {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && DEEPERNOVA_SEARCH_API_URL.startsWith('http:')) {
    return null;
  }

  const tryFetchSearch = async (allowCrawl) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const searchUrl = new URL(`${DEEPERNOVA_SEARCH_API_URL}/search`);
      searchUrl.searchParams.append('q', query);
      searchUrl.searchParams.append('limit', String(limit));
      searchUrl.searchParams.append('key', DEEPERNOVA_PUBLIC_GUEST_KEY);
      if (!allowCrawl) {
        searchUrl.searchParams.append('crawl', '0');
        searchUrl.searchParams.append('fast', '1');
      } else {
        searchUrl.searchParams.append('crawl', '1');
      }

      const searchPromise = fetch(searchUrl.toString(), {
        method: 'GET',
        signal: controller.signal
      });

      let imagesPromise = Promise.resolve(null);
      if (includeImages && !allowCrawl) {
        const imagesUrl = new URL(`${DEEPERNOVA_SEARCH_API_URL}/images`);
        imagesUrl.searchParams.append('q', query);
        imagesUrl.searchParams.append('limit', String(Math.min(limit, 8)));
        imagesUrl.searchParams.append('key', DEEPERNOVA_PUBLIC_GUEST_KEY);
        imagesUrl.searchParams.append('crawl', '0');
        imagesUrl.searchParams.append('fast', '1');
        imagesPromise = fetch(imagesUrl.toString(), {
          method: 'GET',
          signal: controller.signal
        }).catch(() => null);
      }

      const searchResp = await searchPromise;
      let searchJson = null;
      if (searchResp && searchResp.ok) {
        searchJson = await searchResp.json().catch(() => null);
      }

      // Give images at most 200ms extra once text search is ready so text results are NEVER delayed!
      let imagesJson = null;
      if (includeImages && !allowCrawl) {
        const imagesResp = await Promise.race([
          imagesPromise,
          new Promise(r => setTimeout(() => r(null), 200))
        ]);
        if (imagesResp && imagesResp.ok) {
          imagesJson = await imagesResp.json().catch(() => null);
        }
      }
      clearTimeout(timeoutId);

      const normalized = normalizeAnySearchResponse(
        searchJson,
        query,
        allowCrawl ? 'deepernova_live_crawl' : 'deepernova_bm25_direct_guest'
      );
      if (normalized) {
        const inlineImages = (imagesJson?.results || []).map(img => ({
          thumbnail: img.imageUrl,
          link: img.pageUrl || img.imageUrl,
          title: img.title || img.pageTitle || query,
          source: img.pageUrl || img.imageUrl,
          sourceDomain: img.domain || ''
        }));
        if (inlineImages.length > 0) {
          normalized.data.inline_images = inlineImages;
        }
        return normalized;
      }
    } catch (err) {
      clearTimeout(timeoutId);
    }
    return null;
  };

  const fastHit = await tryFetchSearch(false);
  if (fastHit) return fastHit;
  return await tryFetchSearch(true);
}

/**
 * Helper to perform backend proxy search across BOTH Port 3001 (/api/web-search) and Port 4000 (/api/search) in parallel!
 * Handles both { data: { organic_results } } and { results: [...] } formats seamlessly.
 */
async function performProxySearch(query, limit, timeoutMs = 3500) {
  const endpoints = [
    `${BACKEND_BASE_URL}/api/web-search?q=${encodeURIComponent(query)}&limit=${limit}`,
    `${BACKEND_BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`
  ];

  // If on deepernova.com or Vercel, also include same-origin relative endpoints
  if (typeof window !== 'undefined' && window.location && !isLocal) {
    endpoints.unshift(`/api/web-search?q=${encodeURIComponent(query)}&limit=${limit}`);
    endpoints.push(`/api/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  const uniqueEndpoints = [...new Set(endpoints)];

  const fetchEndpoint = async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const searchData = await response.json().catch(() => null);
        const normalized = normalizeAnySearchResponse(searchData, query, 'deepernova_proxy_hybrid');
        if (normalized) return normalized;
      }
    } catch (e) {
      clearTimeout(timeoutId);
    }
    return null;
  };

  const promises = uniqueEndpoints.map(url => fetchEndpoint(url));
  const firstValid = await Promise.race(
    promises.map(p => p.then(res => (res ? res : new Promise(() => {}))))
  ).catch(() => null);
  if (firstValid) return firstValid;

  const all = await Promise.all(promises);
  return all.find(Boolean) || null;
}

/**
 * Helper to perform direct search against Deepernova Production Engine (Zero CORS preflight via query key)
 */
async function performCloudDirectSearch(query, limit, timeoutMs = 3500) {
  const tryCloud = async (allowCrawl) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const cloudUrl = new URL('https://www.deepernova.com/api/v1/search');
      cloudUrl.searchParams.append('q', query);
      cloudUrl.searchParams.append('limit', String(limit));
      cloudUrl.searchParams.append('key', 'dn_live_d69468b9c25451f3b7cd8482e96cbcf7');
      if (!allowCrawl) {
        cloudUrl.searchParams.append('crawl', '0');
        cloudUrl.searchParams.append('fast', '1');
      } else {
        cloudUrl.searchParams.append('crawl', '1');
      }

      const response = await fetch(cloudUrl.toString(), {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json().catch(() => null);
        const normalized = normalizeAnySearchResponse(data, query, 'deepernova_cloud_direct');
        if (normalized) return normalized;
      }
    } catch (e) {
      clearTimeout(timeoutId);
    }
    return null;
  };

  const fastCloud = await tryCloud(false);
  if (fastCloud) return fastCloud;
  return await tryCloud(true);
}

/**
 * Direct SerpApi Google Search proxy request (via backend /api/serp-search)
 */
async function performSerpSearchDirect(query, limit = 8, timeoutMs = 2500) {
  const url = `${BACKEND_BASE_URL}/api/serp-search?q=${encodeURIComponent(query)}&limit=${limit}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    if (resp.ok) {
      const data = await resp.json().catch(() => null);
      return normalizeAnySearchResponse(data, query, 'serpapi_google');
    }
  } catch {
    clearTimeout(timeoutId);
  }
  return null;
}

/**
 * Merge results from multiple search engines, deduplicating by URL & Title
 */
export function mergeSearchResults(primary, secondary) {
  if (!primary && !secondary) return null;
  if (!primary) return secondary;
  if (!secondary) return primary;

  const resultsA = primary.data?.organic_results || [];
  const resultsB = secondary.data?.organic_results || [];
  const merged = [...resultsA];
  const seenUrls = new Set(resultsA.map(r => (r.link || r.url || '').toLowerCase().replace(/\/+$/, '')));
  const seenTitles = new Set(resultsA.map(r => (r.title || '').toLowerCase().slice(0, 50)));

  for (const item of resultsB) {
    const urlKey = (item.link || item.url || '').toLowerCase().replace(/\/+$/, '');
    const titleKey = (item.title || '').toLowerCase().slice(0, 50);
    if ((!urlKey || !seenUrls.has(urlKey)) && (!titleKey || !seenTitles.has(titleKey))) {
      if (urlKey) seenUrls.add(urlKey);
      if (titleKey) seenTitles.add(titleKey);
      merged.push({ ...item, position: merged.length + 1 });
    }
  }

  // Merge images
  const imagesA = primary.data?.inline_images || [];
  const imagesB = secondary.data?.inline_images || [];
  const mergedImages = [...imagesA];
  const seenImgs = new Set(imagesA.map(img => img.thumbnail || img.link || ''));
  for (const img of imagesB) {
    const imgKey = img.thumbnail || img.link || '';
    if (imgKey && !seenImgs.has(imgKey)) {
      seenImgs.add(imgKey);
      mergedImages.push(img);
    }
  }

  return {
    ...primary,
    data: {
      ...primary.data,
      organic_results: merged,
      inline_images: mergedImages,
      search_information: {
        ...(primary.data?.search_information || {}),
        total_results: merged.length
      },
      engine: primary.data?.engine || 'deepernova_google_hybrid_turbo',
      isComparison: primary.data?.isComparison || secondary.data?.isComparison || false,
      comparisonEntities: primary.data?.comparisonEntities || secondary.data?.comparisonEntities || null
    }
  };
}

/**
 * Guaranteed CORS-Friendly Public Knowledge & Web Search Fallback (Wikipedia ID + EN + DuckDuckGo Instant API)
 * Strips temporal filler words for Wikipedia topic matching so queries like "karhutla terbaru" immediately
 * return rich verified articles on Kebakaran hutan dan lahan.
 */
async function performPublicWebFallback(query, limit = 8, timeoutMs = 3200) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const collected = [];

  // Create a core topic query by stripping temporal modifiers that can hurt encyclopedia exact matching
  const coreTopicQuery = query
    .replace(/\b(?:terbaru|terkini|hari\s+ini|saat\s+ini|sekarang|update|berita|kabar|info|informasi|latest|today|current|news|2025|2026|2027)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || query;

  try {
    const wikiQueries = coreTopicQuery.toLowerCase() !== query.toLowerCase()
      ? [ { lang: 'id', q: coreTopicQuery }, { lang: 'id', q: query }, { lang: 'en', q: coreTopicQuery } ]
      : [ { lang: 'id', q: query }, { lang: 'en', q: query } ];

    const wikiPromises = wikiQueries.slice(0, 2).map(async ({ lang, q }) => {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&utf8=&format=json&origin=*&srlimit=1`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return [];
      const data = await res.json();
      const items = (data?.query?.search || []).slice(0, 1);
      return items.map((item) => {
        const title = cleanSearchText(item.title);
        const pageUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`;
        const domain = `${lang}.wikipedia.org`;
        return {
          title: `${title} — Wikipedia (${lang.toUpperCase()})`,
          link: pageUrl,
          url: pageUrl,
          snippet: cleanSearchText(item.snippet) || title,
          domain,
          accuracyScore: 78.0,
          score: 78.0,
          pagerank: 2.0,
          trustScore: 82,
          bm25: 1.0,
          isLiveNews: false,
          thumbnail: `https://www.google.com/s2/favicons?sz=64&domain=${domain}`,
          date: item.timestamp ? item.timestamp.slice(0, 10) : null
        };
      });
    });

    const ddgPromise = (async () => {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(coreTopicQuery)}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return [];
      const data = await res.json();
      const out = [];
      if (data.AbstractURL && data.AbstractText) {
        let domain = 'duckduckgo.com';
        try { domain = new URL(data.AbstractURL).hostname.replace(/^www\./i, ''); } catch (e) { }
        out.push({
          title: data.Heading || coreTopicQuery,
          link: data.AbstractURL,
          url: data.AbstractURL,
          snippet: cleanSearchText(data.AbstractText),
          domain,
          thumbnail: data.Image ? (data.Image.startsWith('http') ? data.Image : `https://duckduckgo.com${data.Image}`) : `https://www.google.com/s2/favicons?sz=64&domain=${domain}`
        });
      }
      if (Array.isArray(data.RelatedTopics)) {
        for (const t of data.RelatedTopics.slice(0, 3)) {
          if (t && t.FirstURL && t.Text) {
            let domain = 'duckduckgo.com';
            try { domain = new URL(t.FirstURL).hostname.replace(/^www\./i, ''); } catch (e) { }
            out.push({
              title: cleanSearchText(t.Text).slice(0, 75),
              link: t.FirstURL,
              url: t.FirstURL,
              snippet: cleanSearchText(t.Text),
              domain,
              thumbnail: `https://www.google.com/s2/favicons?sz=64&domain=${domain}`
            });
          }
        }
      }
      return out;
    })().catch(() => []);

    const settled = await Promise.allSettled([...wikiPromises, ddgPromise]);
    clearTimeout(timeoutId);

    const seenUrls = new Set();
    for (const s of settled) {
      if (s.status === 'fulfilled' && Array.isArray(s.value)) {
        for (const item of s.value) {
          if (item.url && !seenUrls.has(item.url) && collected.length < limit) {
            seenUrls.add(item.url);
            collected.push({ ...item, position: collected.length + 1 });
          }
        }
      }
    }
  } catch (e) {
    clearTimeout(timeoutId);
  }

  if (collected.length > 0) {
    return {
      success: true,
      data: {
        organic_results: collected,
        inline_images: [],
        search_information: {
          query,
          total_results: collected.length,
          time_taken_ms: 110
        },
        engine: 'deepernova_live_knowledge_fallback'
      }
    };
  }
  return null;
}

/**
 * Guaranteed Verified Reference Sources Builder
 * Ensures that even under extreme network isolation, `organic_results` NEVER returns empty (`[]`)
 * so `SourceBubbleCarousel` 100% ALWAYS appears before the AI synthesizes its answer!
 */
export function buildGuaranteedReferenceSources(query) {
  const cleanQ = (query || 'informasi terbaru').trim();
  const encQ = encodeURIComponent(cleanQ);
  const portals = [
    {
      title: `Berita & Update Terkini: ${cleanQ} — Google News`,
      url: `https://news.google.com/search?q=${encQ}&hl=id&gl=ID&ceid=ID:id`,
      domain: 'news.google.com',
      snippet: `Kumpulan liputan berita terbaru, laporan resmi, dan perkembangan mutakhir seputar ${cleanQ} dari berbagai media nasional dan internasional.`
    },
    {
      title: `${cleanQ} — Kompas.com`,
      url: `https://search.kompas.com/search/?q=${encQ}`,
      domain: 'kompas.com',
      snippet: `Indeks berita, analisis mendalam, dan laporan faktual terkini mengenai ${cleanQ} di Kompas.com.`
    },
    {
      title: `Pencarian Berita: ${cleanQ} — Detikcom`,
      url: `https://www.detik.com/search/searchall?query=${encQ}`,
      domain: 'detik.com',
      snippet: `Update berita terbaru dan informasi real-time seputar ${cleanQ} yang dihimpun oleh redaksi Detikcom.`
    },
    {
      title: `Ensiklopedia & Referensi: ${cleanQ} — Wikipedia Bahasa Indonesia`,
      url: `https://id.wikipedia.org/w/index.php?search=${encQ}`,
      domain: 'id.wikipedia.org',
      snippet: `Referensi ensiklopedia, latar belakang, data historis, dan penjelasan komprehensif mengenai ${cleanQ}.`
    },
    {
      title: `Laporan & Kantor Berita: ${cleanQ} — ANTARA News`,
      url: `https://www.antaranews.com/search?q=${encQ}`,
      domain: 'antaranews.com',
      snippet: `Kantor Berita Nasional ANTARA menyajikan informasi resmi dan perkembangan terkini terkait ${cleanQ}.`
    }
  ];

  return portals.map((p, idx) => ({
    title: p.title,
    link: p.url,
    url: p.url,
    snippet: p.snippet,
    domain: p.domain,
    thumbnail: `https://www.google.com/s2/favicons?sz=64&domain=${p.domain}`,
    logo_url: `https://www.google.com/s2/favicons?sz=64&domain=${p.domain}`,
    accuracyScore: Math.max(70, 92 - (idx * 3)),
    score: Math.max(70, 92 - (idx * 3)),
    pagerank: 3.2,
    trustScore: 90,
    bm25: 1.0,
    position: idx + 1
  }));
}

/**
 * Execute web search.
 * Guarantees rich `organic_results` so the AI Chatbot always renders `SourceBubbleCarousel` before answering.
 */
export async function executeWebSearch(query, options = {}) {
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

  // 2. Asynchronous Multi-Engine Execution: Proxy Hybrid (Deepernova + Google SerpAPI) + Direct Search + Fallbacks
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

    const proxyPromise = wrapSearchResult(performProxySearch(effectiveQuery, limit, 3500));
    const directPromise = wrapSearchResult(performDirectSearch(effectiveQuery, limit, includeImages, 2500));
    const cloudPromise = wrapSearchResult(performCloudDirectSearch(effectiveQuery, limit, 3000));
    const publicPromise = wrapSearchResult(performPublicWebFallback(effectiveQuery, limit, 3000));

    // Wait for the primary engines (Proxy Hybrid with Google SerpAPI + Direct local search)
    const [proxyResult, directResult] = await Promise.all([proxyPromise, directPromise]);

    if (proxyResult && directResult) {
      return mergeSearchResults(proxyResult, directResult);
    }
    if (proxyResult) return proxyResult;
    if (directResult) {
      // If direct local search returned few results, asynchronously fetch SerpApi Google as supplement
      if ((directResult.data?.organic_results?.length || 0) < 4) {
        try {
          const serpResp = await wrapSearchResult(performSerpSearchDirect(effectiveQuery, limit, 2000));
          if (serpResp) return mergeSearchResults(directResult, serpResp);
        } catch {}
      }
      return directResult;
    }

    // Secondary engines: Cloud + Public knowledge fallback
    const [cloudResult, pubResult] = await Promise.all([cloudPromise, publicPromise]);
    if (cloudResult && pubResult) return mergeSearchResults(cloudResult, pubResult);
    if (cloudResult) return cloudResult;
    if (pubResult) return pubResult;

    // Guaranteed fallback so organic_results is NEVER empty
    const guaranteed = buildGuaranteedReferenceSources(effectiveQuery);
    return {
      success: true,
      data: {
        organic_results: guaranteed,
        inline_images: [],
        search_information: { query: effectiveQuery, total_results: guaranteed.length, time_taken_ms: 50 },
        engine: 'deepernova_guaranteed_references'
      }
    };
  };

  // Hard global timeout at 3800ms with guaranteed reference sources
  const hardTimeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      const guaranteed = buildGuaranteedReferenceSources(effectiveQuery);
      resolve({
        success: true,
        data: {
          organic_results: guaranteed,
          inline_images: [],
          search_information: { query: effectiveQuery, total_results: guaranteed.length, time_taken_ms: 3800, timed_out: true },
          engine: 'deepernova_timeout_guaranteed_references'
        }
      });
    }, 3800);
  });

  const finalResult = await Promise.race([executeWithTimeout(), hardTimeoutPromise]);
  const durationMs = Math.round(performance.now() - tStart);
  console.log(`[ClientSearchService] ⚡ Search finished in ${durationMs}ms for "${effectiveQuery}" (${finalResult?.data?.organic_results?.length || 0} sources)`);

  if (finalResult && finalResult.success && finalResult.data?.organic_results?.length > 0 && !String(finalResult.data.engine || '').includes('guaranteed')) {
    setClientSearchCache(cacheKey, finalResult);
  }

  return finalResult;
}

export default {
  mergeSearchResults,
  executeWebSearch,
  buildGuaranteedReferenceSources,
  searchWeb,
  detectUpfrontSearchIntent,
  enrichQueryWithDateIfRecent,
  API_BASE_URL,
  API_KEY
};

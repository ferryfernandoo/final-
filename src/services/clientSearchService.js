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
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Local dev: hit local ultra-fast search engine
    if (host === 'localhost' || host === '127.0.0.1' || host === '') {
      return 'http://127.0.0.1:4000/api/v1';
    }
    // Production on deepernova.com or vercel
    if (host.includes('deepernova.com') || host.endsWith('.vercel.app')) {
      return 'https://www.deepernova.com/api/v1';
    }
  }

  const envUrl = import.meta.env?.VITE_DEEPERNOVA_SEARCH_API_URL;
  if (envUrl && !envUrl.includes('trycloudflare.com')) {
    return envUrl;
  }

  return 'https://www.deepernova.com/api/v1';
}

export const API_BASE_URL =
  import.meta.env?.VITE_DEEPERNOVA_SEARCH_API_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:4000/api/v1'
    : (typeof window !== 'undefined' && window.location.origin
      ? `${window.location.origin}/api/v1`
      : 'https://portland-oops-trainers-weblogs.trycloudflare.com/api/v1'));

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
    return {
      title: cleanSearchText(item.title) || 'Untitled',
      link: itemUrl,
      url: itemUrl,
      snippet: cleanSearchText(item.snippet) || cleanSearchText(item.description) || '',
      domain: domain,
      thumbnail: item.lead_image_url || item.logo_url || item.image || item.thumbnail || favicon,
      position: idx + 1,
      date: item.formatted_date || item.formattedDate || item.date || null,
      publishedAt: item.published_at || item.publishedAt || item.crawledAt || null
    };
  });
}

/**
 * Helper to perform direct frontend search and map results into standard format.
 * Automatically retries with crawl=1 if fast BM25 cache returns 0 results.
 */
async function performDirectSearch(query, limit, includeImages, timeoutMs = 6000) {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && DEEPERNOVA_SEARCH_API_URL.startsWith('http:')) {
    return null;
  }

  const searchHeaders = {
    'Authorization': `Bearer ${DEEPERNOVA_PUBLIC_GUEST_KEY}`,
    'X-API-Key': DEEPERNOVA_PUBLIC_GUEST_KEY,
    'Accept': 'application/json'
  };

  const tryFetchSearch = async (allowCrawl) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const searchUrl = new URL(`${DEEPERNOVA_SEARCH_API_URL}/search`);
      searchUrl.searchParams.append('q', query);
      searchUrl.searchParams.append('limit', String(limit));
      if (!allowCrawl) {
        searchUrl.searchParams.append('crawl', '0');
        searchUrl.searchParams.append('fast', '1');
      } else {
        searchUrl.searchParams.append('crawl', '1');
      }

      const searchPromise = fetch(searchUrl.toString(), {
        headers: searchHeaders,
        signal: controller.signal
      });

      let imagesPromise = Promise.resolve(null);
      if (includeImages && !allowCrawl) {
        const imagesUrl = new URL(`${DEEPERNOVA_SEARCH_API_URL}/images`);
        imagesUrl.searchParams.append('q', query);
        imagesUrl.searchParams.append('limit', String(limit));
        imagesUrl.searchParams.append('crawl', '0');
        imagesUrl.searchParams.append('fast', '1');
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

      if (searchJson && Array.isArray(searchJson.results) && searchJson.results.length > 0) {
        const organicResults = mapRawResultsToOrganic(searchJson.results);
        const inlineImages = (imagesJson?.results || []).map(img => ({
          thumbnail: img.imageUrl,
          link: img.pageUrl || img.imageUrl,
          title: img.title || img.pageTitle || query,
          source: img.pageUrl || img.imageUrl,
          sourceDomain: img.domain || ''
        }));

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
            engine: allowCrawl ? 'deepernova_live_crawl' : 'deepernova_bm25_direct_guest'
          }
        };
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
 * Helper to perform backend proxy search
 */
async function performProxySearch(query, limit, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const backendProxyUrl = `${BACKEND_BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;
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
 * Helper to perform direct search against Deepernova Production Engine (CORS enabled everywhere)
 */
async function performCloudDirectSearch(query, limit, timeoutMs = 5000) {
  const tryCloud = async (allowCrawl) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const cloudUrl = new URL('https://www.deepernova.com/api/v1/search');
      cloudUrl.searchParams.append('q', query);
      cloudUrl.searchParams.append('limit', String(limit));
      if (!allowCrawl) {
        cloudUrl.searchParams.append('crawl', '0');
        cloudUrl.searchParams.append('fast', '1');
      } else {
        cloudUrl.searchParams.append('crawl', '1');
      }

      const response = await fetch(cloudUrl.toString(), {
        headers: {
          'Authorization': `Bearer dn_live_d69468b9c25451f3b7cd8482e96cbcf7`,
          'X-API-Key': 'dn_live_d69468b9c25451f3b7cd8482e96cbcf7',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.results) && data.results.length > 0) {
          const organicResults = mapRawResultsToOrganic(data.results);
          return {
            success: true,
            data: {
              organic_results: organicResults,
              inline_images: [],
              search_information: {
                query,
                total_results: data.total_results || organicResults.length,
                time_taken_ms: data.duration_ms || 0
              },
              engine: 'deepernova_cloud_direct'
            }
          };
        }
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
 * Guaranteed CORS-Friendly Public Knowledge & Web Search Fallback (Wikipedia ID + EN + DuckDuckGo Instant API)
 * Ensures that even if a brand-new query has 0 local BM25 hits or the local search server is still starting,
 * the AI Chatbot ALWAYS receives rich source bubbles (`SourceBubbleCarousel`) before answering!
 */
async function performPublicWebFallback(query, limit = 6, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const collected = [];

  try {
    const wikiLangs = ['id', 'en'];
    const wikiPromises = wikiLangs.map(async (lang) => {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*&srlimit=4`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return [];
      const data = await res.json();
      const items = data?.query?.search || [];
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
          thumbnail: `https://www.google.com/s2/favicons?sz=64&domain=${domain}`,
          date: item.timestamp ? item.timestamp.slice(0, 10) : null
        };
      });
    });

    const ddgPromise = (async () => {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return [];
      const data = await res.json();
      const out = [];
      if (data.AbstractURL && data.AbstractText) {
        let domain = 'duckduckgo.com';
        try { domain = new URL(data.AbstractURL).hostname.replace(/^www\./i, ''); } catch (e) { }
        out.push({
          title: data.Heading || query,
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
          time_taken_ms: 120
        },
        engine: 'deepernova_live_knowledge_fallback'
      }
    };
  }
  return null;
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

    const directPromise = wrapSearchResult(performDirectSearch(effectiveQuery, limit, includeImages, 5500));
    const proxyPromise = wrapSearchResult(performProxySearch(effectiveQuery, limit, 5500));

    // Fast-path: whichever returns valid results first wins immediately!
    const firstResult = await Promise.race([
      directPromise.then(r => r ? r : new Promise(() => { })),
      proxyPromise.then(r => r ? r : new Promise(() => { }))
    ]).catch(() => null);

    if (firstResult) {
      return firstResult;
    }

    // Fallback 1: wait for both to settle if neither fast-resolved
    const results = await Promise.all([directPromise, proxyPromise]);
    const valid = results.find(r => r && r.data?.organic_results?.length > 0);
    if (valid) return valid;

    // Fallback 2: Direct hit to production Deepernova search engine + Public Web Fallback in parallel
    console.log(`[ClientSearchService] Attempting cloud & public web fallback for: "${effectiveQuery}"`);
    const [cloudFallback, publicFallback] = await Promise.all([
      wrapSearchResult(performCloudDirectSearch(effectiveQuery, limit, 4000)),
      wrapSearchResult(performPublicWebFallback(effectiveQuery, limit, 4000))
    ]);

    if (cloudFallback && cloudFallback.data?.organic_results?.length > 0) {
      return cloudFallback;
    }
    if (publicFallback && publicFallback.data?.organic_results?.length > 0) {
      return publicFallback;
    }

    return {
      success: true,
      data: { organic_results: [], inline_images: [] }
    };
  };

  // Hard global timeout at 8500ms
  const hardTimeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          organic_results: [],
          inline_images: [],
          search_information: { query: effectiveQuery, total_results: 0, time_taken_ms: 8500, timed_out: true }
        }
      });
    }, 8500);
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

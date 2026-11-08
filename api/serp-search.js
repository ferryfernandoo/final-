export const config = {
  runtime: 'edge',
};

const SERPAPI_KEY = process.env.SERPAPI_KEY || ''; // SECURITY: env only, never hardcode

function cleanText(str) {
  if (!str) return '';
  return String(str)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDomain(urlStr) {
  try {
    return new URL(urlStr).hostname.replace(/^www\./i, '');
  } catch {
    return 'google.com';
  }
}

async function fetchGoogleNewsRSS(query, limit = 8, lang = 'id') {
  try {
    const enc = encodeURIComponent(query);
    const hl = lang === 'zh' ? 'zh-cn' : (lang === 'en' ? 'en-US' : 'id');
    const gl = lang === 'zh' ? 'CN' : (lang === 'en' ? 'US' : 'ID');
    const ceid = lang === 'zh' ? 'CN:zh-Hans' : (lang === 'en' ? 'US:en' : 'ID:id');

    const url = `https://news.google.com/rss/search?q=${enc}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2800);
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!resp.ok) return [];
    const xml = await resp.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
    const results = [];

    for (const m of items.slice(0, limit)) {
      const itemXml = m[1];
      const titleRaw = cleanText(itemXml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
      const link = cleanText(itemXml.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '');
      const source = cleanText(itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || 'Google Search');
      const pubDate = cleanText(itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '');
      const descRaw = cleanText(itemXml.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || '');

      if (!titleRaw || !link) continue;

      let domain = source || 'Google';
      const cleanTitle = titleRaw.replace(/\s*-\s*[^-]+$/, '').trim() || titleRaw;
      const snippet = descRaw.length > 20 ? descRaw : `${cleanTitle} — ${source}`;

      results.push({
        title: cleanTitle,
        url: link,
        link: link,
        domain: domain,
        snippet: cleanText(snippet),
        description: cleanText(snippet),
        sourceEngine: 'Google Search',
        published_at: pubDate,
        thumbnail: `https://www.google.com/s2/favicons?sz=64&domain=${extractDomain(link) || 'google.com'}`,
        accuracyScore: 98.0
      });
    }
    return results;
  } catch (e) {
    console.warn('[SerpSearch] Google News RSS error:', e.message);
    return [];
  }
}

async function fetchBingNewsRSS(query, limit = 4) {
  try {
    const enc = encodeURIComponent(query);
    const url = `https://www.bing.com/news/search?q=${enc}&format=rss`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) return [];
    const xml = await resp.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
    const results = [];

    for (const m of items.slice(0, limit)) {
      const itemXml = m[1];
      const title = cleanText(itemXml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
      let link = cleanText(itemXml.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '');
      const desc = cleanText(itemXml.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || '');
      const source = cleanText(itemXml.match(/<News:Source>([\s\S]*?)<\/News:Source>/i)?.[1] || 'Bing News');
      const pubDate = cleanText(itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '');

      const urlMatch = link.match(/url=([^&]+)/);
      if (urlMatch && urlMatch[1]) {
        try { link = decodeURIComponent(urlMatch[1]); } catch { }
      }

      if (!title || !link) continue;

      results.push({
        title,
        url: link,
        link,
        domain: extractDomain(link) || source,
        snippet: cleanText(desc || title),
        description: cleanText(desc || title),
        sourceEngine: 'Bing Search',
        published_at: pubDate,
        thumbnail: `https://www.google.com/s2/favicons?sz=64&domain=${extractDomain(link)}`,
        accuracyScore: 94.0
      });
    }
    return results;
  } catch (e) {
    return [];
  }
}

async function fetchWikipediaKnowledge(query, limit = 3, lang = 'id') {
  try {
    const wikiLang = lang === 'en' ? 'en' : 'id';
    const wikiUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=${limit}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(wikiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data?.query?.search) return [];

    return data.query.search.map(r => {
      const pageUrl = `https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/\s+/g, '_'))}`;
      const snippet = cleanText(r.snippet);
      return {
        title: `${r.title} - Wikipedia`,
        url: pageUrl,
        link: pageUrl,
        domain: `${wikiLang}.wikipedia.org`,
        snippet,
        description: snippet,
        sourceEngine: 'Wikipedia Knowledge',
        thumbnail: 'https://www.google.com/s2/favicons?sz=64&domain=wikipedia.org',
        accuracyScore: 92.0
      };
    });
  } catch (e) {
    return [];
  }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      },
    });
  }

  const urlObj = new URL(req.url);
  let query = (urlObj.searchParams.get('q') || urlObj.searchParams.get('query') || '').trim();
  let limit = parseInt(urlObj.searchParams.get('limit') || '10', 10);
  let lang = urlObj.searchParams.get('hl') || urlObj.searchParams.get('lang') || 'id';

  if (!query && req.method === 'POST') {
    try {
      const body = await req.json();
      query = (body.q || body.query || '').trim();
      if (body.limit) limit = parseInt(body.limit, 10);
      if (body.hl || body.lang) lang = body.hl || body.lang;
    } catch {
      // Ignore body parse errors
    }
  }

  limit = Math.min(25, Math.max(1, limit || 10));

  if (!query) {
    return new Response(JSON.stringify({
      success: true,
      data: {
        organic_results: [],
        inline_images: [],
        engine: 'deepernova_google_hybrid'
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const tStart = Date.now();
  let organicResults = [];
  let inlineImages = [];
  let answerBoxData = null;

  // 1. First attempt: SerpAPI if key is active
  try {
    const hl = lang === 'zh' ? 'zh-cn' : (lang === 'en' ? 'en' : 'id');
    const gl = lang === 'zh' ? 'cn' : (lang === 'en' ? 'us' : 'id');
    const googleDomain = lang === 'id' ? 'google.co.id' : 'google.com';

    const serpUrl = new URL('https://serpapi.com/search.json');
    serpUrl.searchParams.set('engine', 'google');
    serpUrl.searchParams.set('q', query);
    serpUrl.searchParams.set('hl', hl);
    serpUrl.searchParams.set('gl', gl);
    serpUrl.searchParams.set('google_domain', googleDomain);
    serpUrl.searchParams.set('num', String(Math.max(5, limit)));
    serpUrl.searchParams.set('api_key', SERPAPI_KEY);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(serpUrl.toString(), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      if (data.answer_box) {
        const ab = data.answer_box;
        answerBoxData = {
          title: cleanText(ab.title || ab.answer || query),
          snippet: cleanText(ab.snippet || ab.answer || ab.population || ab.price || ''),
          url: ab.link || 'https://www.google.com'
        };
      }
      if (Array.isArray(data.organic_results)) {
        for (const item of data.organic_results.slice(0, limit)) {
          const itemUrl = item.link || item.url || '';
          if (!itemUrl) continue;
          const cleanSnippet = cleanText(item.snippet || item.snippet_highlighted_words?.join(' ') || '');
          organicResults.push({
            title: cleanText(item.title) || query,
            url: itemUrl,
            link: itemUrl,
            domain: extractDomain(itemUrl),
            snippet: cleanSnippet,
            description: cleanSnippet,
            sourceEngine: 'Google Search',
            thumbnail: item.thumbnail || `https://www.google.com/s2/favicons?sz=64&domain=${extractDomain(itemUrl)}`,
            accuracyScore: 99.0
          });
        }
      }
    }
  } catch (err) {
    // SerpAPI might fail or run out of quota, proceed to full Google News + Bing + Wiki hybrid
  }

  // 2. Fetch Direct Google News RSS, Bing, and Wikipedia in parallel
  const [googleNewsResults, bingResults, wikiResults] = await Promise.all([
    fetchGoogleNewsRSS(query, Math.max(6, limit), lang),
    fetchBingNewsRSS(query, 4),
    fetchWikipediaKnowledge(query, 3, lang)
  ]);

  // Merge results, prioritizing Google Search
  const seenUrls = new Set(organicResults.map(r => r.url));
  const seenTitles = new Set(organicResults.map(r => r.title.toLowerCase()));

  const addMerged = (item) => {
    if (!item || !item.url) return;
    const normTitle = (item.title || '').toLowerCase();
    if (seenUrls.has(item.url) || seenTitles.has(normTitle)) return;
    seenUrls.add(item.url);
    seenTitles.add(normTitle);
    organicResults.push(item);
  };

  // Google News results come first (guarantees Google search results!)
  for (const g of googleNewsResults) addMerged(g);
  for (const b of bingResults) addMerged(b);
  for (const w of wikiResults) addMerged(w);

  // Extract inline images
  for (const r of organicResults) {
    if (r.thumbnail && inlineImages.length < 8) {
      inlineImages.push({
        thumbnail: r.thumbnail,
        imageUrl: r.thumbnail,
        link: r.url,
        title: r.title,
        source: r.domain,
        sourceDomain: r.domain
      });
    }
  }

  const durationMs = Date.now() - tStart;

  return new Response(JSON.stringify({
    success: true,
    data: {
      organic_results: organicResults.slice(0, limit),
      inline_images: inlineImages,
      answer_box: answerBoxData,
      search_information: {
        query,
        total_results: organicResults.length,
        time_taken_ms: durationMs
      },
      engine: 'deepernova_google_hybrid'
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
    }
  });
}

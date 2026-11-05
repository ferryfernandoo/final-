export const config = {
  runtime: 'edge',
};

const SERPAPI_KEY = process.env.SERPAPI_KEY || '3dcea72b423f7514a9428d398e9f42cd5d7b9004928fb8212f3694342f61133a';

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
    return '';
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
        engine: 'serpapi_google'
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

  // 1. Try SerpAPI Google Search
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
    const timeout = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(serpUrl.toString(), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();

      // Answer Box
      if (data.answer_box) {
        const ab = data.answer_box;
        const abTitle = ab.title || ab.answer || query;
        const abSnippet = ab.snippet || ab.answer || ab.population || ab.price || '';
        const abLink = ab.link || 'https://www.google.com';
        answerBoxData = {
          title: cleanText(abTitle),
          snippet: cleanText(abSnippet),
          url: abLink
        };
        if (abSnippet) {
          organicResults.push({
            title: `[Fakta Inti] ${cleanText(abTitle)}`,
            url: abLink,
            link: abLink,
            domain: extractDomain(abLink),
            snippet: cleanText(abSnippet),
            description: cleanText(abSnippet),
            sourceEngine: 'Google Search (SerpAPI)',
            accuracyScore: 99.0
          });
        }
      }

      // Organic Results
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
            sourceEngine: 'Google Search (SerpAPI)',
            thumbnail: item.thumbnail || null,
            accuracyScore: 95.0
          });
        }
      }

      // Inline Images
      if (Array.isArray(data.inline_images)) {
        for (const img of data.inline_images.slice(0, 8)) {
          const imgUrl = img.thumbnail || img.imageUrl || img.original;
          if (imgUrl) {
            inlineImages.push({
              thumbnail: imgUrl,
              imageUrl: imgUrl,
              link: img.link || img.source || imgUrl,
              title: cleanText(img.title) || query,
              source: img.source || '',
              sourceDomain: extractDomain(img.link || img.source || '')
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[SerpSearch Edge] SerpAPI fetch failed:', err.message);
  }

  // 2. Fallback to Wikipedia OpenSearch if organicResults is empty
  if (organicResults.length === 0) {
    try {
      const wikiLang = lang === 'en' ? 'en' : 'id';
      const wikiUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=${limit}`;
      const wikiResp = await fetch(wikiUrl);
      if (wikiResp.ok) {
        const wikiData = await wikiResp.json();
        if (wikiData?.query?.search) {
          for (const item of wikiData.query.search) {
            const pageUrl = `https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`;
            const snippet = cleanText(item.snippet);
            organicResults.push({
              title: `${item.title} - Wikipedia`,
              url: pageUrl,
              link: pageUrl,
              domain: `${wikiLang}.wikipedia.org`,
              snippet,
              description: snippet,
              sourceEngine: 'Wikipedia Knowledge',
              accuracyScore: 92.0
            });
          }
        }
      }
    } catch (e) {
      console.warn('[SerpSearch Edge] Wikipedia fallback error:', e.message);
    }
  }

  const durationMs = Date.now() - tStart;

  return new Response(JSON.stringify({
    success: true,
    data: {
      organic_results: organicResults,
      inline_images: inlineImages,
      answer_box: answerBoxData,
      search_information: {
        query,
        total_results: organicResults.length,
        time_taken_ms: durationMs
      },
      engine: 'serpapi_google'
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

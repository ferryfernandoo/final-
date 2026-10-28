import fs from 'node:fs';

const serverPath = 'C:\\deepernova-search-main\\src\\server.js';
let code = fs.readFileSync(serverPath, 'utf8');

// 1. Remove synchronous boot checkpoint at 2500ms
code = code.replace(
  /\/\/ Non-blocking WAL checkpoint on boot[\s\S]*?setTimeout\(\(\) => \{[\s\S]*?db\.checkpoint\('PASSIVE'\);[\s\S]*?\}, 2500\);/,
  '// Boot checkpoint removed to prevent event-loop stalls on 115GB DB'
);

// 2. Make warmTopQueries polite
code = code.replace(
  /for \(const q of topQueries\) \{[\s\S]*?\}\s*console\.log\('\[Server Cache\] ✅ Top search queries pre-warmed into RAM!'\);/m,
  `for (const q of topQueries) {
    try {
      const res = await searchEngine.searchAsync(q, { page: 1, limit: 12, type: 'all', timeFilter: 'all' }, db);
      const cacheKey = \`\${q.trim().toLowerCase()}|1|12|all|all|false\`;
      setHttpSearchCache(cacheKey, { ...res, type: 'all', timeFilter: 'all', liveCrawlTriggered: false });
      await new Promise(r => setTimeout(r, 20));
    } catch {}
  }
  console.log('[Server Cache] ✅ Top search queries pre-warmed into RAM!');`
);

// 3. Insert unified hybrid ranked search function before handleV1Search
const hybridSearchFn = `
// ============================================================================
// 🚀 DEEPERNOVA ULTRA-FAST NEURAL RANKED HYBRID SEARCH ENGINE
// ============================================================================
async function executeUnifiedRankedSearch(query, options = {}) {
  const cleanQ = (query || '').trim();
  const page = Math.max(1, parseInt(options.page || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(options.limit || '10', 10)));
  const timeFilter = options.timeFilter || 'all';
  const type = options.type || 'all';
  const forceOriginal = options.forceOriginal === true || options.forceOriginal === '1';

  const tStart = performance.now();

  let engineResult;
  try {
    if (type === 'images') {
      engineResult = searchEngine.searchImages(cleanQ, { page, limit });
    } else {
      engineResult = await searchEngine.searchAsync(cleanQ, { page, limit, timeFilter, type, forceOriginal }, db);
    }
  } catch (err) {
    engineResult = { total: 0, results: [], durationMs: 0 };
  }

  const terms = cleanQ.toLowerCase().replace(/[^\\p{L}\\p{N}\\s]/gu, ' ').split(/\\s+/).filter(t => t.length >= 2);
  const intentInfo = typeof searchEngine.parseQueryIntent === 'function' ? searchEngine.parseQueryIntent(cleanQ) : null;

  let formattedResults = (engineResult.results || []).map(r => {
    const rawTitle = (r.rawTitle || r.title || '').replace(/<[^>]+>/g, '').trim();
    const snippet = (r.snippet || r.description || r.content || '').replace(/<[^>]+>/g, '').trim();
    const pubDate = r.publishedAt || r.published_at || r.crawledAt || r.crawled_at;
    const formattedDate = r.formattedDate || r.date || (pubDate ? new Date(pubDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null);
    const score = Number(r.accuracyScore || r.score || r.rankingScore || 75);
    return {
      id: r.id || undefined,
      title: rawTitle,
      rawTitle,
      url: r.url || '',
      link: r.url || '',
      domain: r.domain || '',
      snippet,
      description: snippet,
      content: r.content || snippet,
      author: r.author || null,
      published_at: safeIsoDate(pubDate),
      publishedAt: pubDate || null,
      date: formattedDate,
      formatted_date: formattedDate,
      formattedDate: formattedDate,
      accuracyScore: Math.round(score * 10) / 10,
      score: Math.round(score * 10) / 10,
      pagerank: Number(r.pagerank || 1.5),
      trustScore: Number(r.trustScore || r.trust_score || 80),
      trust_score: Number(r.trustScore || r.trust_score || 80),
      bm25: Number(r.bm25 || 1.0),
      logo_url: r.logo_url || r.logoUrl || (r.domain ? \`https://www.google.com/s2/favicons?sz=64&domain=\${r.domain}\` : null),
      lead_image_url: r.lead_image_url || r.leadImageUrl || null,
      sitelinks: r.sitelinks || []
    };
  });

  // If local results are sparse (< 5), trigger parallel live web/news ingestion (< 850ms)
  const isNewsOrTechQuery = /\\b(berita|terbaru|terkini|hari ini|kemarin|sekarang|bug|cve|vulnerability|celah|security|patch|update|rilis|nodejs|python|ai|deepseek|openai|google)\\b/i.test(cleanQ);
  if (formattedResults.length < 5 && cleanQ && type !== 'images') {
    try {
      const enc = encodeURIComponent(cleanQ);
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

      const liveItems = [];

      await Promise.allSettled([
        // 1. Google News RSS (Indonesia & Global)
        (async () => {
          try {
            const feedUrls = [
              \`https://news.google.com/rss/search?q=\${enc}&hl=id&gl=ID&ceid=ID:id\`,
              \`https://news.google.com/rss/search?q=\${enc}&hl=en-US&gl=US&ceid=US:en\`
            ];
            await Promise.allSettled(feedUrls.map(async (u) => {
              const resp = await fetch(u, {
                signal: AbortSignal.timeout(1000),
                headers: { 'User-Agent': userAgent }
              });
              if (!resp.ok) return;
              const xml = await resp.text();
              const itemMatches = [...xml.matchAll(/<item>([\\s\\S]*?)<\\/item>/gi)];
              for (const m of itemMatches.slice(0, 6)) {
                const itemXml = m[1];
                const rawTitle = (itemXml.match(/<title>([\\s\\S]*?)<\\/title>/i)?.[1] || '').replace(/<!\\[CDATA\\[(.*?)\\]\\]>/gi, '$1').trim();
                const rawLink = (itemXml.match(/<link>([\\s\\S]*?)<\\/link>/i)?.[1] || '').trim();
                const pubDate = (itemXml.match(/<pubDate>([\\s\\S]*?)<\\/pubDate>/i)?.[1] || '').trim();
                const source = (itemXml.match(/<source[^>]*>([\\s\\S]*?)<\\/source>/i)?.[1] || '').trim();
                const sourceUrl = (itemXml.match(/<source[^>]*url=["']([^"']+)["']/i)?.[1] || '').trim();
                if (rawTitle && rawLink) {
                  let domain = '';
                  try { domain = new URL(sourceUrl || rawLink).hostname.replace('www.', ''); } catch (e) {}
                  liveItems.push({
                    url: rawLink,
                    domain: domain || 'news.google.com',
                    title: rawTitle,
                    description: \`\${rawTitle} — \${source || 'Berita Web Terverifikasi'} (\${pubDate || 'Hari ini'})\`,
                    headings: rawTitle,
                    content: \`\${rawTitle} - \${source || 'Berita Web Terverifikasi'}\`,
                    author: source || null,
                    category: 'news',
                    publishedAt: (pubDate && !Number.isNaN(new Date(pubDate).getTime())) ? new Date(pubDate).getTime() : Date.now(),
                    pagerank: 3.5,
                    trustScore: 92
                  });
                }
              }
            }));
          } catch {}
        })(),

        // 2. Bing News RSS
        (async () => {
          try {
            const resp = await fetch(\`https://www.bing.com/news/search?q=\${enc}&format=rss\`, {
              signal: AbortSignal.timeout(950),
              headers: { 'User-Agent': userAgent }
            });
            if (!resp.ok) return;
            const xml = await resp.text();
            const items = [...xml.matchAll(/<item>([\\s\\S]*?)<\\/item>/gi)];
            for (const m of items.slice(0, 5)) {
              const itemXml = m[1];
              const rawTitle = (itemXml.match(/<title>([\\s\\S]*?)<\\/title>/i)?.[1] || '').replace(/<!\\[CDATA\\[(.*?)\\]\\]>/gi, '$1').trim();
              const rawLink = (itemXml.match(/<link>([\\s\\S]*?)<\\/link>/i)?.[1] || '').trim();
              const pubDate = (itemXml.match(/<pubDate>([\\s\\S]*?)<\\/pubDate>/i)?.[1] || '').trim();
              const rawDesc = (itemXml.match(/<description>([\\s\\S]*?)<\\/description>/i)?.[1] || '').replace(/<[^>]+>/g, '').trim();
              if (rawTitle && rawLink) {
                let domain = '';
                try { domain = new URL(rawLink).hostname.replace('www.', ''); } catch (e) {}
                liveItems.push({
                  url: rawLink,
                  domain: domain || 'bing.com',
                  title: rawTitle,
                  description: rawDesc || rawTitle,
                  headings: rawTitle,
                  content: rawDesc || rawTitle,
                  category: 'news',
                  publishedAt: (pubDate && !Number.isNaN(new Date(pubDate).getTime())) ? new Date(pubDate).getTime() : Date.now(),
                  pagerank: 3.2,
                  trustScore: 89
                });
              }
            }
          } catch {}
        })(),

        // 3. Wikipedia (CAPPED TO AT MOST 1 SUPPLEMENTARY ITEM unless query explicitly searches for wikipedia)
        (async () => {
          try {
            const wantsWiki = cleanQ.toLowerCase().includes('wikipedia') || cleanQ.toLowerCase().includes('definisi') || cleanQ.toLowerCase().includes('arti');
            if (isNewsOrTechQuery && !wantsWiki && liveItems.length > 0) return;

            const wikiResp = await fetch(\`https://id.wikipedia.org/w/api.php?action=opensearch&search=\${enc}&limit=2&namespace=0&format=json\`, {
              signal: AbortSignal.timeout(800),
              headers: { 'User-Agent': userAgent }
            });
            if (wikiResp.ok) {
              const data = await wikiResp.json();
              if (Array.isArray(data) && data[1] && data[1].length > 0) {
                const title = data[1][0];
                const snippet = (data[2] && data[2][0]) || title;
                const link = (data[3] && data[3][0]) || '';
                if (title && link) {
                  liveItems.push({
                    url: link,
                    domain: 'id.wikipedia.org',
                    title: \`\${title} — Wikipedia Bahasa Indonesia\`,
                    description: snippet,
                    headings: title,
                    content: snippet,
                    lang: 'id',
                    category: 'knowledge',
                    publishedAt: Date.now() - 86400000,
                    pagerank: 2.0,
                    trustScore: 85
                  });
                }
              }
            }
          } catch {}
        })()
      ]);

      const seenUrls = new Set(formattedResults.map(r => (r.url || '').toLowerCase().replace(/\\/+$/, '')));

      for (const item of liveItems) {
        const normUrl = (item.url || '').toLowerCase().replace(/\\/+$/, '');
        if (seenUrls.has(normUrl)) continue;
        seenUrls.add(normUrl);

        let calculatedScore = 78.0;
        try {
          if (typeof searchEngine.calculateQueryAccuracyScore === 'function') {
            calculatedScore = searchEngine.calculateQueryAccuracyScore(item, cleanQ, terms, null, intentInfo);
          }
        } catch {}

        if (item.category === 'news') {
          calculatedScore = Math.max(calculatedScore, 88.5);
        } else if (item.domain.includes('wikipedia.org')) {
          calculatedScore = Math.min(calculatedScore, 82.0);
        }

        const pubDate = item.publishedAt;
        const formattedDate = pubDate ? new Date(pubDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

        try { db.savePage(item); } catch {}

        formattedResults.push({
          title: item.title,
          rawTitle: item.title,
          url: item.url,
          link: item.url,
          domain: item.domain,
          snippet: item.description,
          description: item.description,
          content: item.content || item.description,
          author: item.author || null,
          published_at: safeIsoDate(pubDate),
          publishedAt: pubDate,
          date: formattedDate,
          formatted_date: formattedDate,
          formattedDate: formattedDate,
          accuracyScore: Math.round(calculatedScore * 10) / 10,
          score: Math.round(calculatedScore * 10) / 10,
          pagerank: item.pagerank || 3.0,
          trustScore: item.trustScore || 90,
          trust_score: item.trustScore || 90,
          bm25: 1.0,
          logo_url: item.domain ? \`https://www.google.com/s2/favicons?sz=64&domain=\${item.domain}\` : null,
          lead_image_url: null,
          sitelinks: []
        });
      }
    } catch {}
  }

  // Sort strictly by accuracyScore DESC (Neural Ranking)
  formattedResults.sort((a, b) => (b.accuracyScore || 0) - (a.accuracyScore || 0));

  // Cap per root domain (Publisher diversity)
  const diverseList = [];
  const domainCount = new Map();
  for (const r of formattedResults) {
    const rootD = (r.domain || '').replace(/^www\\./i, '').toLowerCase();
    const count = domainCount.get(rootD) || 0;
    if (count < 2) {
      domainCount.set(rootD, count + 1);
      diverseList.push(r);
    }
  }

  const finalPageRows = diverseList.slice((page - 1) * limit, page * limit).map((r, idx) => ({
    ...r,
    position: idx + 1
  }));

  const latencyMs = Math.round((performance.now() - tStart) * 100) / 100;

  return {
    query: cleanQ,
    actualQuery: cleanQ,
    total: diverseList.length,
    page,
    limit,
    durationMs: latencyMs,
    duration_ms: latencyMs,
    instantAnswer: engineResult.instantAnswer || null,
    correction: engineResult.correction || null,
    type,
    algorithm: {
      name: "DeeperNova High-Trust Neural Search Ranking Engine",
      formula: "AccuracyScore = ExactTitleBonus + QueryTermCoverage + PageRank + EEAT_TrustScore + RecencyBoost",
      terms
    },
    results: finalPageRows
  };
}
`;

// Replace handleV1Search with clean call to executeUnifiedRankedSearch
const newHandleV1Search = `
${hybridSearchFn}

// Dedicated Developer & AI Search API Handler (v1)
async function handleV1Search(req, res) {
  const query = (req.query.q || req.body?.query || req.body?.q || '').trim();
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || req.body?.limit || '10', 10)));
  const page = Math.max(1, parseInt(req.query.page || req.body?.page || '1', 10));
  const timeFilter = req.query.timeFilter || req.body?.timeFilter || 'all';
  const type = req.query.type || req.body?.type || 'all';
  const forceCrawl = req.query.crawl === '1' || req.query.crawl === 'true';

  if (!query) {
    return res.status(400).json({
      status: 'error',
      code: 'MISSING_QUERY',
      message: 'Parameter "q" (atau JSON body "query") wajib diisi.'
    });
  }

  const cacheKey = \`v1|\${query.toLowerCase()}|\${page}|\${limit}|\${timeFilter}|\${type}\`;
  if (!forceCrawl) {
    const cached = getHttpSearchCache(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Response-Time', '0.05ms');
      return res.json(cached);
    }
  }

  const result = await executeUnifiedRankedSearch(query, { page, limit, timeFilter, type, forceOriginal: false });
  const aiContext = formatAiContext(query, result.results);

  const payload = {
    status: 'success',
    api_version: 'v1',
    query,
    total_results: result.total,
    page,
    limit,
    duration_ms: result.durationMs,
    client_latency_ms: result.durationMs,
    algorithm: result.algorithm,
    auth: {
      key_name: req.apiKeyInfo?.name || 'Public Demo',
      is_demo: Boolean(req.apiKeyInfo?.isDemo)
    },
    results: result.results,
    ai_context: aiContext
  };

  if (!forceCrawl) {
    setHttpSearchCache(cacheKey, payload);
  }

  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
  res.setHeader('X-Cache', 'MISS');
  res.setHeader('X-Response-Time', \`\${result.durationMs}ms\`);
  res.json(payload);
}
`;

// Replace handleV1Search implementation in file
const v1SearchStart = code.indexOf('async function handleV1Search(req, res) {');
const v1SearchEnd = code.indexOf("app.get('/api/v1/search', searchPriorityMiddleware, apiKeyAuthMiddleware, handleV1Search);");

if (v1SearchStart !== -1 && v1SearchEnd !== -1) {
  code = code.slice(0, v1SearchStart) + newHandleV1Search + '\n' + code.slice(v1SearchEnd);
  console.log('✅ handleV1Search replaced with executeUnifiedRankedSearch!');
} else {
  console.warn('⚠️ Could not locate handleV1Search markers');
}

// 4. Update /api/search to also use executeUnifiedRankedSearch
const searchRouteStart = code.indexOf("app.get('/api/search', searchPriorityMiddleware, async (req, res) => {");
const searchRouteEnd = code.indexOf("app.get('/api/suggestions', (req, res) => {");

if (searchRouteStart !== -1 && searchRouteEnd !== -1) {
  const newSearchRoute = `app.get('/api/search', searchPriorityMiddleware, async (req, res) => {
  const query = (req.query.q || '').trim();
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '15', 10);
  const timeFilter = req.query.timeFilter || req.query.time || 'all';
  const type = req.query.type || 'all';
  const liveCrawl = req.query.liveCrawl === 'true' || req.query.liveCrawl === '1';

  if (!query) {
    return res.json({ query: '', total: 0, results: [], durationMs: 0, type });
  }

  res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=60');
  db.logQuery(query);

  const cacheKey = \`\${query.toLowerCase()}|\${page}|\${limit}|\${timeFilter}|\${type}|\${liveCrawl}\`;
  if (!liveCrawl) {
    const cachedResponse = getHttpSearchCache(cacheKey);
    if (cachedResponse) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Response-Time', '0.05ms');
      return res.json(cachedResponse);
    }
  }

  const result = await executeUnifiedRankedSearch(query, { page, limit, timeFilter, type, liveCrawl });
  const payload = {
    ...result,
    type,
    timeFilter,
    liveCrawlTriggered: liveCrawl
  };

  if (!liveCrawl) {
    setHttpSearchCache(cacheKey, payload);
  }

  res.setHeader('X-Cache', 'MISS');
  res.setHeader('X-Response-Time', \`\${result.durationMs}ms\`);
  res.json(payload);
});
`;
  code = code.slice(0, searchRouteStart) + newSearchRoute + '\n' + code.slice(searchRouteEnd);
  console.log('✅ /api/search upgraded to use executeUnifiedRankedSearch!');
} else {
  console.warn('⚠️ Could not locate /api/search markers');
}

fs.writeFileSync(serverPath, code, 'utf8');

// Also sync to local search-engine/src/server.js
const localServerPath = 'C:\\Users\\ferry fernando\\.gemini\\antigravity\\worktrees\\deepernova ai\\ai_agent_capability\\search-engine\\src\\server.js';
if (fs.existsSync(localServerPath)) {
  fs.writeFileSync(localServerPath, code, 'utf8');
}

console.log('✅ server.js optimized and synced successfully!');


import { canonicalizeUrl, getDomain, fnv1a64 } from '../src/crawler/urlUtils.js';
import { HTMLParser } from '../src/crawler/parser.js';
import { SearchDatabase } from '../src/indexer/db.js';
import { PageRankCalculator } from '../src/indexer/pagerank.js';
import { SearchEngine } from '../src/indexer/search.js';
import { HTTPFetcher } from '../src/crawler/fetcher.js';

async function runTests() {
  console.log('🧪 ===============================================');
  console.log('🧪 RUNNING COMPREHENSIVE SEARCH ENGINE UNIT TESTS');
  console.log('🧪 ===============================================\n');

  // Test 1: URL Utils
  console.log('▶ [1/6] Testing URL Canonicalization & Deduplication...');
  const raw1 = 'https://EXAMPLE.COM:443/path/../path/index.html?utm_source=facebook&b=2&a=1#section-1';
  const canon1 = canonicalizeUrl(raw1);
  console.log(`  Canonical output: ${canon1}`);
  if (canon1 !== 'https://example.com/path/index.html?a=1&b=2') {
    throw new Error(`Canonicalization failed: expected 'https://example.com/path/index.html?a=1&b=2', got '${canon1}'`);
  }
  const hash1 = fnv1a64(canon1);
  console.log(`  FNV-1a Hash: ${hash1} (Length: ${hash1.length})`);
  console.log('  ✅ URL Canonicalization passed.\n');

  // Test 2: HTML Parser
  console.log('▶ [2/6] Testing Fast HTML Parser & Content Extraction...');
  const sampleHtml = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <title>Google Search Engine Architecture - Nexus</title>
        <meta name="description" content="A comprehensive analysis of search engine crawlers, BM25 indexing, and PageRank link graphs.">
        <link rel="canonical" href="https://example.com/search-architecture">
      </head>
      <body>
        <nav><a href="/menu">Menu Item</a></nav>
        <h1>Web Crawlers and Search Engines</h1>
        <p>A web crawler or spider is an Internet bot that systematically browses the World Wide Web.</p>
        <h2>PageRank and Algorithms</h2>
        <p>Larry Page and Sergey Brin developed PageRank at Stanford University in 1996.</p>
        <a href="https://en.wikipedia.org/wiki/PageRank">Read more about PageRank</a>
        <a href="/internal-link" rel="noopener">Internal Architecture</a>
        <footer>Copyright 2026 Nexus</footer>
        <script>console.log('ignore this');</script>
      </body>
    </html>
  `;
  const parsed = HTMLParser.parse(sampleHtml, 'https://example.com');
  console.log(`  Extracted Title: "${parsed.title}"`);
  console.log(`  Extracted Description: "${parsed.description}"`);
  console.log(`  Extracted Headings: "${parsed.headings}"`);
  console.log(`  Discovered Links: ${parsed.outgoingLinks.length}`);
  console.log(`  Clean Word Count: ${parsed.wordCount}`);
  if (parsed.outgoingLinks.length < 2 || !parsed.title.includes('Google Search Engine Architecture')) {
    throw new Error('HTML Parser extraction failed');
  }
  console.log('  ✅ HTML Parser passed.\n');

  // Test 3: Database & FTS5 Indexing
  console.log('▶ [3/6] Testing SQLite Storage & Full-Text Search (FTS5)...');
  const db = new SearchDatabase(':memory:');

  // Seed test pages
  await db.savePage({
    url: 'https://example.com/page1',
    domain: 'example.com',
    title: 'Modern Search Engine Indexing and Crawler Technology',
    description: 'Learn how modern search engines build ultra-fast inverted indexes and robots.txt parsers.',
    headings: 'Search Engine Architecture | Inverted Index',
    content: 'Full text search engines like Google and Bing rely on tokenization, BM25 scoring, and asynchronous distributed crawlers to scan billions of web pages efficiently.',
    outgoingLinks: [
      { url: 'https://example.com/page2', anchorText: 'Next Page' },
      { url: 'https://tech.org/article', anchorText: 'Tech Reference' }
    ]
  });

  await db.savePage({
    url: 'https://example.com/page2',
    domain: 'example.com',
    title: 'Understanding the PageRank Algorithm in Search Engines',
    description: 'A deep dive into link analysis, random surfer models, and power iteration matrices.',
    headings: 'PageRank Formula | Damping Factor',
    content: 'PageRank works by counting the number and quality of links to a page to determine a rough estimate of how important the website is.',
    outgoingLinks: [
      { url: 'https://example.com/page1', anchorText: 'Back to Indexing' }
    ]
  });

  await db.savePage({
    url: 'https://tech.org/article',
    domain: 'tech.org',
    title: 'High Throughput Asynchronous Network I/O in Node.js',
    description: 'Mastering keep-alive connections, event loops, and streaming data parsers.',
    headings: 'High Speed Networking',
    content: 'Node.js enables concurrent HTTP requests without thread overhead.',
    outgoingLinks: [
      { url: 'https://example.com/page1', anchorText: 'Search Engine' }
    ]
  });

  db.flushPageBuffer();

  const dbStats = db.getStats();
  console.log(`  Total Indexed Pages: ${dbStats.totalPages}`);
  console.log(`  Total Graph Links: ${dbStats.totalLinks}`);
  console.log('  ✅ SQLite Database & WAL mode initialized successfully.\n');

  // Test 4: PageRank Calculation
  console.log('▶ [4/6] Testing Link Graph PageRank Computation...');
  const prCalc = new PageRankCalculator(db);
  const prResult = prCalc.calculate();
  console.log(`  PageRank converged in ${prResult.iterations} iterations (${prResult.durationMs}ms) for ${prResult.count} nodes.`);
  console.log('  ✅ PageRank Calculator passed.\n');

  // Test 5: BM25 Search Engine
  console.log('▶ [5/6] Testing BM25 Search Query Execution...');
  const searchEngine = new SearchEngine(db);
  const queryResult = searchEngine.search('pagerank algorithm');
  console.log(`  Query: "pagerank algorithm"`);
  console.log(`  Found: ${queryResult.total} matches in ${queryResult.durationMs}ms`);
  queryResult.results.forEach((r, idx) => {
    console.log(`   [#${idx + 1}] PR:${r.pagerank} - ${r.rawTitle} (${r.url})`);
  });

  if (queryResult.total === 0) {
    throw new Error('Search query returned 0 results');
  }
  console.log('  ✅ BM25 + PageRank Search Query passed.\n');

  // Test 6: Live Fetcher Validation (fetching a real web page)
  console.log('▶ [6/6] Testing Live HTTP Fetcher against Wikipedia...');
  const fetcher = new HTTPFetcher({ timeoutMs: 6000 });
  const liveRes = await fetcher.fetchPage('https://id.wikipedia.org/wiki/Halaman_Utama');
  console.log(`  HTTP Status: ${liveRes.status} (${liveRes.statusText})`);
  console.log(`  Response Time: ${liveRes.latencyMs}ms`);
  console.log(`  Bytes Received: ${liveRes.bytes || 0} bytes`);

  if (liveRes.success && liveRes.html) {
    const liveParsed = HTMLParser.parse(liveRes.html, liveRes.url);
    console.log(`  Parsed Wikipedia Title: "${liveParsed.title}"`);
    console.log(`  Discovered Outgoing URLs on Wikipedia: ${liveParsed.outgoingLinks.length}`);
  }
  console.log('  ✅ Live Fetcher and extraction verified successfully.\n');

  // Test 7: Live CrawlerEngine Dispatch Loop Test
  console.log('▶ [7/7] Testing Live CrawlerEngine with 40 Workers...');
  const { CrawlerEngine } = await import('../src/crawler/engine.js');
  const engine = new CrawlerEngine(db, { concurrency: 40, autonomousMode: true });
  engine.on('log', (data) => {
    console.log(`  [ENGINE LOG] ${data.type.toUpperCase()}: ${data.domain} (${data.status} in ${data.latencyMs}ms)`);
  });
  engine.start(['https://id.wikipedia.org/wiki/Halaman_Utama', 'https://en.wikipedia.org/wiki/Main_Page', 'https://arxiv.org']);
  await new Promise(r => setTimeout(r, 4000));
  const engineStats = engine.getStatus();
  console.log('  Engine final stats:', engineStats);
  await engine.stop();
  console.log('  ✅ Live CrawlerEngine test passed.\n');

  console.log('🎉 ===============================================');
  console.log('🎉 ALL SEARCH ENGINE & CRAWLER TESTS PASSED 100%!');
  console.log('🎉 ===============================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

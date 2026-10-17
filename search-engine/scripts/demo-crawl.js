async function testCrawlerAndSearch() {
  console.log('🚀 Initiating Live Crawl on Wikipedia seed pages...');

  const startRes = await fetch('http://127.0.0.1:3000/api/crawl/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seeds: [
        'https://id.wikipedia.org/wiki/Halaman_Utama',
        'https://id.wikipedia.org/wiki/Indonesia',
        'https://id.wikipedia.org/wiki/Kecerdasan_buatan',
        'https://id.wikipedia.org/wiki/Komputer'
      ],
      concurrency: 15,
      maxDepth: 3,
      maxPages: 30,
      perDomainDelayMs: 250
    })
  });
  console.log('  Start response:', await startRes.json());

  // Wait 10 seconds while crawler runs in background
  console.log('⏳ Crawling in progress... waiting 10 seconds...');
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch('http://127.0.0.1:3000/api/status');
    const statusData = await statusRes.json();
    console.log(`  [${(i+1)*2}s] State: ${statusData.crawler.state} | Crawled: ${statusData.crawler.crawledCount} pages | Queue: ${statusData.crawler.queueSize} | Speed: ${statusData.crawler.rps} req/s`);
  }

  // Stop crawler
  console.log('⏹ Stopping crawler...');
  await fetch('http://127.0.0.1:3000/api/crawl/stop', { method: 'POST' });

  // Calculate PageRank
  console.log('⭐ Computing PageRank scores over link graph...');
  const prRes = await fetch('http://127.0.0.1:3000/api/pagerank/calculate', { method: 'POST' });
  console.log('  PageRank result:', await prRes.json());

  // Test Search Queries
  const queries = ['Indonesia', 'Kecerdasan Buatan', 'Komputer'];
  for (const q of queries) {
    console.log(`\n🔍 Searching: "${q}"...`);
    const sRes = await fetch(`http://127.0.0.1:3000/api/search?q=${encodeURIComponent(q)}&limit=3`);
    const sData = await sRes.json();
    console.log(`  Found: ${sData.total} results in ${sData.durationMs}ms`);
    sData.results.forEach((r, idx) => {
      console.log(`  [#${idx+1}] PR: ${r.pagerank} | InLinks: ${r.inLinks}`);
      console.log(`       Title: ${r.rawTitle}`);
      console.log(`       URL: ${r.url}`);
    });
  }

  console.log('\n🎉 Live Crawl and Search Test Completed Successfully!');
}

testCrawlerAndSearch().catch(err => console.error('Demo error:', err));

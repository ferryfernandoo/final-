async function runVerification() {
  console.log('🚀 1. Starting Autonomous Crawler across Global & Indo Portals...');
  const startRes = await fetch('http://127.0.0.1:3000/api/crawl/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      concurrency: 40,
      maxDepth: 5,
      maxPages: 50000,
      perDomainDelayMs: 35,
      autonomousMode: true
    })
  });
  const startData = await startRes.json();
  console.log('  Crawl Started:', startData.success, '| Message:', startData.message);

  console.log('⏳ 2. Waiting 5 seconds for continuous multi-stream crawling...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('📊 3. Checking Crawler Telemetry & DB Stats...');
  const stRes = await fetch('http://127.0.0.1:3000/api/status');
  const st = await stRes.json();
  console.log(`  State: ${st.crawler.state} | Pages Crawled: ${st.crawler.crawledCount} | Speed: ${st.crawler.rps.toFixed(1)} req/s`);
  console.log(`  Total DB Pages: ${st.db.totalPages} | Total Domains: ${st.db.totalDomains} | Active Queue: ${st.crawler.queueSize}`);

  console.log('🔍 4. Testing Live Search with Freshness Boost on "indonesia"...');
  const searchRes = await fetch('http://127.0.0.1:3000/api/search?q=indonesia');
  const searchData = await searchRes.json();
  console.log(`  Results Found: ${searchData.total} in ${searchData.durationMs} ms`);
  searchData.results.slice(0, 4).forEach((r, i) => {
    console.log(`   ${i + 1}. [PR ${(r.pagerank || 1.0).toFixed(2)}] ${r.rawTitle} (${r.domain})`);
  });
}

runVerification().catch(console.error);

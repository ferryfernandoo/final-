import { HTTPFetcher } from '../src/crawler/fetcher.js';
import { SearchDatabase } from '../src/indexer/db.js';
import { CrawlerEngine } from '../src/crawler/engine.js';

async function diagnose() {
  console.log('=== STEP 1: Direct HTTPFetcher ===');
  const fetcher = new HTTPFetcher();
  console.log('Fetching id.wikipedia.org...');
  const res1 = await fetcher.fetchPage('https://id.wikipedia.org/wiki/Halaman_Utama');
  console.log('Fetch 1 result:', res1.status, res1.statusText, 'bytes:', res1.bytes, 'latency:', res1.latencyMs);

  console.log('\n=== STEP 2: Database Save ===');
  const db = new SearchDatabase();
  console.log('Total pages in DB before:', db.totalPagesCount);

  console.log('\n=== STEP 3: CrawlerEngine CrawlItem ===');
  const engine = new CrawlerEngine(db, { concurrency: 5, autonomousMode: false });
  engine.on('log', l => console.log('Engine Log Event:', l));
  
  console.log('Calling crawlItem on id.wikipedia.org...');
  await engine.crawlItem({
    url: 'https://id.wikipedia.org/wiki/Halaman_Utama',
    depth: 0,
    domain: 'id.wikipedia.org'
  });
  
  console.log('Engine crawledCount:', engine.crawledCount);
  console.log('Total pages in DB after:', db.totalPagesCount);
  console.log('Frontier queue count:', engine.frontier.totalQueuedCount);

  console.log('\n=== STEP 4: 3-Second Mini Engine Run ===');
  engine.frontier.clear();
  engine.start(['https://id.wikipedia.org/wiki/Halaman_Utama'], { autonomousMode: false });
  await new Promise(r => setTimeout(r, 3000));
  await engine.stop();
  console.log('After 3s run, crawledCount:', engine.crawledCount, 'db pages:', db.totalPagesCount);
  process.exit(0);
}

diagnose().catch(err => {
  console.error('Diagnosis error:', err);
  process.exit(1);
});

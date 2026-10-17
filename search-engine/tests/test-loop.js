import { SearchDatabase } from '../src/indexer/db.js';
import { CrawlerEngine } from '../src/crawler/engine.js';

async function test10Seconds() {
  const db = new SearchDatabase();
  console.log('Database total pages:', db.totalPagesCount);

  const engine = new CrawlerEngine(db, { concurrency: 20, autonomousMode: true });
  engine.on('log', l => {
    if (l.type === 'success') {
      console.log(`✓ [CRAWLED ${l.crawledCount}] ${l.domain} - "${l.title?.slice(0, 40)}" (${l.bytes} bytes, total DB: ${l.totalPages})`);
    } else {
      console.log(`✗ [${l.type.toUpperCase()}] ${l.domain} - ${l.statusText}`);
    }
  });

  console.log('Starting crawler with Wikipedia & Arxiv...');
  engine.start([
    'https://id.wikipedia.org/wiki/Halaman_Utama',
    'https://en.wikipedia.org/wiki/Main_Page',
    'https://arxiv.org'
  ], { autonomousMode: true });

  for (let i = 1; i <= 8; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const s = engine.getStatus();
    console.log(`[T+${i}s] activeWorkers: ${s.activeWorkers}, queued: ${s.queueSize}, crawled: ${s.crawledCount}, DB: ${db.totalPagesCount}, RPS: ${s.rps || 0}`);
  }

  await engine.stop();
  console.log('\nFinal DB total pages:', db.totalPagesCount);
  process.exit(0);
}

test10Seconds().catch(err => {
  console.error(err);
  process.exit(1);
});

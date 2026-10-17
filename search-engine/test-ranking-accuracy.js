import { SearchDatabase } from './src/indexer/db.js';
import { SearchEngine } from './src/indexer/search.js';

const db = new SearchDatabase();
const engine = new SearchEngine(db);

console.log('Testing engine.search synchronously...');
const t0 = Date.now();
const res = engine.search('claude itu apa');
console.log('Search completed in', Date.now() - t0, 'ms');
console.log('Instant Answer:', res.instantAnswer);
console.log('Total Results:', res.total);
if (res.results.length > 0) {
  res.results.slice(0, 5).forEach((r, idx) => {
    console.log(`  #${idx + 1} [Score: ${r.accuracyScore}] ${r.rawTitle || r.title} (${r.domain})`);
  });
}

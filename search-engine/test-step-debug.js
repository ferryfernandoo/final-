import { SearchDatabase } from './src/indexer/db.js';
import { SearchEngine } from './src/indexer/search.js';

const db = new SearchDatabase();
const engine = new SearchEngine(db);

console.log('Testing full search...');
const t0 = performance.now();
const res = engine.search('claude itu apa');
const elapsed = Math.round(performance.now() - t0);
console.log(`Search completed in ${elapsed}ms! Total: ${res.total}`);
console.log('Instant Answer:', res.instantAnswer?.title);
if (res.results.length > 0) {
  res.results.slice(0, 5).forEach((r, idx) => {
    console.log(`  #${idx + 1} [${r.accuracyScore} pts] ${r.rawTitle || r.title} (${r.domain})`);
  });
}

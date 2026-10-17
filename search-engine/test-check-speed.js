import { SearchDatabase } from './src/indexer/db.js';
import { GeoCrawler, INITIAL_TOP_SEEDS } from './src/crawler/geoCrawler.js';

const db = new SearchDatabase();

console.log('--- DATABASE STATS ---');
console.log('Pages:', db.db.prepare('SELECT count(*) as c FROM pages').get().c);
console.log('Images:', db.db.prepare('SELECT count(*) as c FROM images').get().c);
console.log('Geo Entities:', db.db.prepare('SELECT count(*) as c FROM geo_entities').get().c);
try {
  console.log('Celebrities:', db.db.prepare('SELECT count(*) as c FROM celebrities').get().c);
} catch {}

const geoCrawler = new GeoCrawler(db, { concurrency: 12, batchDelayMs: 20 });
console.log('\n--- TESTING GEO CRAWLER BATCH SPEED ---');
const t0 = performance.now();
const testItem = INITIAL_TOP_SEEDS[0]; // Candi Borobudur
console.log('Fetching place profile for:', testItem.name);
const place = await geoCrawler._fetchPlaceProfile(testItem);
console.log(`Fetched place profile in ${Math.round(performance.now() - t0)}ms:`, {
  name: place?.name,
  category: place?.category,
  lat: place?.lat,
  lng: place?.lng,
  photosCount: place?.photos?.length
});
process.exit(0);

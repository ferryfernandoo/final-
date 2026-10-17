import { SearchDatabase } from './src/indexer/db.js';
import { GeoCrawler } from './src/crawler/geoCrawler.js';
import { ImageCrawler } from './src/crawler/imageCrawler.js';

const db = new SearchDatabase();

console.log('======================================================');
console.log('⚡ TESTING TURBO GEO & IMAGE CRAWLER VELOCITY');
console.log('======================================================\n');

// 1. Test Turbo Geo Crawler
const geoCrawler = new GeoCrawler(db, { concurrency: 20, batchDelayMs: 15 });
let geoIndexedCount = 0;

geoCrawler.on('geo_indexed', (data) => {
  geoIndexedCount++;
  console.log(`[GEO REAL-TIME] 🗺️ #${geoIndexedCount} [${data.latencyMs}ms] ${data.name} (${data.category}) -> [${data.lat}, ${data.lng}] 📷 [${data.photo ? 'YES' : 'NO'}]`);
});

// 2. Test Turbo Image Crawler
const imageCrawler = new ImageCrawler(db, { concurrency: 16, batchDelayMs: 20 });
let imageIndexedCount = 0;

imageCrawler.on('image_indexed', (data) => {
  imageIndexedCount++;
  console.log(`[IMG REAL-TIME] 📸 #${imageIndexedCount} [${data.latencyMs}ms] ${data.title.slice(0, 30)} -> ${data.domain} [${data.width}x${data.height}]`);
});

console.log('Starting GeoCrawler and ImageCrawler for 6 seconds...');
geoCrawler.start();
imageCrawler.start();

await new Promise(r => setTimeout(r, 6000));

geoCrawler.stop();
imageCrawler.stop();

console.log('\n======================================================');
console.log(`🎉 GEO CRAWLED IN 6s: ${geoIndexedCount} places!`);
console.log(`🎉 IMAGES CRAWLED IN 6s: ${imageIndexedCount} photos!`);
console.log('======================================================');
process.exit(0);

import { SearchDatabase } from './src/indexer/db.js';
import { SearchEngine } from './src/indexer/search.js';
import { AiSynthesisEngine } from './src/indexer/aiSynthesisEngine.js';

const db = new SearchDatabase();
const searchEngine = new SearchEngine(db);
const aiSynth = new AiSynthesisEngine(db);

async function testSynthesis(query) {
  console.log('\n======================================================');
  console.log('AI SYNTHESIS TEST FOR:', query);
  console.log('======================================================');
  
  const searchResults = await searchEngine.searchAsync(query);
  console.log(`Search returned ${searchResults.total} results in ${searchResults.durationMs}ms`);
  
  const synth = aiSynth.synthesizeFast(query, searchResults.results, {
    instantAnswer: searchResults.instantAnswer
  });

  console.log('\n--- ANSWER ---');
  console.log(synth.summary);

  console.log('\n--- SOURCES ---');
  synth.sources.forEach(s => console.log(`[${s.citId}] ${s.domain} - ${s.title} (${s.url})`));

  console.log('\n--- FOLLOW UPS ---');
  synth.followUps.forEach(fu => console.log(`👉 ${fu}`));
}

async function run() {
  await testSynthesis('claude itu apa');
  await testSynthesis('apa itu deepseek');
  await testSynthesis('siapa prabowo');
  process.exit(0);
}

run();

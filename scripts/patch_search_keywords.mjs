import fs from 'node:fs';

const files = [
  'F:\\a final deepernova ai\\deepernova ai\\server\\webSearchService.js',
  'C:\\Users\\ferry fernando\\.gemini\\antigravity\\worktrees\\deepernova ai\\ai_agent_capability\\server\\webSearchService.js'
];

const helperCode = `
export function extractSearchKeywords(query) {
  if (!query) return '';
  const conversationalStopwords = new Set([
    'cari', 'carikan', 'tolong', 'coba', 'apakah', 'bagaimana', 'apa', 'kenapa', 'mengapa',
    'siapa', 'kapan', 'dimana', 'mana', 'katanya', 'ada', 'yang', 'dan', 'di', 'ke', 'dari',
    'ini', 'itu', 'untuk', 'dengan', 'pada', 'adalah', 'yaitu', 'tentang', 'mengenai', 'seputar',
    'perkuat', 'cek', 'periksa', 'lihat', 'dong', 'sih', 'ya', 'kan', 'deh', 'lah', 'pun',
    'kemarin', 'tadi', 'lalu', 'search', 'find', 'tell', 'me', 'about', 'what', 'is', 'how', 'why', 'who', 'please'
  ]);
  
  const words = query.trim().split(/\\s+/);
  const filtered = words.filter(w => {
    const cleanW = w.toLowerCase().replace(/[^\\p{L}\\p{N}]/gu, '');
    return cleanW.length >= 2 && !conversationalStopwords.has(cleanW);
  });
  
  if (filtered.length >= 1) {
    return filtered.join(' ');
  }
  return query.trim();
}
`;

for (const f of files) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    if (!content.includes('extractSearchKeywords')) {
      content = content.replace(/class WebSearchService \{/, `${helperCode}\nclass WebSearchService {`);
    }
    content = content.replace(
      /async _fetchLiveNewsRss\(query,\s*maxResults\s*=\s*8\)\s*\{[\r\n\s]*const enc = encodeURIComponent\(query\.trim\(\)\);[\r\n\s]*const feeds = \[[\r\n\s]*`https:\/\/news\.google\.com\/rss\/search\?q=\$\{enc\}&hl=id&gl=ID&ceid=ID:id`,/,
      `async _fetchLiveNewsRss(query, maxResults = 8) {\n    const cleanKw = extractSearchKeywords(query);\n    const targetQ = (cleanKw && cleanKw.length >= 2) ? cleanKw : query.trim();\n    const enc = encodeURIComponent(targetQ);\n    const feeds = [\n      \`https://news.google.com/rss/search?q=\${enc}&hl=id&gl=ID&ceid=ID:id\`,\n      \`https://news.google.com/rss/search?q=\${enc}&hl=en-US&gl=US&ceid=US:en\`,`
    );
    fs.writeFileSync(f, content, 'utf8');
    console.log('Successfully patched:', f);
  }
}


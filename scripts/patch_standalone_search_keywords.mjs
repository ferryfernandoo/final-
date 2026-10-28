import fs from 'node:fs';

const files = [
  'C:\\deepernova-search-main\\src\\server.js',
  'F:\\a final deepernova ai\\deepernova ai\\search-engine\\src\\server.js',
  'C:\\Users\\ferry fernando\\.gemini\\antigravity\\worktrees\\deepernova ai\\ai_agent_capability\\search-engine\\src\\server.js'
];

for (const f of files) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    
    // Add keyword extractor if not present
    if (!content.includes('function extractSearchKeywords(')) {
      const helper = `
function extractSearchKeywords(query) {
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
  return filtered.length >= 1 ? filtered.join(' ') : query.trim();
}
`;
      content = helper + '\n' + content;
    }

    content = content.replace(
      /const feedUrls = \[[\r\n\s]*`https:\/\/news\.google\.com\/rss\/search\?q=\$\{enc\}&hl=id&gl=ID&ceid=ID:id`,/,
      `const cleanKw = extractSearchKeywords(cleanQ);\n            const targetEnc = encodeURIComponent((cleanKw && cleanKw.length >= 2) ? cleanKw : cleanQ);\n            const feedUrls = [\n              \`https://news.google.com/rss/search?q=\${targetEnc}&hl=id&gl=ID&ceid=ID:id\`,`
    );

    fs.writeFileSync(f, content, 'utf8');
    console.log('Successfully patched search server:', f);
  }
}

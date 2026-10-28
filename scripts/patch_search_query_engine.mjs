import fs from 'node:fs';

const searchPath = 'C:\\deepernova-search-main\\src\\indexer\\search.js';
let code = fs.readFileSync(searchPath, 'utf8');

// 1. Replace SUBSTR(p.content, 1, 600) with '' as content in candidate queries
code = code.replace(/SUBSTR\(p\.content, 1, 600\) as content/g, "'' as content");

// 2. Reduce fetchQueryLimit from 80 to 32 max
code = code.replace(
  /const fetchQueryLimit = Math\.max\(limit \* 4, 80\);/g,
  'const fetchQueryLimit = Math.min(Math.max(limit * 2, 24), 36);'
);

// 3. In search(), early exit from Stage 1b and Stage 2 if we already have enough candidates
code = code.replace(
  /if \(!isBroadNewsQuery && candidatesMap\.size < limit && ftsQueryTokens\.length > 0\) \{/g,
  'if (!isBroadNewsQuery && candidatesMap.size < Math.min(limit, 6) && ftsQueryTokens.length > 0) {'
);

code = code.replace(
  /if \(!isBroadNewsQuery && candidatesMap\.size < limit && specificTokens\.length > 1\) \{/g,
  'if (!isBroadNewsQuery && candidatesMap.size < Math.min(limit, 4) && specificTokens.length > 1) {'
);

fs.writeFileSync(searchPath, code, 'utf8');

// Also sync to local search-engine/src/indexer/search.js
const localSearchPath = 'C:\\Users\\ferry fernando\\.gemini\\antigravity\\worktrees\\deepernova ai\\ai_agent_capability\\search-engine\\src\\indexer\\search.js';
if (fs.existsSync(localSearchPath)) {
  fs.writeFileSync(localSearchPath, code, 'utf8');
}

console.log('✅ search.js optimized and synced successfully!');

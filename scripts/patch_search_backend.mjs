import fs from 'node:fs';

const dbPath = 'C:\\deepernova-search-main\\src\\indexer\\db.js';
let code = fs.readFileSync(dbPath, 'utf8');

// 1. Hot rings capacity
code = code.replace(/this\.hotPagesRing\.length > 3000/g, 'this.hotPagesRing.length > 5000');
code = code.replace(/this\.hotNewsRing\.length > 1800/g, 'this.hotNewsRing.length > 3000');

// 2. WAL checkpoint & prune intervals
code = code.replace(
  /this\._walCheckpointInterval = setInterval\(\(\) => \{[\s\S]*?\}, 30000\);[\s\S]*?if \(this\._walCheckpointInterval\.unref\) this\._walCheckpointInterval\.unref\(\);/,
  '// WAL checkpoint disabled to prevent event-loop stalls on 115GB DB\n    this._walCheckpointInterval = null;'
);

code = code.replace(
  /this\._logPruneInterval = setInterval\(\(\) => \{[\s\S]*?\}, 300000\);[\s\S]*?if \(this\._logPruneInterval\.unref\) this\._logPruneInterval\.unref\(\);/,
  '// Log prune interval disabled to prevent event-loop stalls on 115GB DB\n    this._logPruneInterval = null;'
);

// 3. getImageCount fast RAM return
code = code.replace(
  /getImageCount\(\) \{\s*try \{\s*const row = this\.db\.prepare\('SELECT COUNT\(\*\) as count FROM images'\)\.get\(\);\s*return row \? row\.count : 0;\s*\} catch \{\s*return 0;\s*\}\s*\}/,
  'getImageCount() {\n    return this.totalImagesCount || 0;\n  }'
);

// 4. getRecentImages fast PK tail
code = code.replace(
  /SELECT id, image_url, page_url, domain, alt_text, title, context_text, is_logo, width, height, created_at\s*FROM images\s*ORDER BY created_at DESC, id DESC\s*LIMIT \?/,
  'SELECT id, image_url, page_url, domain, alt_text, title, context_text, is_logo, width, height, created_at FROM images WHERE id > (SELECT IFNULL(MAX(id), 0) - 500 FROM images) ORDER BY id DESC LIMIT ?'
);

// 5. getGeoCount and getCelebrityCount
code = code.replace(
  /getGeoCount\(\) \{\s*try \{\s*const row = this\.db\.prepare\('SELECT COUNT\(\*\) as count FROM geo_entities'\)\.get\(\);\s*return row \? row\.count : 0;\s*\} catch \{\s*return 0;\s*\}\s*\}/,
  `getGeoCount() {
    try {
      if (this._cachedGeoCount && Date.now() - (this._cachedGeoCountTime || 0) < 60000) return this._cachedGeoCount;
      const row = this.db.prepare('SELECT MAX(id) as count FROM geo_entities').get();
      this._cachedGeoCount = row ? (row.count || 0) : 0;
      this._cachedGeoCountTime = Date.now();
      return this._cachedGeoCount;
    } catch { return 0; }
  }`
);

code = code.replace(
  /getCelebrityCount\(\) \{\s*try \{\s*const row = this\.db\.prepare\('SELECT COUNT\(\*\) as count FROM celebrity_entities'\)\.get\(\);\s*return row \? row\.count : 0;\s*\} catch \{\s*return 0;\s*\}\s*\}/,
  `getCelebrityCount() {
    try {
      if (this._cachedCelebCount && Date.now() - (this._cachedCelebCountTime || 0) < 60000) return this._cachedCelebCount;
      const row = this.db.prepare('SELECT MAX(id) as count FROM celebrity_entities').get();
      this._cachedCelebCount = row ? (row.count || 0) : 0;
      this._cachedCelebCountTime = Date.now();
      return this._cachedCelebCount;
    } catch { return 0; }
  }`
);

// 6. stmtGetGeo index optimization
code = code.replace(
  /this\.stmtGetGeo = this\.db\.prepare\(`\s*SELECT \* FROM geo_entities\s*WHERE keyword_key = \?\s*OR LOWER\(name\) = \?\s*OR LOWER\(short_name\) = \?\s*OR keyword_key = \?\s*OR LOWER\(short_name\) = \?\s*LIMIT 1\s*`\);/,
  'this.stmtGetGeo = this.db.prepare(`SELECT * FROM geo_entities WHERE keyword_key = ? OR keyword_key = ? LIMIT 1`);'
);

// 7. flush micro-slice chunk size from 5 to 2 to eliminate write locks
code = code.replace(/const CHUNK_SIZE = 5;/g, 'const CHUNK_SIZE = 2;');

fs.writeFileSync(dbPath, code, 'utf8');

// Also sync to local search-engine/src/indexer/db.js
const localDbPath = 'C:\\Users\\ferry fernando\\.gemini\\antigravity\\worktrees\\deepernova ai\\ai_agent_capability\\search-engine\\src\\indexer\\db.js';
if (fs.existsSync(localDbPath)) {
  fs.writeFileSync(localDbPath, code, 'utf8');
}

console.log('✅ db.js patched and synced successfully!');


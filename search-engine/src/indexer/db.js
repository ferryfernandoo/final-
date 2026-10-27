import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { priorityGovernor } from './governor.js';

class SuggestionsLRUCache {
  constructor(maxSize = 20000, ttlMs = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.time > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.data;
  }
  set(key, data) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, time: Date.now() });
  }
  clear() {
    this.cache.clear();
  }
}

export class SearchDatabase {
  constructor(dbPath = null) {
    if (!dbPath) {
      let dataDir = process.env.DATA_DIR;
      if (!dataDir && fs.existsSync('D:\\deepernova-data')) {
        dataDir = 'D:\\deepernova-data';
      }
      if (!dataDir && fs.existsSync('C:\\deepernova-data')) {
        dataDir = 'C:\\deepernova-data';
      }
      if (!dataDir) {
        dataDir = path.resolve('data');
      }
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      dbPath = path.join(dataDir, 'search_engine.db');
    }

    this.dbPath = dbPath;
    this.db = new DatabaseSync(this.dbPath);
    this.writeQueue = Promise.resolve();
    this._suggestionsCache = new SuggestionsLRUCache(25000, 60000); // 25,000 keystroke prefixes, 60s TTL
    this._trendingCache = new SuggestionsLRUCache(100, 30000); // 30s TTL for trending list

    this.initDatabase();
  }

  initDatabase() {
    this.db.exec(`
      PRAGMA busy_timeout = 30000;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA wal_autocheckpoint = 1000;
      PRAGMA cache_size = -1048576;      -- 1GB RAM Cache for instant B-Tree navigation
      PRAGMA temp_store = MEMORY;        -- ZERO write to Disk C:! All temporary sorting in RAM!
      PRAGMA mmap_size = 34359738368;    -- 32GB Direct M.2 NVMe Kernel Memory-Mapped I/O
      PRAGMA threads = 4;                -- Parallel query processing
      PRAGMA read_uncommitted = 1;

      CREATE TABLE IF NOT EXISTS db_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Fast-path schema initialization check:
    // If the core 'pages' table already exists, skip executing redundant DDLs,
    // multiple ALTER TABLE try-catches, and index checks across the 20GB DB.
    let isSchemaInitialized = false;
    try {
      const check = this.db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'pages' LIMIT 1").get();
      if (check) isSchemaInitialized = true;
    } catch {}

    if (!isSchemaInitialized) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE NOT NULL,
        domain TEXT NOT NULL,
        title TEXT,
        description TEXT,
        headings TEXT,
        content TEXT,
        lang TEXT,
        logo_url TEXT,
        lead_image_url TEXT,
        word_count INTEGER DEFAULT 0,
        content_hash TEXT,
        status_code INTEGER,
        latency_ms INTEGER DEFAULT 0,
        pagerank REAL DEFAULT 1.0,
        trust_score REAL DEFAULT 50.0,
        category TEXT DEFAULT 'general',
        author TEXT,
        reading_time_min INTEGER DEFAULT 1,
        schema_type TEXT DEFAULT 'WebPage',
        is_verified_trust INTEGER DEFAULT 0,
        in_links_count INTEGER DEFAULT 0,
        out_links_count INTEGER DEFAULT 0,
        published_at INTEGER,
        crawled_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recent_news_cache (
        page_id INTEGER PRIMARY KEY,
        url TEXT NOT NULL,
        domain TEXT NOT NULL,
        title TEXT,
        description TEXT,
        lead_image_url TEXT,
        logo_url TEXT,
        pagerank REAL,
        in_links_count INTEGER,
        category TEXT DEFAULT 'news',
        published_at INTEGER,
        crawled_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_recent_news_published_at ON recent_news_cache(published_at DESC);
    `);

    // Ensure backwards compatibility columns exist
    try { this.db.exec(`ALTER TABLE pages ADD COLUMN published_at INTEGER;`); } catch { }
    try { this.db.exec(`ALTER TABLE pages ADD COLUMN logo_url TEXT;`); } catch { }
    try { this.db.exec(`ALTER TABLE pages ADD COLUMN lead_image_url TEXT;`); } catch { }
    try { this.db.exec(`ALTER TABLE pages ADD COLUMN trust_score REAL DEFAULT 50.0;`); } catch { }
    try { this.db.exec(`ALTER TABLE pages ADD COLUMN category TEXT DEFAULT 'general';`); } catch { }
    try { this.db.exec(`ALTER TABLE pages ADD COLUMN author TEXT;`); } catch { }
    try { this.db.exec(`ALTER TABLE pages ADD COLUMN reading_time_min INTEGER DEFAULT 1;`); } catch { }
    try { this.db.exec(`ALTER TABLE pages ADD COLUMN schema_type TEXT DEFAULT 'WebPage';`); } catch { }
    try { this.db.exec(`ALTER TABLE pages ADD COLUMN is_verified_trust INTEGER DEFAULT 0;`); } catch { }
    try { this.db.exec(`ALTER TABLE recent_news_cache ADD COLUMN category TEXT DEFAULT 'news';`); } catch { }

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_pages_domain ON pages(domain);
      CREATE INDEX IF NOT EXISTS idx_pages_domain_title ON pages(domain, title);
      CREATE INDEX IF NOT EXISTS idx_pages_pagerank ON pages(pagerank DESC);
      CREATE INDEX IF NOT EXISTS idx_pages_trust_score ON pages(trust_score DESC);
      CREATE INDEX IF NOT EXISTS idx_pages_category ON pages(category);
      CREATE INDEX IF NOT EXISTS idx_pages_is_verified ON pages(is_verified_trust);
      CREATE INDEX IF NOT EXISTS idx_pages_crawled_at ON pages(crawled_at DESC);
      CREATE INDEX IF NOT EXISTS idx_pages_published_at ON pages(published_at DESC);
      CREATE INDEX IF NOT EXISTS idx_pages_domain_pr ON pages(domain, pagerank DESC);
      CREATE INDEX IF NOT EXISTS idx_pages_cat_pub ON pages(category, published_at DESC);

      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id INTEGER,
        page_url TEXT NOT NULL,
        domain TEXT NOT NULL,
        image_url TEXT NOT NULL,
        alt_text TEXT,
        title TEXT,
        context_text TEXT,
        is_logo INTEGER DEFAULT 0,
        width INTEGER DEFAULT 0,
        height INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        UNIQUE(page_url, image_url)
      );

      CREATE INDEX IF NOT EXISTS idx_images_domain ON images(domain);
      CREATE INDEX IF NOT EXISTS idx_images_page_id ON images(page_id);
      CREATE INDEX IF NOT EXISTS idx_images_is_logo ON images(is_logo);

      CREATE VIRTUAL TABLE IF NOT EXISTS fts_images USING fts5(
        alt_text,
        title,
        context_text,
        domain,
        content='images',
        content_rowid='id',
        tokenize='porter unicode61'
      );

      CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_url TEXT NOT NULL,
        to_url TEXT NOT NULL,
        anchor_text TEXT,
        is_nofollow INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_links_from ON links(from_url);
      CREATE INDEX IF NOT EXISTS idx_links_to ON links(to_url);

      CREATE TABLE IF NOT EXISTS crawl_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT,
        domain TEXT,
        status INTEGER,
        status_text TEXT,
        latency_ms INTEGER,
        bytes INTEGER,
        created_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_logs_created_at ON crawl_logs(created_at DESC);

      CREATE VIRTUAL TABLE IF NOT EXISTS fts_pages USING fts5(
        title,
        description,
        headings,
        content,
        content='pages',
        content_rowid='id',
        tokenize='porter unicode61'
      );

        CREATE TABLE IF NOT EXISTS search_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT UNIQUE NOT NULL,
        normalized_query TEXT NOT NULL,
        frequency INTEGER DEFAULT 1,
        last_searched_at INTEGER NOT NULL,
        is_trending INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_queries_normalized ON search_queries(normalized_query);
      CREATE INDEX IF NOT EXISTS idx_queries_freq ON search_queries(frequency DESC, last_searched_at DESC);
      CREATE INDEX IF NOT EXISTS idx_queries_trending ON search_queries(is_trending DESC, frequency DESC);

      CREATE TABLE IF NOT EXISTS geo_entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        short_name TEXT,
        type TEXT,
        category TEXT,
        subtitle TEXT,
        flag TEXT,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        zoom INTEGER DEFAULT 10,
        description TEXT,
        capital TEXT,
        population TEXT,
        area TEXT,
        currency TEXT,
        timezone TEXT,
        language TEXT,
        phone_code TEXT,
        hierarchy TEXT,
        districts TEXT,
        photos_json TEXT,
        source TEXT DEFAULT 'crawler',
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_geo_keyword ON geo_entities(keyword_key);

      -- Materialized recent news cache for ultra-fast hot-news queries
      CREATE TABLE IF NOT EXISTS recent_news_cache (
        page_id INTEGER PRIMARY KEY,
        url TEXT NOT NULL,
        domain TEXT NOT NULL,
        title TEXT,
        description TEXT,
        lead_image_url TEXT,
        logo_url TEXT,
        pagerank REAL,
        in_links_count INTEGER,
        category TEXT DEFAULT 'news',
        published_at INTEGER,
        crawled_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_recent_news_published_at ON recent_news_cache(published_at DESC);

      CREATE TABLE IF NOT EXISTS celebrity_entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        stage_name TEXT,
        profession TEXT,
        subtitle TEXT,
        photo_url TEXT,
        biography TEXT,
        born_info TEXT,
        nationality TEXT,
        famous_works TEXT,
        awards TEXT,
        spouse TEXT,
        active_years TEXT,
        attributes_json TEXT,
        aliases TEXT,
        source_url TEXT,
        source TEXT DEFAULT 'wikipedia',
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_celeb_keyword ON celebrity_entities(keyword_key);

      CREATE TABLE IF NOT EXISTS celebrity_aliases (
        alias_key TEXT PRIMARY KEY,
        entity_key TEXT NOT NULL,
        display_alias TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_alias_entity ON celebrity_aliases(entity_key);

      CREATE TABLE IF NOT EXISTS real_market_charts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_key TEXT NOT NULL,
        period TEXT NOT NULL,
        points_json TEXT NOT NULL,
        change_pct REAL DEFAULT 0,
        min_price REAL DEFAULT 0,
        max_price REAL DEFAULT 0,
        current_price REAL DEFAULT 0,
        updated_at INTEGER NOT NULL,
        UNIQUE(asset_key, period)
      );
      CREATE INDEX IF NOT EXISTS idx_market_chart_key ON real_market_charts(asset_key, period);

      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        rate_limit_per_min INTEGER DEFAULT 120,
        requests_count INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        last_used_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);
    `);

    // Seed default public demo key if not present
    try {
      const hasDemo = this.db.prepare('SELECT 1 FROM api_keys WHERE api_key = ?').get('dn_live_free_public_demo');
      if (!hasDemo) {
        this.db.prepare(`
          INSERT INTO api_keys (api_key, name, rate_limit_per_min, requests_count, is_active, created_at)
          VALUES (?, ?, ?, 0, 1, ?)
        `).run('dn_live_free_public_demo', 'Public Free Demo Key', 120, Date.now());
      }
    } catch { }

    // Migration for aliases column in celebrity_entities
    try {
      this.db.exec(`ALTER TABLE celebrity_entities ADD COLUMN aliases TEXT;`);
    } catch { }

    // Clean up any accidental non-geo queries saved during tests
    try {
      this.db.exec(`DELETE FROM geo_entities WHERE keyword_key IN ('web', 'website', 'google', 'youtube', 'facebook', 'deepseek', 'chatgpt', 'openai', 'react', 'python', 'tutorial', 'download', 'game', 'berita');`);
    } catch { }
    } // End if (!isSchemaInitialized)

    // Schedule background refresh for recent news cache on every boot (even when schema was already initialized)
    try {
      this._recentNewsRefreshInterval = null;
      this.refreshRecentNews = (limit = 5000, windowMs = 24 * 3600 * 1000) => {
        try {
          const cutoff = Date.now() - windowMs;
          const insertStmt = this.db.prepare(`
            INSERT INTO recent_news_cache (page_id, url, domain, title, description, lead_image_url, logo_url, pagerank, in_links_count, category, published_at, crawled_at)
            SELECT id, url, domain, title, description, lead_image_url, logo_url, pagerank, in_links_count, COALESCE(category, 'news'), published_at, crawled_at
            FROM pages
            WHERE id > (SELECT IFNULL(MAX(id), 0) - 15000 FROM pages)
              AND (published_at >= ? OR crawled_at >= ?)
              AND title IS NOT NULL AND LENGTH(title) > 20
            ORDER BY COALESCE(published_at, crawled_at) DESC,
                     COALESCE(in_links_count, 0) DESC,
                     pagerank DESC
            LIMIT ?;
          `);

          this.db.exec('BEGIN IMMEDIATE');
          this.db.exec('DELETE FROM recent_news_cache;');
          insertStmt.run(cutoff, cutoff, limit);
          this.db.exec('COMMIT;');
        } catch (e) {
          try { this.db.exec('ROLLBACK;'); } catch {}
        }
      };

      const stat = (() => { try { return fs.statSync(this.dbPath); } catch { return null; }})();
      const skipInitial = stat && stat.size && stat.size > (5 * 1024 * 1024 * 1024); // 5GB
      if (!skipInitial) {
        this._recentNewsRefreshTimer = setTimeout(() => {
          try { this.refreshRecentNews(5000, 24 * 3600 * 1000); } catch {}
        }, 60000);
        if (this._recentNewsRefreshTimer.unref) this._recentNewsRefreshTimer.unref();
      }
      this._recentNewsRefreshInterval = setInterval(() => {
        try { this.refreshRecentNews(5000, 24 * 3600 * 1000); } catch {}
      }, 5 * 60 * 1000);
      if (this._recentNewsRefreshInterval.unref) this._recentNewsRefreshInterval.unref();
    } catch (e) {}



    this.stmtUpsertQuery = this.db.prepare(`
      INSERT INTO search_queries (query, normalized_query, frequency, last_searched_at, is_trending)
      VALUES (?, ?, 1, ?, 0)
      ON CONFLICT(query) DO UPDATE SET
        frequency = search_queries.frequency + 1,
        last_searched_at = excluded.last_searched_at
    `);

    this.stmtInsertPage = this.db.prepare(`
      INSERT INTO pages (
        url, domain, title, description, headings, content, lang,
        logo_url, lead_image_url,
        word_count, content_hash, status_code, latency_ms, pagerank,
        trust_score, category, author, reading_time_min, schema_type, is_verified_trust,
        in_links_count, out_links_count, published_at, crawled_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, 1.0,
        ?, ?, ?, ?, ?, ?,
        0, ?, ?, ?
      )
      ON CONFLICT(url) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        headings = excluded.headings,
        content = excluded.content,
        lang = excluded.lang,
        logo_url = COALESCE(excluded.logo_url, pages.logo_url),
        lead_image_url = COALESCE(excluded.lead_image_url, pages.lead_image_url),
        word_count = excluded.word_count,
        content_hash = excluded.content_hash,
        status_code = excluded.status_code,
        latency_ms = excluded.latency_ms,
        trust_score = excluded.trust_score,
        category = excluded.category,
        author = COALESCE(excluded.author, pages.author),
        reading_time_min = excluded.reading_time_min,
        schema_type = excluded.schema_type,
        is_verified_trust = excluded.is_verified_trust,
        out_links_count = excluded.out_links_count,
        published_at = excluded.published_at,
        crawled_at = excluded.crawled_at
    `);

    this.stmtInsertFTS = this.db.prepare(`
      INSERT INTO fts_pages (rowid, title, description, headings, content)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.stmtDeleteFTS = this.db.prepare(`
      INSERT INTO fts_pages(fts_pages, rowid, title, description, headings, content)
      VALUES('delete', ?, ?, ?, ?, ?)
    `);

    this.stmtInsertImage = this.db.prepare(`
      INSERT INTO images (
        page_id, page_url, domain, image_url, alt_text, title, context_text, is_logo, width, height, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(page_url, image_url) DO UPDATE SET
        alt_text = excluded.alt_text,
        title = excluded.title,
        context_text = excluded.context_text,
        is_logo = excluded.is_logo,
        width = excluded.width,
        height = excluded.height
    `);

    this.stmtInsertFTSImage = this.db.prepare(`
      INSERT INTO fts_images (rowid, alt_text, title, context_text, domain)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.stmtDeleteFTSImage = this.db.prepare(`
      INSERT INTO fts_images(fts_images, rowid, alt_text, title, context_text, domain)
      VALUES('delete', ?, ?, ?, ?, ?)
    `);

    this.stmtInsertLink = this.db.prepare(`
      INSERT INTO links (from_url, to_url, anchor_text, is_nofollow, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.stmtInsertLog = this.db.prepare(`
      INSERT INTO crawl_logs (url, domain, status, status_text, latency_ms, bytes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    this.stmtGetPageByUrl = this.db.prepare(`
      SELECT id, title, description, headings, content, logo_url, lead_image_url FROM pages WHERE url = ?
    `);

    this.stmtFindStaleDups = this.db.prepare(`
      SELECT id, title, description, headings, content FROM pages WHERE domain = ? AND title = ? AND url != ?
    `);

    this.stmtDeletePageById = this.db.prepare(`
      DELETE FROM pages WHERE id = ?
    `);

    this.stmtGetImagesByPageId = this.db.prepare(`
      SELECT id, alt_text, title, context_text, domain FROM images WHERE page_id = ?
    `);

    this.stmtDeleteImagesByPageId = this.db.prepare(`
      DELETE FROM images WHERE page_id = ?
    `);

    this.stmtSuggestionsQuery = this.db.prepare(`
      SELECT query, frequency, is_trending,
        (
          (CASE WHEN normalized_query LIKE ? THEN 120 ELSE 60 END) +
          (frequency * 2.5) +
          (is_trending * 40) +
          (CASE WHEN (last_searched_at >= ?) THEN 25 ELSE 0 END)
        ) as score
      FROM search_queries
      WHERE normalized_query LIKE ? OR normalized_query LIKE ?
      ORDER BY score DESC, frequency DESC
      LIMIT ?
    `);

    this.stmtSuggestionsPage = this.db.prepare(`
      SELECT p.title, p.pagerank
      FROM (
        SELECT rowid FROM fts_pages WHERE fts_pages MATCH ? LIMIT ?
      ) f
      JOIN pages p ON f.rowid = p.id
      WHERE length(p.title) > 3 AND length(p.title) < 70
    `);

    this.stmtTrendingQueries = this.db.prepare(`
      SELECT query, frequency, is_trending
      FROM search_queries
      ORDER BY is_trending DESC, frequency DESC, last_searched_at DESC
      LIMIT ?
    `);

    // Precompiled prepared statements for instant entity queries (Zero compile overhead during search)
    try {
      this.stmtGetGeo = this.db.prepare(`
        SELECT * FROM geo_entities 
        WHERE keyword_key = ? 
           OR LOWER(name) = ? 
           OR LOWER(short_name) = ?
           OR keyword_key = ?
           OR LOWER(short_name) = ?
        LIMIT 1
      `);

      this.stmtGetCelebDirect = this.db.prepare(`
        SELECT * FROM celebrity_entities 
        WHERE keyword_key = ? OR LOWER(name) = ? OR LOWER(stage_name) = ?
        LIMIT 1
      `);

      this.stmtGetCelebAlias = this.db.prepare(`
        SELECT entity_key FROM celebrity_aliases WHERE alias_key = ? OR alias_key = ? LIMIT 1
      `);

      this.stmtGetCelebByKey = this.db.prepare(`
        SELECT * FROM celebrity_entities WHERE keyword_key = ? LIMIT 1
      `);

      this.stmtGetCelebPartial = this.db.prepare(`
        SELECT * FROM celebrity_entities 
        WHERE aliases IS NOT NULL AND (LOWER(aliases) LIKE ? OR LOWER(aliases) LIKE ?)
        LIMIT 1
      `);
    } catch {}

    // In-memory instant caches for sub-millisecond entity resolution
    this._geoEntityCache = new Map(); // Super-fast RAM lookup
    this._celebEntityCache = new Map();
    this._celebEntityCache = new Map();

    // In-memory instant telemetry counters & domain map (Sub-millisecond Lightning Boot)
    this.domainCounts = new Map();
    this.totalPagesCount = 0;
    this.totalLinksCount = 0;
    this.totalImagesCount = 0;

    // Load instantly from db_metadata table in < 1ms (zero disk scan)
    try {
      const metaRows = this.db.prepare('SELECT key, value FROM db_metadata').all() || [];
      for (const row of metaRows) {
        if (row.key === 'total_pages') this.totalPagesCount = parseInt(row.value, 10) || 0;
        if (row.key === 'total_links') this.totalLinksCount = parseInt(row.value, 10) || 0;
        if (row.key === 'total_images') this.totalImagesCount = parseInt(row.value, 10) || 0;
      }
    } catch { }

    // Deferred background reconciliation: Never block server boot with full-table scans.
    // Reconciles table counters and top domains in background after HTTP server is live.
    const reconTimer = setTimeout(() => {
      this.reconcileCounters();
    }, this.totalPagesCount === 0 ? 1500 : 86400000);
    if (reconTimer.unref) reconTimer.unref();

    this.recentLogsBuffer = [];
    this.pageBuffer = [];
    this.logBuffer = [];
    this.queryLogBuffer = [];
    this._isFlushing = false;

    // Unified non-blocking micro-batch transaction timer (every 500ms on SSD)
    // Ensures SQLite writes fast while remaining 99% free for sub-20ms search queries
    this._flushInterval = setInterval(() => {
      if (!priorityGovernor.isPriorityActive()) {
        this.flushAllBuffers();
      }
    }, 500);
    if (this._flushInterval.unref) this._flushInterval.unref();

    // Auto-flush pending buffers once search queries become idle
    priorityGovernor.on('search_idle', () => {
      if (this.pageBuffer.length > 0 || this.logBuffer.length > 0 || this.queryLogBuffer.length > 0) {
        this.flushAllBuffers();
      }
    });

    // Periodic log table pruning (every 5 minutes, outside search path)
    this._logPruneInterval = setInterval(() => {
      try {
        this.db.exec('DELETE FROM crawl_logs WHERE id < (SELECT MAX(id) - 10000 FROM crawl_logs);');
      } catch { }
    }, 300000);
    if (this._logPruneInterval.unref) this._logPruneInterval.unref();

    // Periodic WAL cleanup to keep SQLite queries ultra fast
    this._walCheckpointInterval = setInterval(() => {
      try {
        this.db.exec('PRAGMA wal_checkpoint(PASSIVE);');
      } catch { }
    }, 30000);
    if (this._walCheckpointInterval.unref) this._walCheckpointInterval.unref();

    // Periodic metadata sync (every 10 seconds)
    this._metaSyncInterval = setInterval(() => {
      this.saveMetadata();
    }, 10000);
    if (this._metaSyncInterval.unref) this._metaSyncInterval.unref();
  }

  /**
   * Persist in-memory counters to db_metadata table in < 1ms
   */
  saveMetadata() {
    try {
      const stmt = this.db.prepare('INSERT INTO db_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
      stmt.run('total_pages', String(this.totalPagesCount || 0));
      stmt.run('total_links', String(this.totalLinksCount || 0));
      stmt.run('total_images', String(this.totalImagesCount || 0));
    } catch { }
  }

  /**
   * Asynchronously reconciles counters in background without blocking server boot
   */
  reconcileCounters() {
    // ⚡ Zero-disk-bloat guard: Never execute full table scan / GROUP BY on 100GB database!
    if (this.totalPagesCount > 0) return;
    try {
      const pageId = this.db.prepare('SELECT MAX(id) as c FROM pages').get()?.c || 0;
      if (pageId > 0) this.totalPagesCount = pageId;
      const linkId = this.db.prepare('SELECT MAX(id) as c FROM links').get()?.c || 0;
      if (linkId > 0) this.totalLinksCount = linkId;
      const imgId = this.db.prepare('SELECT MAX(id) as c FROM images').get()?.c || 0;
      if (imgId > 0) this.totalImagesCount = imgId;

      this.saveMetadata();
    } catch { }
  }

  /**
   * Checkpoint and truncate WAL file to shrink disk size
   */
  checkpoint(mode = 'PASSIVE') {
    try {
      return this.db.prepare(`PRAGMA wal_checkpoint(${mode})`).get();
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * Safely flush buffers and close the database connection
   */
  close() {
    try {
      this.flushAllBuffers();
      this.saveMetadata();
      this.checkpoint('PASSIVE');
      this.db.close();
    } catch (e) {
      // Ignore on exit
    }
  }

  /**
   * Retrieves recent indexed URLs for instant memory-cache seeding
   */
  getAllIndexedUrls(limit = 5000) {
    try {
      return this.db.prepare('SELECT url FROM pages ORDER BY id DESC LIMIT ?').all(limit) || [];
    } catch {
      return [];
    }
  }

  /**
   * Ultra-fast non-blocking buffered save
   */
  async savePage(pageData) {
    if (!pageData || !pageData.url) return;
    this.pageBuffer.push(pageData);
    if (this.pageBuffer.length >= 32 && !priorityGovernor.isPriorityActive()) {
      this.flushAllBuffers();
    }
  }

  flushPageBuffer() {
    this.flushAllBuffers();
  }

  logCrawl(url, domain, status, statusText, latencyMs, bytes) {
    const now = Date.now();
    const logItem = {
      url,
      domain: domain || '',
      status: status || 0,
      status_text: statusText || '',
      latency_ms: latencyMs || 0,
      bytes: bytes || 0,
      created_at: now
    };

    // Fast in-memory ring buffer for instant zero-query telemetry
    this.recentLogsBuffer.unshift(logItem);
    if (this.recentLogsBuffer.length > 40) {
      this.recentLogsBuffer.pop();
    }

    this.logBuffer.push(logItem);
    if (this.logBuffer.length >= 100 && !priorityGovernor.isPriorityActive()) {
      this.flushAllBuffers();
    }
  }

  flushLogBuffer() {
    this.flushAllBuffers();
  }

  /**
   * Non-blocking micro-slice chunking: writes pages in small slices of 8 pages (~12ms per transaction).
   * Between slices, yields to the event loop with setImmediate so SQLite read locks are instantly available
   * for concurrent user search queries (<25ms latency), while crawlers run at maximum speed without interruption.
   */
  async flushAllBuffers() {
    if (this._isFlushing) return;
    if (priorityGovernor.isPriorityActive()) {
      // Search is active! Defer flush so SQLite write-locks don't stall queries
      return;
    }
    if (this.pageBuffer.length === 0 && this.logBuffer.length === 0 && this.queryLogBuffer.length === 0) {
      return;
    }

    this._isFlushing = true;
    const pageBatch = this.pageBuffer;
    this.pageBuffer = [];
    const logBatch = this.logBuffer;
    this.logBuffer = [];
    const queryBatch = this.queryLogBuffer;
    this.queryLogBuffer = [];

    try {
      // 1. Process pageBatch in micro-slices of 16 pages
      const CHUNK_SIZE = 16;
      for (let i = 0; i < pageBatch.length; i += CHUNK_SIZE) {
        if (priorityGovernor.isPriorityActive()) {
          // Search query arrived mid-flush! Yield write lock immediately
          const remaining = pageBatch.slice(i);
          this.pageBuffer.unshift(...remaining);
          break;
        }
        const slice = pageBatch.slice(i, i + CHUNK_SIZE);
        const now = Date.now();

        try {
          this.db.exec('BEGIN IMMEDIATE;');

          for (const pageData of slice) {
            try {
              const domain = pageData.domain || '';
              const outLinksCount = pageData.outgoingLinks ? pageData.outgoingLinks.length : 0;
              const publishedAt = (pageData.publishedAt && pageData.publishedAt > 946684800000)
                ? Number(pageData.publishedAt)
                : (pageData.category === 'news' ? now : null);

              const existing = this.stmtGetPageByUrl.get(pageData.url);
              if (existing) {
                // 1. Purge old FTS index entries for this page
                try {
                  this.stmtDeleteFTS.run(
                    existing.id,
                    existing.title || '',
                    existing.description || '',
                    existing.headings || '',
                    existing.content || ''
                  );
                } catch { }

                // 2. Purge old images for this page so only fresh images are stored
                try {
                  const oldImgs = this.stmtGetImagesByPageId.all(existing.id);
                  for (const oi of oldImgs) {
                    try {
                      this.stmtDeleteFTSImage.run(oi.id, oi.alt_text || '', oi.title || '', oi.context_text || '', oi.domain || '');
                    } catch {}
                  }
                  this.stmtDeleteImagesByPageId.run(existing.id);
                } catch {}
              }

              // 3. Purge older versions of the same article on the same domain (indexed & instantaneous)
              if (pageData.title && pageData.title.trim().length >= 10) {
                try {
                  const staleDups = this.stmtFindStaleDups.all(domain, pageData.title.trim(), pageData.url);

                  for (const stale of staleDups) {
                    try {
                      this.stmtDeleteFTS.run(
                        stale.id,
                        stale.title || '',
                        stale.description || '',
                        stale.headings || '',
                        stale.content || ''
                      );
                    } catch {}
                    try {
                      const staleImgs = this.stmtGetImagesByPageId.all(stale.id);
                      for (const si of staleImgs) {
                        try {
                          this.stmtDeleteFTSImage.run(si.id, si.alt_text || '', si.title || '', si.context_text || '', si.domain || '');
                        } catch {}
                      }
                      this.stmtDeleteImagesByPageId.run(stale.id);
                    } catch {}
                    this.stmtDeletePageById.run(stale.id);
                    this.totalPagesCount = Math.max(0, (this.totalPagesCount || 1) - 1);
                  }
                } catch {}
              }

              const logoUrl = pageData.logoUrl || null;
              const leadImageUrl = pageData.leadImageUrl || null;

              const info = this.stmtInsertPage.run(
                pageData.url,
                domain,
                pageData.title || '',
                pageData.description || '',
                pageData.headings || '',
                pageData.content || '',
                pageData.lang || 'id',
                logoUrl,
                leadImageUrl,
                pageData.wordCount || 0,
                pageData.contentHash || '',
                pageData.statusCode || 200,
                pageData.latencyMs || 0,
                pageData.trustScore || 50.0,
                (() => {
                  if (pageData.category && pageData.category !== 'general') return pageData.category;
                  const u = (pageData.url || '').toLowerCase();
                  const d = domain.toLowerCase();
                  if (
                    d.includes('detik.com') || d.includes('kompas.com') || d.includes('antaranews.com') ||
                    d.includes('cnnindonesia.com') || d.includes('cnbcindonesia.com') || d.includes('tribunnews.com') ||
                    d.includes('tempo.co') || d.includes('liputan6.com') || d.includes('republika.co.id') ||
                    d.includes('sindonews.com') || d.includes('merdeka.com') || d.includes('suara.com') ||
                    d.includes('jawapos.com') || d.includes('kumparan.com') || d.includes('inews.id') ||
                    d.includes('okezone.com') || d.includes('katadata.co.id') || d.includes('kontan.co.id') ||
                    d.includes('bisnis.com') || d.includes('rri.co.id') || d.includes('beritasatu.com') ||
                    d.includes('disway.id') || d.includes('viva.co.id') || d.includes('idntimes.com') ||
                    d.includes('pikiran-rakyat.com') || d.includes('mediaindonesia.com') || d.includes('tvrinews.com') ||
                    d.includes('elshinta.com') || d.includes('radarbogor.id') || d.includes('tirto.id') ||
                    d.includes('bbc.com') || d.includes('reuters.com') || d.includes('apnews.com') ||
                    d.includes('aljazeera.com') || d.includes('voaindonesia.com') ||
                    u.includes('/berita/') || u.includes('/news/') || u.includes('/read/')
                  ) {
                    return 'news';
                  }
                  return 'general';
                })(),
                pageData.author || null,
                pageData.readingTimeMin || 1,
                pageData.schemaType || 'WebPage',
                pageData.isVerifiedTrust ? 1 : 0,
                outLinksCount,
                publishedAt,
                now
              );

              const rowId = existing ? existing.id : Number(info.lastInsertRowid);
              if (!existing) {
                this.totalPagesCount++;
                this.domainCounts.set(domain, (this.domainCounts.get(domain) || 0) + 1);
              }

              try {
                this.stmtInsertFTS.run(
                  rowId,
                  pageData.title || '',
                  pageData.description || '',
                  pageData.headings || '',
                  pageData.content || ''
                );
              } catch { }

              // Save top images (capped to 2 per page)
              const imagesToSave = (pageData.images || []).slice(0, 2);
              if (imagesToSave.length > 0) {
                for (const img of imagesToSave) {
                  try {
                    const imgInfo = this.stmtInsertImage.run(
                      rowId,
                      pageData.url,
                      domain,
                      img.url,
                      img.alt_text || '',
                      img.title || '',
                      img.context_text || '',
                      img.is_logo ? 1 : 0,
                      img.width || 0,
                      img.height || 0,
                      now
                    );
                    const imgRowId = Number(imgInfo.lastInsertRowid);
                    if (imgRowId) {
                      this.totalImagesCount = (this.totalImagesCount || 0) + 1;
                      try {
                        this.stmtInsertFTSImage.run(
                          imgRowId,
                          img.alt_text || '',
                          img.title || '',
                          img.context_text || '',
                          domain
                        );
                      } catch { }
                    }
                  } catch { }
                }
              }

              // Save top outgoing links (capped to top 5 to protect links table performance)
              if (pageData.outgoingLinks && pageData.outgoingLinks.length > 0) {
                const topLinks = pageData.outgoingLinks.slice(0, 5);
                for (const link of topLinks) {
                  try {
                    this.stmtInsertLink.run(
                      pageData.url,
                      link.url,
                      link.anchorText || '',
                      link.isNoFollow ? 1 : 0,
                      now
                    );
                    this.totalLinksCount++;
                  } catch { }
                }
              }
            } catch { }
          }

          this.db.exec('COMMIT;');
        } catch (sliceErr) {
          try { this.db.exec('ROLLBACK;'); } catch { }
        }

        // Yield to Node event loop between slices so search queries execute instantly
        if (i + CHUNK_SIZE < pageBatch.length) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }

      // 2. Process logBatch in a quick micro-transaction
      if (logBatch.length > 0) {
        if (priorityGovernor.isPriorityActive()) {
          this.logBuffer.unshift(...logBatch);
        } else {
          try {
            this.db.exec('BEGIN IMMEDIATE;');
            for (const log of logBatch) {
              try {
                this.stmtInsertLog.run(
                  log.url,
                  log.domain,
                  log.status,
                  log.status_text,
                  log.latency_ms,
                  log.bytes,
                  log.created_at
                );
              } catch { }
            }
            this.db.exec('COMMIT;');
          } catch {
            try { this.db.exec('ROLLBACK;'); } catch { }
          }
        }
      }

      // 3. Process queryBatch in a quick micro-transaction
      if (queryBatch.length > 0) {
        try {
          this.db.exec('BEGIN IMMEDIATE;');
          for (const item of queryBatch) {
            try {
              this.stmtUpsertQuery.run(item.clean, item.normalized, item.now);
            } catch { }
          }
          this.db.exec('COMMIT;');
        } catch {
          try { this.db.exec('ROLLBACK;'); } catch { }
        }
      }
    } catch (err) {
      // Re-queue remaining if fatal failure
      if (pageBatch.length > 0) this.pageBuffer.unshift(...pageBatch.slice(0, 50));
    } finally {
      this._isFlushing = false;
    }
  }

  getStats() {
    const now = Date.now();

    // Seed domainCounts in <1ms from recent 2000 rows by PK if empty (NEVER full-table scan 20GB pages table!)
    if (this.domainCounts.size === 0 && !this._seededRecentDomains) {
      this._seededRecentDomains = true;
      try {
        const rows = this.db.prepare('SELECT domain FROM pages WHERE id > (SELECT IFNULL(MAX(id), 0) - 2000 FROM pages)').all() || [];
        for (const r of rows) {
          if (r.domain) {
            this.domainCounts.set(r.domain, (this.domainCounts.get(r.domain) || 0) + 1);
          }
        }
      } catch {}
    }

    if (!this._cachedTopDomains || now - (this._lastTopDomainsCalc || 0) > 5000) {
      this._lastTopDomainsCalc = now;
      this._cachedTopDomains = [...this.domainCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([domain, count]) => ({ domain, count }));
    }

    this._cachedDomainCount = Math.max(this.domainCounts.size, 1);

    return {
      totalPages: this.totalPagesCount || 0,
      totalLinks: this.totalLinksCount || 0,
      totalImages: this.totalImagesCount || 0,
      totalDomains: Number(this._cachedDomainCount || this.domainCounts.size || 0),
      avgLatencyMs: 0,
      topDomains: this._cachedTopDomains || [],
      recentLogs: this.recentLogsBuffer.slice(0, 25)
    };
  }

  reset() {
    this.totalPagesCount = 0;
    this.totalLinksCount = 0;
    this.totalImagesCount = 0;
    this.recentLogsBuffer = [];
    this._cachedTopDomains = [];
    this.db.exec(`
      DELETE FROM fts_images;
      DELETE FROM images;
      DELETE FROM fts_pages;
      DELETE FROM links;
      DELETE FROM pages;
      DELETE FROM crawl_logs;
      DELETE FROM search_queries;
      VACUUM;
    `);
  }

  /**
   * Log search query and increment frequency count asynchronously (zero overhead on search read path)
   */
  logQuery(rawQuery) {
    if (!rawQuery || typeof rawQuery !== 'string') return;
    const clean = rawQuery.trim();
    if (clean.length < 2 || clean.length > 100) return;
    const normalized = clean.toLowerCase();

    this.queryLogBuffer.push({ clean, normalized, now: Date.now() });
    // NEVER flush synchronously in search request path to avoid SQLite lock contention!
  }

  flushQueryLogBuffer() {
    this.flushAllBuffers();
  }

  /**
   * Google-style search suggestion algorithm using ultra-fast precompiled statements:
   * 1. Prefix matches (query starts with prefix) -> Highest score (+100)
   * 2. Substring word boundary matches (query contains word starting with prefix) -> High score (+50)
   * 3. Frequency boost (how often searched by users)
   * 4. Trending boost (surging searches)
   * 5. Fallback matches from indexed page titles if query suggestions < limit
   */
  getSuggestions(rawPrefix, limit = 8) {
    if (!rawPrefix || typeof rawPrefix !== 'string' || !rawPrefix.trim()) {
      return this.getTrendingQueries(limit);
    }

    const prefix = rawPrefix.trim().toLowerCase();
    const cacheKey = `${prefix}:${limit}`;
    const cached = this._suggestionsCache ? this._suggestionsCache.get(cacheKey) : null;
    if (cached) {
      return cached;
    }

    const prefixWildcard = `${prefix}%`;
    const containsWildcard = `% ${prefix}%`;
    const nowThreshold = Date.now() - 86400000;

    try {
      // 1. Query search_queries table using precompiled statement
      const queryRows = (this.stmtSuggestionsQuery
        ? this.stmtSuggestionsQuery.all(prefixWildcard, nowThreshold, prefixWildcard, containsWildcard, limit)
        : []) || [];

      const suggestions = queryRows.map(r => ({
        query: r.query,
        frequency: r.frequency,
        isTrending: Boolean(r.is_trending),
        type: 'query'
      }));

      // 2. If suggestions are sparse (<3), supplement with page titles using bounded fast subquery
      if (suggestions.length < 3 && this.stmtSuggestionsPage) {
        const remaining = limit - suggestions.length;
        const seen = new Set(suggestions.map(s => s.query.toLowerCase()));

        try {
          const cleanSearchTerm = prefix.replace(/[^\p{L}\p{N}]/gu, '').trim();
          if (cleanSearchTerm && cleanSearchTerm.length >= 2) {
            const ftsMatch = `title:"${cleanSearchTerm}"*`;
            const pageRows = this.stmtSuggestionsPage.all(ftsMatch, Math.min(remaining * 2, 16)) || [];
            for (const p of pageRows) {
              if (suggestions.length >= limit) break;
              const cleanTitle = p.title.replace(/\s*[-|–—].*$/, '').trim(); // strip brand suffix
              if (cleanTitle && !seen.has(cleanTitle.toLowerCase())) {
                seen.add(cleanTitle.toLowerCase());
                suggestions.push({
                  query: cleanTitle,
                  frequency: 1,
                  isTrending: false,
                  type: 'title'
                });
              }
            }
          }
        } catch { }
      }

      if (this._suggestionsCache) {
        this._suggestionsCache.set(cacheKey, suggestions);
      }

      return suggestions;
    } catch (e) {
      console.error('getSuggestions error:', e);
      return [];
    }
  }

  /**
   * Get top trending queries (Google Trending Searches) using precompiled statement
   */
  getTrendingQueries(limit = 8) {
    const cacheKey = `trending:${limit}`;
    const cached = this._trendingCache ? this._trendingCache.get(cacheKey) : null;
    if (cached) {
      return cached;
    }

    try {
      if (this.stmtTrendingQueries) {
        const rows = this.stmtTrendingQueries.all(limit) || [];
        const result = rows.map(r => ({
          query: r.query,
          frequency: r.frequency,
          isTrending: Boolean(r.is_trending || r.frequency > 5),
          type: 'trending'
        }));
        if (this._trendingCache) {
          this._trendingCache.set(cacheKey, result);
        }
        return result;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Seed realistic popular and trending Indonesian search queries
   */
  seedInitialPopularQueries() {
    try {
      const existing = this.db.prepare('SELECT COUNT(*) as count FROM search_queries').get();
      if (existing && existing.count > 0) return; // Zero disk writes if already seeded!
    } catch { }

    const popularSearches = [
      { query: 'Indonesia', frequency: 1250, isTrending: 1 },
      { query: 'Berita Terkini Hari Ini', frequency: 980, isTrending: 1 },
      { query: 'BMKG Cuaca & Gempa', frequency: 870, isTrending: 1 },
      { query: 'DeepSeek AI', frequency: 820, isTrending: 1 },
      { query: 'YouTube Trending', frequency: 790, isTrending: 0 },
      { query: 'ChatGPT OpenAI', frequency: 750, isTrending: 1 },
      { query: 'Shopee Promo Gratis Ongkir', frequency: 620, isTrending: 0 },
      { query: 'Tokopedia Marketplace', frequency: 580, isTrending: 0 },
      { query: 'Kompas Berita Nasional', frequency: 540, isTrending: 0 },
      { query: 'detikNews Breaking News', frequency: 530, isTrending: 0 },
      { query: 'Kecerdasan Buatan AI', frequency: 490, isTrending: 1 },
      { query: 'PageRank Algorithm', frequency: 420, isTrending: 0 },
      { query: 'BM25 Information Retrieval', frequency: 380, isTrending: 0 },
      { query: 'Wikipedia Indonesia', frequency: 360, isTrending: 0 },
      { query: 'CNN Indonesia Ekonomi', frequency: 340, isTrending: 0 },
      { query: 'CNBC Indonesia Market', frequency: 310, isTrending: 0 },
      { query: 'Teknologi Gadget Terbaru', frequency: 290, isTrending: 0 },
      { query: 'Tribunnews Nasional', frequency: 280, isTrending: 0 }
    ];

    const now = Date.now();
    try {
      const stmt = this.db.prepare(`
        INSERT INTO search_queries (query, normalized_query, frequency, last_searched_at, is_trending)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(query) DO NOTHING
      `);
      for (const s of popularSearches) {
        stmt.run(s.query, s.query.toLowerCase(), s.frequency, now, s.isTrending);
      }
    } catch (e) {
      console.error('Error seeding popular queries:', e);
    }
  }

  /**
   * Get cached or crawled geo entity by keyword
   */
  getGeoEntity(keyword) {
    try {
      const clean = (keyword || '').trim().toLowerCase();
      if (!clean) return null;
      if (this._geoEntityCache && this._geoEntityCache.has(clean)) {
        return this._geoEntityCache.get(clean);
      }

      const stripped = clean.replace(/^(kota|kabupaten|provinsi|gunung|candi|danau|pantai|pulau|kepulauan|taman nasional)\s+/i, '').trim();

      const stmt = this.stmtGetGeo || this.db.prepare(`
        SELECT * FROM geo_entities 
        WHERE keyword_key = ? 
           OR LOWER(name) = ? 
           OR LOWER(short_name) = ?
           OR keyword_key = ?
           OR LOWER(short_name) = ?
        LIMIT 1
      `);
      const row = stmt.get(clean, clean, clean, stripped, stripped);
      if (!row) {
        if (this._geoEntityCache && this._geoEntityCache.size < 2000) {
          this._geoEntityCache.set(clean, null);
        }
        return null;
      }

      const entity = {
        type: 'geo_location',
        title: row.name,
        shortName: row.short_name || row.name,
        category: row.category,
        subtitle: row.subtitle,
        flag: row.flag || '📍',
        lat: row.lat,
        lng: row.lng,
        zoom: row.zoom || 10,
        description: row.description,
        capital: row.capital,
        population: row.population,
        area: row.area,
        currency: row.currency,
        timezone: row.timezone,
        language: row.language,
        phoneCode: row.phone_code,
        hierarchy: row.hierarchy,
        districts: row.districts,
        photos: row.photos_json ? JSON.parse(row.photos_json) : [],
        osmEmbedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${(row.lng - 0.08).toFixed(4)},${(row.lat - 0.08).toFixed(4)},${(row.lng + 0.08).toFixed(4)},${(row.lat + 0.08).toFixed(4)}&layer=mapnik&marker=${row.lat},${row.lng}`,
        gmapsUrl: `https://www.google.com/maps/search/?api=1&query=${row.lat},${row.lng}`,
        verified: true,
        source: row.source || 'crawler'
      };

      if (this._geoEntityCache && this._geoEntityCache.size < 2000) {
        this._geoEntityCache.set(clean, entity);
      }
      return entity;
    } catch {
      return null;
    }
  }

  /**
   * Persist a discovered or crawled geo entity into SQLite
   */
  saveGeoEntity(data) {
    try {
      const clean = (data.keyword_key || data.shortName || data.name || '').trim().toLowerCase();
      if (!clean || isNaN(data.lat) || isNaN(data.lng)) return;
      if (this._geoEntityCache) {
        this._geoEntityCache.delete(clean);
      }
      const stmt = this.db.prepare(`
        INSERT INTO geo_entities (
          keyword_key, name, short_name, type, category, subtitle, flag,
          lat, lng, zoom, description, capital, population, area,
          currency, timezone, language, phone_code, hierarchy, districts,
          photos_json, source, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(keyword_key) DO UPDATE SET
          name = excluded.name,
          short_name = excluded.short_name,
          category = excluded.category,
          subtitle = excluded.subtitle,
          flag = excluded.flag,
          lat = excluded.lat,
          lng = excluded.lng,
          zoom = excluded.zoom,
          description = excluded.description,
          capital = excluded.capital,
          population = excluded.population,
          area = excluded.area,
          currency = excluded.currency,
          timezone = excluded.timezone,
          language = excluded.language,
          phone_code = excluded.phone_code,
          hierarchy = excluded.hierarchy,
          districts = excluded.districts,
          photos_json = excluded.photos_json,
          source = excluded.source,
          updated_at = excluded.updated_at
      `);
      stmt.run(
        clean,
        data.name || clean,
        data.shortName || null,
        data.type || 'location',
        data.category || null,
        data.subtitle || null,
        data.flag || '📍',
        Number(data.lat),
        Number(data.lng),
        Number(data.zoom || 10),
        data.description || null,
        data.capital || null,
        data.population || null,
        data.area || null,
        data.currency || null,
        data.timezone || null,
        data.language || null,
        data.phoneCode || null,
        data.hierarchy || null,
        data.districts || null,
        data.photos ? JSON.stringify(data.photos) : null,
        data.source || 'crawler',
        Date.now()
      );
    } catch (err) {
      // silently handle insert error
    }
  }

  /**
   * Retrieves latest crawled geographical locations & places ordered by recency
   */
  getRecentGeoEntities(limit = 30) {
    try {
      const stmt = this.db.prepare(`
        SELECT name, short_name, type, category, subtitle, flag, lat, lng, zoom, description, capital, population, area, photos_json, source, updated_at
        FROM geo_entities
        ORDER BY updated_at DESC
        LIMIT ?
      `);
      const rows = stmt.all(limit) || [];
      return rows.map(r => {
        let photos = [];
        try {
          if (r.photos_json) photos = JSON.parse(r.photos_json);
        } catch { }
        return {
          name: r.name,
          shortName: r.short_name || r.name,
          type: r.type,
          category: r.category,
          subtitle: r.subtitle,
          flag: r.flag || '📍',
          lat: r.lat,
          lng: r.lng,
          zoom: r.zoom || 10,
          description: r.description,
          capital: r.capital,
          population: r.population,
          area: r.area,
          photo: photos.length > 0 ? photos[0] : null,
          photos,
          source: r.source,
          updatedAt: r.updated_at
        };
      });
    } catch {
      return [];
    }
  }

  getGeoCount() {
    try {
      const row = this.db.prepare('SELECT COUNT(*) as count FROM geo_entities').get();
      return row ? row.count : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Retrieves latest crawled images ordered by recency
   */
  getRecentImages(limit = 30) {
    try {
      const stmt = this.db.prepare(`
        SELECT id, image_url, page_url, domain, alt_text, title, context_text, is_logo, width, height, created_at
        FROM images
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `);
      const rows = stmt.all(limit) || [];
      return rows.map(r => ({
        id: r.id,
        url: r.image_url,
        pageUrl: r.page_url,
        domain: r.domain,
        title: r.title || r.alt_text || 'Indexed Visual Media',
        altText: r.alt_text || r.title,
        contextText: r.context_text,
        isLogo: r.is_logo,
        width: r.width || 1200,
        height: r.height || 800,
        createdAt: r.created_at
      }));
    } catch {
      return [];
    }
  }

  getImageCount() {
    try {
      const row = this.db.prepare('SELECT COUNT(*) as count FROM images').get();
      return row ? row.count : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Retrieves a cached celebrity / artist entity from SQLite, supporting nicknames & aliases
   */
  getCelebrityEntity(keyword) {
    if (!keyword || typeof keyword !== 'string') return null;
    const clean = keyword.trim().toLowerCase();
    if (this._celebEntityCache && this._celebEntityCache.has(clean)) {
      return this._celebEntityCache.get(clean);
    }
    const stripped = clean.replace(/[\.\,\-\_\'\"]/g, '').replace(/\s+/g, ' ').trim();

    try {
      // 1. Direct match on keyword, name, or stage name
      let stmt = this.stmtGetCelebDirect || this.db.prepare(`
        SELECT * FROM celebrity_entities 
        WHERE keyword_key = ? OR LOWER(name) = ? OR LOWER(stage_name) = ?
        LIMIT 1
      `);
      let row = stmt.get(clean, clean, clean);

      // 2. Alias / Nickname table lookup (exact & stripped punctuation)
      if (!row) {
        const aliasStmt = this.stmtGetCelebAlias || this.db.prepare(`
          SELECT entity_key FROM celebrity_aliases WHERE alias_key = ? OR alias_key = ? LIMIT 1
        `);
        const aliasRow = aliasStmt.get(clean, stripped);
        if (aliasRow && aliasRow.entity_key) {
          const keyStmt = this.stmtGetCelebByKey || this.db.prepare('SELECT * FROM celebrity_entities WHERE keyword_key = ? LIMIT 1');
          row = keyStmt.get(aliasRow.entity_key);
        }
      }

      // 3. Fast exact alias match (Strictly no full-table scans!)
      // celebrity_aliases table already indexes all aliases and nicknames

      if (!row) {
        if (this._celebEntityCache && this._celebEntityCache.size < 2000) {
          this._celebEntityCache.set(clean, null);
        }
        return null;
      }

      let attributes = [];
      try {
        if (row.attributes_json) attributes = JSON.parse(row.attributes_json);
      } catch { }

      let aliasList = [];
      try {
        if (row.aliases) {
          aliasList = JSON.parse(row.aliases);
        }
      } catch {
        if (row.aliases && typeof row.aliases === 'string') {
          aliasList = row.aliases.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      const aliasDisplay = aliasList.length > 0 ? aliasList.join(', ') : null;

      const card = {
        type: 'celebrity_card',
        title: row.name,
        stageName: row.stage_name || row.name,
        subtitle: row.subtitle || row.profession || 'Tokoh Terkenal',
        profession: row.profession || 'Tokoh Publik',
        photo: row.photo_url || null,
        description: row.biography || '',
        aliases: aliasList,
        aliasDisplay,
        verified: true,
        attributes: attributes.length > 0 ? attributes : [
          aliasDisplay ? { label: 'Julukan / Alias', value: aliasDisplay } : null,
          row.born_info ? { label: 'Lahir', value: row.born_info } : null,
          row.nationality ? { label: 'Kebangsaan', value: row.nationality } : null,
          row.profession ? { label: 'Profesi', value: row.profession } : null,
          row.famous_works ? { label: 'Karya Terkenal', value: row.famous_works } : null,
          row.awards ? { label: 'Penghargaan', value: row.awards } : null,
          row.spouse ? { label: 'Pasangan', value: row.spouse } : null,
          row.active_years ? { label: 'Tahun Aktif', value: row.active_years } : null
        ].filter(Boolean),
        sourceUrl: row.source_url || null,
        source: row.source || 'wikipedia'
      };

      if (this._celebEntityCache && this._celebEntityCache.size < 2000) {
        this._celebEntityCache.set(clean, card);
      }
      return card;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves latest crawled public figures and celebrities ordered by recency
   */
  getRecentCelebrities(limit = 30) {
    try {
      const stmt = this.db.prepare(`
        SELECT name, stage_name, profession, subtitle, photo_url, born_info, aliases, source_url, source, updated_at
        FROM celebrity_entities
        ORDER BY updated_at DESC
        LIMIT ?
      `);
      const rows = stmt.all(limit) || [];
      return rows.map(r => {
        let parsedAliases = [];
        try {
          if (r.aliases) parsedAliases = JSON.parse(r.aliases);
        } catch {
          if (r.aliases) parsedAliases = r.aliases.split(',').map(s => s.trim()).filter(Boolean);
        }
        return {
          name: r.name,
          stageName: r.stage_name || r.name,
          profession: r.profession || r.subtitle || 'Figur Publik',
          subtitle: r.subtitle,
          photo: r.photo_url || null,
          bornInfo: r.born_info,
          aliases: parsedAliases,
          aliasDisplay: parsedAliases.length > 0 ? parsedAliases.join(', ') : null,
          sourceUrl: r.source_url,
          source: r.source,
          updatedAt: r.updated_at
        };
      });
    } catch {
      return [];
    }
  }

  getCelebrityCount() {
    try {
      const row = this.db.prepare('SELECT COUNT(*) as count FROM celebrity_entities').get();
      return row ? row.count : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Persists a discovered or crawled celebrity/artist entity + nicknames into SQLite
   */
  saveCelebrityEntity(data) {
    try {
      const clean = (data.keyword_key || data.name || '').trim().toLowerCase();
      if (!clean || !data.name) return;
      if (this._celebEntityCache) {
        this._celebEntityCache.delete(clean);
      }

      const aliasesArr = Array.isArray(data.aliases) ? data.aliases : (data.alias ? [data.alias] : []);
      const aliasesJson = aliasesArr.length > 0 ? JSON.stringify(aliasesArr) : null;

      const stmt = this.db.prepare(`
        INSERT INTO celebrity_entities (
          keyword_key, name, stage_name, profession, subtitle, photo_url,
          biography, born_info, nationality, famous_works, awards, spouse,
          active_years, attributes_json, aliases, source_url, source, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(keyword_key) DO UPDATE SET
          name = excluded.name,
          stage_name = excluded.stage_name,
          profession = excluded.profession,
          subtitle = excluded.subtitle,
          photo_url = excluded.photo_url,
          biography = excluded.biography,
          born_info = excluded.born_info,
          nationality = excluded.nationality,
          famous_works = excluded.famous_works,
          awards = excluded.awards,
          spouse = excluded.spouse,
          active_years = excluded.active_years,
          attributes_json = excluded.attributes_json,
          aliases = excluded.aliases,
          source_url = excluded.source_url,
          source = excluded.source,
          updated_at = excluded.updated_at
      `);

      stmt.run(
        clean,
        data.name,
        data.stageName || data.name,
        data.profession || null,
        data.subtitle || null,
        data.photo || data.photo_url || null,
        data.description || data.biography || null,
        data.bornInfo || data.born_info || null,
        data.nationality || null,
        data.famousWorks || data.famous_works || null,
        data.awards || null,
        data.spouse || null,
        data.activeYears || data.active_years || null,
        data.attributes ? JSON.stringify(data.attributes) : null,
        aliasesJson,
        data.sourceUrl || data.source_url || null,
        data.source || 'wikipedia',
        Date.now()
      );

      // Index each alias / julukan into celebrity_aliases table (clean + stripped)
      if (aliasesArr.length > 0) {
        const aliasInsert = this.db.prepare(`
          INSERT OR REPLACE INTO celebrity_aliases (alias_key, entity_key, display_alias)
          VALUES (?, ?, ?)
        `);
        for (const alias of aliasesArr) {
          const cleanAlias = (alias || '').trim().toLowerCase();
          const strippedAlias = cleanAlias.replace(/[\.\,\-\_\'\"]/g, '').replace(/\s+/g, ' ').trim();
          if (cleanAlias && cleanAlias !== clean) {
            aliasInsert.run(cleanAlias, clean, alias.trim());
          }
          if (strippedAlias && strippedAlias !== cleanAlias && strippedAlias !== clean) {
            aliasInsert.run(strippedAlias, clean, alias.trim());
          }
        }
      }
    } catch (err) {
      // silently handle error
    }
  }

  saveRealMarketChart(assetKey, period, points, changePct, minP, maxP, currentP) {
    if (!assetKey || !period || !points) return false;
    try {
      const stmt = this.db.prepare(`
        INSERT INTO real_market_charts (asset_key, period, points_json, change_pct, min_price, max_price, current_price, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(asset_key, period) DO UPDATE SET
          points_json = excluded.points_json,
          change_pct = excluded.change_pct,
          min_price = excluded.min_price,
          max_price = excluded.max_price,
          current_price = excluded.current_price,
          updated_at = excluded.updated_at
      `);
      stmt.run(
        assetKey.toUpperCase(),
        period.toUpperCase(),
        JSON.stringify(points),
        changePct || 0,
        minP || 0,
        maxP || 0,
        currentP || 0,
        Date.now()
      );
      return true;
    } catch {
      return false;
    }
  }

  getRealMarketChart(assetKey, period) {
    if (!assetKey || !period) return null;
    try {
      const row = this.db.prepare(`SELECT * FROM real_market_charts WHERE asset_key = ? AND period = ? LIMIT 1`)
        .get(assetKey.toUpperCase(), period.toUpperCase());
      if (!row) return null;
      return {
        points: JSON.parse(row.points_json || '[]'),
        changePct: row.change_pct,
        minPrice: row.min_price,
        maxPrice: row.max_price,
        currentPrice: row.current_price,
        updatedAt: row.updated_at
      };
    } catch {
      return null;
    }
  }

  // ==========================================
  // 🔑 DEVELOPER & AI AGENT API KEY METHODS
  // ==========================================

  createApiKey(name = 'Developer Key') {
    const rawKey = `dn_live_${randomBytes(16).toString('hex')}`;
    const cleanName = (name || 'Developer Key').trim().slice(0, 60);
    const now = Date.now();
    try {
      this.db.prepare(`
        INSERT INTO api_keys (api_key, name, rate_limit_per_min, requests_count, is_active, created_at)
        VALUES (?, ?, 120, 0, 1, ?)
      `).run(rawKey, cleanName, now);

      return {
        success: true,
        apiKey: rawKey,
        name: cleanName,
        rateLimitPerMin: 120,
        createdAt: now
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, reason: 'API key is missing or invalid format' };
    }
    const cleanKey = apiKey.trim();
    try {
      const row = this.db.prepare(`
        SELECT id, api_key, name, rate_limit_per_min, requests_count, is_active, created_at
        FROM api_keys
        WHERE api_key = ?
        LIMIT 1
      `).get(cleanKey);

      if (!row) {
        return { valid: false, reason: 'API key not found' };
      }
      if (!row.is_active) {
        return { valid: false, reason: 'API key is deactivated' };
      }

      // Update usage count asynchronously
      try {
        this.db.prepare(`
          UPDATE api_keys
          SET requests_count = requests_count + 1, last_used_at = ?
          WHERE id = ?
        `).run(Date.now(), row.id);
      } catch {}

      return {
        valid: true,
        keyInfo: {
          id: row.id,
          name: row.name,
          apiKey: row.api_key,
          rateLimitPerMin: row.rate_limit_per_min,
          requestsCount: row.requests_count + 1
        }
      };
    } catch (e) {
      return { valid: false, reason: e.message };
    }
  }

  listApiKeys(limit = 20) {
    try {
      return this.db.prepare(`
        SELECT id, api_key, name, rate_limit_per_min, requests_count, is_active, created_at, last_used_at
        FROM api_keys
        ORDER BY created_at DESC
        LIMIT ?
      `).all(limit);
    } catch {
      return [];
    }
  }

  revokeApiKey(idOrKey) {
    try {
      this.db.prepare(`UPDATE api_keys SET is_active = 0 WHERE id = ? OR api_key = ?`).run(idOrKey, idOrKey);
      return true;
    } catch {
      return false;
    }
  }
}


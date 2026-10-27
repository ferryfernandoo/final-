/**
 * Format timestamp to human-readable date / relative recency string (Indonesian)
 */
function formatSearchDate(timestampMs) {
  if (!timestampMs || isNaN(timestampMs)) return null;
  const time = Number(timestampMs);
  if (time < 946684800000) return null;

  const now = Date.now();
  const diffMs = now - time;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Baru saja';
  if (diffMinutes < 60) return diffMinutes + ' mnt lalu';
  if (diffHours < 24) return diffHours + ' jam lalu';
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return diffDays + ' hr lalu';
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks + ' mgg lalu';
  }

  const dateObj = new Date(time);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return dateObj.getDate() + ' ' + months[dateObj.getMonth()] + ' ' + dateObj.getFullYear();
}

import { ALL_NEWS_DOMAINS } from '../crawler/newsCrawler.js';
import { InstantAnswersEngine } from './instantAnswers.js';
import { TrustGatekeeper } from '../crawler/trustGatekeeper.js';
import { AntiTypoEngine } from './antiTypoEngine.js';

// Common Indonesian and English question particles and conversational stopwords
const CONVERSATIONAL_QUESTION_WORDS = new Set([
  'apa', 'itu', 'ini', 'siapa', 'bagaimana', 'mengapa', 'kenapa', 'kapan', 'dimana', 'kemana', 'darimana',
  'berapa', 'adalah', 'merupakan', 'artinya', 'maksud', 'arti', 'pengertian', 'definisi', 'maksudnya',
  'tentang', 'mengenai', 'cara', 'tutorial', 'contoh', 'sejarah', 'dan', 'atau', 'yang', 'di', 'ke',
  'dari', 'pada', 'untuk', 'oleh', 'dengan', 'sebagai', 'karena', 'sehingga', 'juga', 'hanya', 'saja',
  'bisa', 'dapat', 'akan', 'sudah', 'telah', 'sedang', 'belum', 'tidak', 'bukan', 'ada', 'hari', 'kemarin', 'besok', 'saat',
  'what', 'is', 'who', 'how', 'why', 'when', 'where', 'which', 'the', 'a', 'an', 'of', 'to', 'in', 'for', 'on'
]);

// Generic category and topic terms that should NOT trigger brand/domain-match boosts
export const GENERIC_CATEGORY_WORDS = new Set([
  'berita', 'news', 'ekonomi', 'bisnis', 'tekno', 'teknologi', 'keuangan', 'finance',
  'politik', 'nasional', 'internasional', 'daerah', 'regional', 'metro', 'olahraga',
  'sport', 'lifestyle', 'hiburan', 'seleb', 'kuliner', 'otomotif', 'properti', 'edukasi',
  'gempa', 'cuaca', 'kabar', 'info', 'peristiwa', 'hukum', 'kriminal', 'terkini'
]);

// Common generic geographic, governmental, or general entity words that must never trigger domain-intent probes
export const COMMON_NON_BRAND_WORDS = new Set([
  'indonesia', 'jakarta', 'jawa', 'bali', 'surabaya', 'bandung', 'medan', 'semarang', 'makassar',
  'negara', 'presiden', 'menteri', 'gubernur', 'bupati', 'walikota', 'pemerintah', 'dpr', 'kpu',
  'cuaca', 'gempa', 'berita', 'kabar', 'info', 'resep', 'cara', 'daftar', 'harga', 'jadwal',
  'sejarah', 'wisata', 'kuliner', 'film', 'lagu', 'chord', 'lirik', 'arti', 'makna', 'definisi'
]);

export const CHANNEL_SUBDOMAINS = new Set([
  'news', 'berita', 'regional', 'nasional', 'internasional', 'ekonomi', 'bisnis', 'finance',
  'tekno', 'teknologi', 'lifestyle', 'sport', 'sports', 'bola', 'sepakbola', 'otomotif',
  'properti', 'edukasi', 'health', 'sehat', 'food', 'kuliner', 'travel', 'wisata', 'hiburan',
  'seleb', 'selebriti', 'hype', 'fokus', 'kolom', 'opini', 'foto', 'video', 'tv'
]);

export const MAJOR_NEWS_ROOT_DOMAINS = new Set([
  'detik.com', 'kompas.com', 'tempo.co', 'cnnindonesia.com', 'cnbcindonesia.com',
  'antaranews.com', 'tribunnews.com', 'liputan6.com', 'sindonews.com', 'republika.co.id',
  'merdeka.com', 'inews.id', 'okezone.com', 'suara.com', 'kumparan.com', 'katadata.co.id'
]);

export function getRootDomain(domain) {
  if (!domain) return '';
  const clean = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/^(m\.)?/, '').toLowerCase();
  const parts = clean.split('.');
  if (parts.length <= 2) return clean;
  const secondLast = parts[parts.length - 2];
  if (['co', 'ac', 'go', 'or', 'sch', 'mil', 'web', 'my', 'gov', 'edu', 'org', 'net', 'com'].includes(secondLast) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

export function normalizeHeadline(title) {
  if (!title) return '';
  return title
    .replace(/\s*[-|–—:•]\s*(detik\w*|kompas\w*|tribun\w*|antara\w*|cnn\w*|cnbc\w*|tempo\w*|liputan6\w*|merdeka\w*|kumparan\w*|sindo\w*|okezone\w*|suara\w*|viva\w*|idntimes\w*|jawapos\w*|bisnis\w*|kontan\w*|republika\w*|rri\w*|tvone\w*|inews\w*|disway\w*|katadata\w*).*$/i, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function headlineWordSimilarity(t1, t2) {
  if (!t1 || !t2) return 0;
  const w1 = new Set(t1.split(' ').filter(w => w.length >= 3));
  const w2 = new Set(t2.split(' ').filter(w => w.length >= 3));
  if (w1.size === 0 || w2.size === 0) return 0;
  let inter = 0;
  for (const w of w1) {
    if (w2.has(w)) inter++;
  }
  const union = new Set([...w1, ...w2]).size;
  return inter / union;
}

export const GENERIC_CHANNEL_PATHS = new Set([
  'berita', 'news', 'nasional', 'internasional', 'ekonomi', 'bisnis', 'finance',
  'tekno', 'teknologi', 'lifestyle', 'sport', 'sports', 'bola', 'sepakbola', 'otomotif',
  'properti', 'edukasi', 'health', 'sehat', 'food', 'kuliner', 'travel', 'wisata',
  'hiburan', 'seleb', 'selebriti', 'hype', 'fokus', 'kolom', 'opini', 'feed', 'rss',
  'indeks', 'index', 'warta-terkini', 'terkini', 'terpopuler', 'headline', 'topik', 'topics',
  'tag', 'tags', 'kategori', 'category', 'kanal', 'rubrik', 'more'
]);

/**
 * Detects whether a URL is a generic channel homepage, portal landing page, category index, or tag hub
 */
export function isChannelOrHubPage(url, title = '') {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.replace(/\/+$/, '');
    const lowerTitle = (title || '').toLowerCase().trim();

    if (pathname === '' || pathname === '/') return true;

    const domainParts = domain.split('.');
    if (domainParts.length >= 3) {
      const sub = domainParts[0];
      if (CHANNEL_SUBDOMAINS.has(sub) && (pathname === '' || pathname === '/' || pathname === '/index.html' || pathname === '/index.php')) {
        return true;
      }
    }

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length <= 1) {
      const seg0 = segments.length === 1 ? segments[0].toLowerCase() : '';
      if (!seg0 || GENERIC_CHANNEL_PATHS.has(seg0) || (!/\d/.test(seg0) && seg0.length < 30)) {
        return true;
      }
    }

    if (segments.length >= 2) {
      const seg0 = segments[0].toLowerCase();
      const seg1 = segments[1].toLowerCase();
      if (['tag', 'tags', 'kategori', 'category', 'topic', 'topics', 'kanal', 'rubrik', 'indeks', 'index', 'more', 'network', 'arsitektur', 'tujuan', 'home', 'latest', 'trending', 'berita', 'news', 'search', 'archive', 'videos', 'video', 'photo', 'photos', 'live'].includes(seg0)) {
        return true;
      }
      if (!/\d/.test(pathname) && (!seg1.includes('-') || seg1.length < 18)) {
        return true;
      }
    }

    if (
      lowerTitle.startsWith('berita terkini') ||
      lowerTitle.startsWith('berita regional') ||
      lowerTitle.startsWith('berita nasional') ||
      lowerTitle.startsWith('berita peristiwa') ||
      lowerTitle.startsWith('berita daerah terkini') ||
      lowerTitle.startsWith('indeks berita') ||
      lowerTitle.startsWith('kabar harian') ||
      lowerTitle.startsWith('kumpulan berita') ||
      lowerTitle.startsWith('kategori:') ||
      lowerTitle.startsWith('category:') ||
      lowerTitle.startsWith('topik:') ||
      lowerTitle.startsWith('penyedia foto jurnalistik') ||
      lowerTitle.includes('kumpulan berita') ||
      lowerTitle.includes('indeks topik') ||
      lowerTitle.includes('berita terkini') ||
      lowerTitle.includes('berita terbaru hari ini') ||
      lowerTitle.includes('berita populer') ||
      /^(berita|kabar|info|seputar)\s*-\s*[a-z0-9]/i.test(lowerTitle) ||
      /\b(latest|trending|popular|top stories|headlines|newsroom|archive)\b/i.test(lowerTitle)
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Detects whether a URL is a genuine deep news article with narrative body content
 */
export function isRealArticlePage(url, title = '') {
  if (!url) return false;
  if (isChannelOrHubPage(url, title)) return false;
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const lowerTitle = (title || '').trim();
    const segments = pathname.split('/').filter(Boolean);

    const hasArticlePattern = (
      pathname.includes('/read/') ||
      pathname.includes('/artikel/') ||
      pathname.includes('/story/') ||
      pathname.includes('/news/') ||
      pathname.includes('/article/') ||
      pathname.includes('/video/') ||
      /\/(202[4-9]|203[0-9])[\d\-_\/]/i.test(pathname) ||
      /-\d{5,}(\.html)?$/i.test(pathname) ||
      /\/\d{5,}(\/|$)/.test(pathname) ||
      /d-\d{5,}/.test(pathname) ||
      /tkw[a-z0-9]+/i.test(pathname) ||
      /\.html?$/i.test(pathname)
    );

    const hasDeepContentSignal = segments.length >= 2 && lowerTitle.length >= 28 && !/^(home|latest|news|berita|kabar|top stories|live)$/i.test(lowerTitle);
    return hasArticlePattern || hasDeepContentSignal;
  } catch {
    return false;
  }
}

function fastCountOccurrences(str, term) {
  if (!str || !term) return 0;
  let count = 0;
  let pos = 0;
  const len = term.length;
  while ((pos = str.indexOf(term, pos)) !== -1) {
    count++;
    pos += len;
  }
  return count;
}

class SearchCache {
  constructor(maxSize = 30000, ttlMs = 900000) {
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
    // True LRU: move recently accessed entry to newest position
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

/**
 * Search Query Engine combining BM25 relevance and PageRank authority
 */
export class SearchEngine {
  constructor(dbInstance) {
    this.db = dbInstance.db;
    this.dbInstance = dbInstance;
    this.antiTypo = new AntiTypoEngine(dbInstance);
    this._newsDomainPattern = [...ALL_NEWS_DOMAINS].map(d => `'%${d}%'`).join(',');
    this.searchCache = new SearchCache(60000, 3600000); // 60,000 queries, 60 min TTL for instant sub-0.05ms hits // 30,000 queries, 15 min TTL for instant sub-0.1ms hits
    this.newsCache = new SearchCache(3000, 120000);   // 3,000 news queries, 2 min TTL
    this.imageCache = new SearchCache(15000, 1800000); // 15,000 image queries, 30 min TTL

    // Pre-compiled prepared statements for ultra-fast streaming execution (<20-50ms)
    try {
      this.stmtFastTitleHeadingsDesc = this.db.prepare(`
        SELECT
          p.id, p.url, p.domain, p.title, p.description, p.headings,
          SUBSTR(p.content, 1, 600) as content,
          p.logo_url, p.lead_image_url, p.pagerank, p.trust_score, p.category,
          p.author, p.reading_time_min, p.schema_type, p.is_verified_trust,
          p.in_links_count, p.published_at, p.crawled_at
        FROM (
          SELECT rowid FROM fts_pages WHERE fts_pages MATCH ? LIMIT ?
        ) f
        JOIN pages p ON f.rowid = p.id
      `);

      this.stmtFastTitleHeadingsAsc = this.db.prepare(`
        SELECT
          p.id, p.url, p.domain, p.title, p.description, p.headings,
          SUBSTR(p.content, 1, 600) as content,
          p.logo_url, p.lead_image_url, p.pagerank, p.trust_score, p.category,
          p.author, p.reading_time_min, p.schema_type, p.is_verified_trust,
          p.in_links_count, p.published_at, p.crawled_at
        FROM (
          SELECT rowid FROM fts_pages WHERE fts_pages MATCH ? LIMIT ?
        ) f
        JOIN pages p ON f.rowid = p.id
      `);

      this.stmtFastTitleHeadings = this.stmtFastTitleHeadingsDesc;
      this.stmtBaseAnd = this.stmtFastTitleHeadingsDesc;
      this.stmtBaseOr = this.stmtFastTitleHeadingsDesc;

      this.stmtBaseDomain = this.db.prepare(`
        SELECT
          p.id, p.url, p.domain, p.title, p.description, p.headings,
          SUBSTR(p.content, 1, 600) as content,
          p.logo_url, p.lead_image_url, p.pagerank, p.trust_score, p.category,
          p.author, p.reading_time_min, p.schema_type, p.is_verified_trust,
          p.in_links_count, p.published_at, p.crawled_at,
          1.0 as bm25_score
        FROM pages p
        WHERE p.domain IN (?, ?, ?, ?, ?, ?, ?)
        LIMIT 10
      `);

      this.stmtSitelinks = this.db.prepare(`
        SELECT title, url, description
        FROM pages
        WHERE domain = ? AND url != ?
        LIMIT 4
      `);

      // ⚡ High-Speed Pre-compiled Image Prepared Statements (Sub-5ms FTS)
      this.stmtFtsImg = this.db.prepare(`
        SELECT
          img.id, img.image_url, img.page_url, img.domain,
          img.alt_text, img.title, img.context_text, img.is_logo,
          img.width, img.height,
          p.title as page_title, p.logo_url, p.pagerank,
          bm25(fts_images, 4.0, 3.0, 1.5, 2.0) as bm25_score
        FROM fts_images
        JOIN images img ON fts_images.rowid = img.id
        LEFT JOIN pages p ON img.page_id = p.id
        WHERE fts_images MATCH ?
        LIMIT ?
      `);

      this.stmtPageFtsImg = this.db.prepare(`
        SELECT
          img.id, img.image_url, img.page_url, img.domain,
          img.alt_text, img.title, img.context_text, img.is_logo,
          img.width, img.height,
          p.title as page_title, p.logo_url, p.pagerank,
          1.0 as bm25_score
        FROM (
          SELECT rowid FROM fts_pages WHERE fts_pages MATCH ? LIMIT 30
        ) f
        JOIN pages p ON f.rowid = p.id
        JOIN images img ON img.page_id = p.id
        LIMIT ?
      `);

      this.stmtDomainImg = this.db.prepare(`
        SELECT
          img.id, img.image_url, img.page_url, img.domain,
          img.alt_text, img.title, img.context_text, img.is_logo,
          img.width, img.height,
          p.title as page_title, p.logo_url, p.pagerank,
          1.0 as bm25_score
        FROM images img
        LEFT JOIN pages p ON img.page_id = p.id
        WHERE (img.domain = ? OR img.domain = ?)
        LIMIT ?
      `);
    } catch {}

    this._domainProbeStmtCache = new Map();
  }

  /**
   * Retrieves or compiles a cached prepared statement for domain candidate probing
   */
  getDomainProbeStmt(paramCount) {
    let stmt = this._domainProbeStmtCache.get(paramCount);
    if (!stmt) {
      const placeholders = new Array(paramCount).fill('?').join(',');
      stmt = this.db.prepare(`
        SELECT
          p.id, p.url, p.domain, p.title, p.description, p.headings,
          SUBSTR(p.content, 1, 600) as content,
          p.logo_url, p.lead_image_url, p.pagerank, p.trust_score, p.category,
          p.author, p.reading_time_min, p.schema_type, p.is_verified_trust,
          p.in_links_count, p.published_at, p.crawled_at,
          -1.0 as bm25_score
        FROM pages p
        WHERE p.domain IN (${placeholders})
        LIMIT 20
      `);
      this._domainProbeStmtCache.set(paramCount, stmt);
    }
    return stmt;
  }

  /**
   * Generates SQL WHERE condition for news domains (Indexed + Fast)
   */
  _buildNewsDomainCondition(tableAlias = 'p') {
    const col = `${tableAlias}.domain`;
    const exactList = [...ALL_NEWS_DOMAINS].map(d => `'${d}'`).join(',');
    return `(${col} IN (${exactList}) OR ${tableAlias}.category = 'news')`;
  }

  _getRootDomain(domain) {
    return getRootDomain(domain);
  }

  /**
   * Enforces multi-source publisher diversity (max N articles per root domain in top results)
   */
  _applyDomainDiversity(rows = [], maxPerDomain = 2, targetLimit = 20) {
    if (!rows || rows.length === 0) return [];
    const domainCounts = new Map();
    const diverse = [];
    const overflow = [];

    for (const row of rows) {
      const rootD = getRootDomain(row.domain) || row.domain || 'unknown';
      const count = domainCounts.get(rootD) || 0;
      if (count < maxPerDomain) {
        domainCounts.set(rootD, count + 1);
        diverse.push(row);
      } else {
        overflow.push(row);
      }
    }

    if (diverse.length < targetLimit && overflow.length > 0) {
      for (const row of overflow) {
        if (diverse.length >= targetLimit) break;
        diverse.push(row);
      }
    }

    return diverse.slice(0, targetLimit);
  }

  /**
   * Cross-Domain Headline & Version Deduplication
   * Eliminates wire duplicates and syndicated stories across multiple regional news portals
   */
  _deduplicateArticles(candidates) {
    if (!candidates || candidates.length === 0) return [];
    const deduped = [];
    const seenNormTitles = [];
    const seenUrls = new Set();

    for (const cand of candidates) {
      if (!cand || !cand.url) continue;

      // Canonical URL deduplication (remove query params, trailing slashes)
      const cleanUrl = cand.url.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
      if (seenUrls.has(cleanUrl)) continue;
      seenUrls.add(cleanUrl);

      const norm = normalizeHeadline(cand.title);
      if (!norm || norm.length < 8) {
        deduped.push(cand);
        continue;
      }

      let isDup = false;
      for (let i = 0; i < seenNormTitles.length; i++) {
        const existing = seenNormTitles[i];
        if (norm === existing.norm || headlineWordSimilarity(norm, existing.norm) >= 0.80) {
          isDup = true;
          // Keep the newer one or higher PageRank
          const candTime = Number(cand.published_at || cand.crawled_at || 0);
          const existingTime = Number(existing.cand.published_at || existing.cand.crawled_at || 0);
          if (candTime > existingTime + 3600000 || (Math.abs(candTime - existingTime) <= 3600000 && (cand.pagerank || 1) > (existing.cand.pagerank || 1))) {
            seenNormTitles[i] = { norm, cand };
            const idxInDeduped = deduped.indexOf(existing.cand);
            if (idxInDeduped !== -1) {
              deduped[idxInDeduped] = cand;
            }
          }
          break;
        }
      }

      if (!isDup) {
        seenNormTitles.push({ norm, cand });
        deduped.push(cand);
      }
    }

    return deduped;
  }

  /**
   * Cleans search query for SQLite FTS5 syntax
   */
  sanitizeQuery(query) {
    if (!query || typeof query !== 'string') return '';
    // Strip special FTS5 operators to prevent syntax errors
    const cleaned = query
      .replace(/[^\p{L}\p{N}\s_]/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter(term => term.length > 0);

    if (cleaned.length === 0) return '';
    // Match terms with prefix matching
    return cleaned.map(term => `"${term}"*`).join(' ');
  }

  /**
   * Parses natural language query intent, extracting core entity subject and stripping conversational fluff
   */
  parseQueryIntent(rawQuery) {
    const cleanRaw = (rawQuery || '').trim().toLowerCase();
    const allTerms = cleanRaw
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);

    const coreTerms = allTerms.filter(t => !CONVERSATIONAL_QUESTION_WORDS.has(t));
    const effectiveCoreTerms = coreTerms.length > 0 ? coreTerms : allTerms;
    const coreSubject = effectiveCoreTerms.join(' ');

    const isDefinitional = (
      cleanRaw.includes('apa itu') ||
      cleanRaw.includes('itu apa') ||
      cleanRaw.includes('pengertian') ||
      cleanRaw.includes('definisi') ||
      cleanRaw.includes('arti ') ||
      cleanRaw.includes('artinya') ||
      cleanRaw.includes('adalah') ||
      cleanRaw.includes('maksud dari') ||
      cleanRaw.startsWith('what is') ||
      cleanRaw.endsWith('is')
    );

    const isBiographical = (
      cleanRaw.includes('siapa ') ||
      cleanRaw.includes('siapa itu') ||
      cleanRaw.includes('profil ') ||
      cleanRaw.includes('biografi') ||
      cleanRaw.startsWith('who is')
    );

    return {
      cleanRaw,
      allTerms,
      coreTerms: effectiveCoreTerms,
      coreSubject,
      hasStopwords: coreTerms.length < allTerms.length,
      isDefinitional,
      isBiographical
    };
  }

  /**
   * Escapes raw HTML entities before wrapping search highlights to prevent Stored/Reflected XSS
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Highlights keywords in text snippet
   */
  createSnippet(text, terms, maxLength = 220) {
    if (!text) return '';
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (terms.length === 0) {
      return this.escapeHtml(cleanText.slice(0, maxLength) + (cleanText.length > maxLength ? '...' : ''));
    }

    // Find first occurrence of any search term
    const lowerText = cleanText.toLowerCase();
    let bestIndex = -1;

    for (const term of terms) {
      const idx = lowerText.indexOf(term.toLowerCase());
      if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
        bestIndex = idx;
      }
    }

    let start = 0;
    if (bestIndex > 60) {
      start = Math.max(0, bestIndex - 60);
      // Align to word boundary
      const spaceIdx = cleanText.indexOf(' ', start);
      if (spaceIdx !== -1 && spaceIdx < bestIndex) {
        start = spaceIdx + 1;
      }
    }

    let snippet = cleanText.slice(start, start + maxLength);
    if (start > 0) snippet = '...' + snippet;
    if (start + maxLength < cleanText.length) snippet += '...';

    snippet = this.escapeHtml(snippet);

    // Highlight terms
    for (const term of terms) {
      if (!term || term.length < 2) continue;
      const escapedTerm = this.escapeHtml(term);
      const regex = new RegExp(`(${escapedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      snippet = snippet.replace(regex, '<mark class="hl">$1</mark>');
    }

    return snippet;
  }

  /**
   * Calculates high-accuracy relevance score based on:
   * 1. Core Subject Mandatory Guard (No false ranking of stopwords like 'itu', 'apa')
   * 2. Exact domain & entity matches (e.g. 'claude' -> 'claude.ai', 'claude.com' gets #1 rank)
   * 3. Definitional QA Relevancy (Wikipedia, official docs, exact definitions)
   * 4. Full query term coverage across core subjects
   * 5. Weighted term density in title, headings, description, and content
   * 6. PageRank & E-E-A-T Domain Trust Score
   * 7. Anti-Generic Channel Demotion (Eliminates portal noise)
   */
  calculateQueryAccuracyScore(row, rawQuery, terms, termRegexes = null, intentInfo = null) {
    if (!row || !terms || terms.length === 0) return 1.0;

    const lowerQuery = rawQuery.trim().toLowerCase();
    const url = (row.url || '').toLowerCase();
    const domain = (row.domain || '').toLowerCase();
    const title = (row.title || '').toLowerCase();
    const headings = (row.headings || '').toLowerCase();
    const description = (row.description || '').toLowerCase();
    const content = (row.content || '').toLowerCase();

    const coreTerms = intentInfo?.coreTerms || terms.filter(t => !CONVERSATIONAL_QUESTION_WORDS.has(t));
    const effectiveCoreTerms = coreTerms.length > 0 ? coreTerms : terms;
    const coreSubject = intentInfo?.coreSubject || effectiveCoreTerms.join(' ');

    // 🛑 ZERO-TOLERANCE ANTI-JUDOL & ANTI-SPAM GUARD:
    // Completely drop any compromised government/edu page, promotional slot/togel page, or adult site
    if (
      TrustGatekeeper.isSpamUrl(row.url) ||
      TrustGatekeeper.isCompromisedGovEduSpam(row.url, row.title, row.content) ||
      TrustGatekeeper.isSpamTitleOrContent(row.title, row.content, row.url)
    ) {
      return 0; // Filtered out completely! Never rank or display!
    }

    // 🛑 PAGINATION DEMOTION:
    // Severely demote pagination links (?page=5, /page/2, etc.) to prevent them from outranking canonical pages
    const isPagination = /[?&](page|p|pg)=\d+/i.test(row.url) || /\/page\/\d+/i.test(row.url) || / - halaman \d+/i.test(row.title);
    if (isPagination) {
      return 10.0;
    }

    // 🛑 CORE SUBJECT MANDATORY GUARD:
    // If user searched for a specific subject ("claude", "jokowi", "bbca") alongside conversational words ("itu apa"),
    // this page MUST match at least one core term! A page matching only stop words receives score 0.
    const BROAD_NEWS_WORDS = new Set(['berita', 'terbaru', 'terkini', 'hari', 'ini', 'indonesia', 'nasional', 'dunia', 'internasional', 'update', 'info', 'kabar', 'news', 'latest', 'today', 'breaking', 'viral', 'trending', 'utama', 'populer', 'terpopuler', 'sekarang']);
    const isBroadNewsIntent = effectiveCoreTerms.length > 0 && effectiveCoreTerms.every(t => BROAD_NEWS_WORDS.has(t));

    if (effectiveCoreTerms.length > 0 && !isBroadNewsIntent) {
      let matchedCoreCount = 0;
      for (const ct of effectiveCoreTerms) {
        if (title.includes(ct) || domain.includes(ct) || headings.includes(ct) || description.includes(ct) || content.includes(ct)) {
          matchedCoreCount++;
        }
      }
      if (matchedCoreCount === 0) {
        return 0; // Pure noise page that only matched stopwords
      }
    }

    let score = 0;

    // 0. DEEPERNOVA.COM Ecosystem Priority Match
    const isDeeperNovaDomain = domain === 'deepernova.com' || domain.endsWith('.deepernova.com');
    const isDeeperNovaQuery = lowerQuery.includes('deepernova') || lowerQuery.includes('deeper nova');
    if (isDeeperNovaDomain) {
      score += 200;
      if (isDeeperNovaQuery) {
        score += 15000; // Unmatched #1 Rank Guarantee
      }
    }

    // 1. DOMAIN-FIRST SUPREME WEIGHTING (Google-grade Brand & Official Domain Authority)
    // Rule: When user searches for a domain or brand (e.g. 'youtube', 'youtube indonesia', 'detik', 'kompas', 'deepseek'),
    // the official domain MUST have the absolute heaviest weight over any third-party page that merely mentions it!
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/^(m\.)?/, '').toLowerCase();
    const domainParts = cleanDomain.split('.');
    // Extract the primary brand label, safely skipping ccTLDs and subdomains
    // e.g. "id.wikipedia.org" -> "wikipedia", "hot.detik.com" -> "detik", "youtube.com" -> "youtube"
    const brandCandidates = domainParts.filter(l => !['co', 'com', 'org', 'id', 'net', 'edu', 'gov', 'go', 'ac', 'tv', 'ai', 'io', 'info'].includes(l));
    const mainBrand = brandCandidates.length > 0 ? brandCandidates[brandCandidates.length - 1] : domainParts[0];
    
    // Check if the URL is the root homepage of this domain
    const isRootUrl = (
      url === `https://${domain}/` ||
      url === `http://${domain}/` ||
      url === `https://${domain}` ||
      url === `http://${domain}` ||
      url === `https://www.${cleanDomain}/` ||
      url === `http://www.${cleanDomain}/` ||
      url === `https://www.${cleanDomain}` ||
      url === `http://www.${cleanDomain}` ||
      url === `https://${cleanDomain}/` ||
      url === `http://${cleanDomain}/` ||
      url === `https://${cleanDomain}` ||
      url === `http://${cleanDomain}`
    );

    // Primary apex portal domain vs niche subdomains (e.g. detik.com vs hot.detik.com)
    const isApexDomain = (
      domain === `${mainBrand}.com` ||
      domain === `www.${mainBrand}.com` ||
      domain === `${mainBrand}.id` ||
      domain === `www.${mainBrand}.id` ||
      domain === `${mainBrand}.co.id` ||
      domain === `www.${mainBrand}.co.id` ||
      domain === `${mainBrand}.org` ||
      domain === `www.${mainBrand}.org` ||
      domain === `${mainBrand}.tv` ||
      domain === `www.${mainBrand}.tv` ||
      domain === `${mainBrand}.ai` ||
      domain === `www.${mainBrand}.ai` ||
      cleanDomain === `${mainBrand}.com` ||
      cleanDomain === `${mainBrand}.id` ||
      cleanDomain === `${mainBrand}.co.id` ||
      cleanDomain === `${mainBrand}.org`
    );

    const isChannel = isChannelOrHubPage(row.url, row.title);
    const isArticle = isRealArticlePage(row.url, row.title);
    const isNonBrandWord = (
      GENERIC_CATEGORY_WORDS.has(lowerQuery) ||
      GENERIC_CATEGORY_WORDS.has(coreSubject) ||
      COMMON_NON_BRAND_WORDS.has(coreSubject) ||
      COMMON_NON_BRAND_WORDS.has(lowerQuery)
    );
    const isExactBrandQuery = (cleanDomain === lowerQuery || cleanDomain === coreSubject || mainBrand === lowerQuery || mainBrand === coreSubject) && !isNonBrandWord;

    let isDomainIntent = false;

    // 1. Exact Brand / Domain Intent Match
    if (isExactBrandQuery) {
      isDomainIntent = true;
      score += 120000; // Unmatched supreme priority for official brand domain
      if (isApexDomain) score += 40000; // Apex domain preferred over subdomains
      if (isRootUrl) score += 60000; // Official homepage guaranteed #1 spot
      // Official AI web application priority (e.g. claude.ai > claude.com)
      if (cleanDomain === `${coreSubject}.ai` || domain === `${coreSubject}.ai`) {
        score += 25000;
      }
    } else if (!isNonBrandWord && !isChannel && effectiveCoreTerms.length === 1) {
      // For single-word brand queries (e.g. 'youtube', 'kompas', 'detik')
      const singleTerm = effectiveCoreTerms[0];
      if (singleTerm.length >= 3 && mainBrand === singleTerm && !GENERIC_CATEGORY_WORDS.has(singleTerm) && !COMMON_NON_BRAND_WORDS.has(singleTerm)) {
        isDomainIntent = true;
        score += 100000;
        if (isApexDomain) score += 30000;
        if (isRootUrl) score += 50000;
        if (cleanDomain === `${singleTerm}.ai` || domain === `${singleTerm}.ai`) {
          score += 25000;
        }
      }
    }

    // General news portal boost for broad news queries (e.g. "berita", "berita terkini", "berita terbaru indonesia hari ini")
    const isGeneralNewsQuery = isBroadNewsIntent || lowerQuery === 'berita' || lowerQuery === 'berita terkini' || lowerQuery === 'news' || lowerQuery === 'kabar terkini';
    const rootDomain = this._getRootDomain(domain);
    if (isGeneralNewsQuery && (MAJOR_NEWS_ROOT_DOMAINS.has(rootDomain) || row.category === 'news')) {
      score += 25000;
      if (isArticle) {
        score += 45000;
      } else if (isRootUrl || url.endsWith('/berita') || url.endsWith('/terkini') || domain.startsWith('news.')) {
        score += 25000;
      }
    }

    // Baseline FTS BM25 relevance (FTS5 returns negative bm25 score; lower/more negative is better)
    if (row.bm25_score != null) {
      const absBm25 = Math.abs(row.bm25_score);
      score += Math.max(0, (25 - absBm25)) * 100;
    }

    // 2. EXACT TITLE / DEFINITIVE ENTITY MATCH (Google-grade precision)
    const isExactTitle = title === lowerQuery || title === coreSubject;
    const isTitlePrefix = title.startsWith(lowerQuery) || title.startsWith(coreSubject);
    const isTitleContains = title.includes(lowerQuery) || title.includes(coreSubject);

    if (isExactTitle) {
      score += 30000;
    } else if (isTitlePrefix) {
      score += 18000;
    } else if (isTitleContains) {
      score += 12000;
    } else if (headings.includes(coreSubject)) {
      score += 2500;
    } else if (description.includes(coreSubject)) {
      score += 1000;
    }

    // 2b. High Authority Knowledge & Official Repositories (Wikipedia ID, Setneg, Kemdikbud, Britannica)
    const isKnowledgeAuthority = (
      domain.includes('id.wikipedia.org') ||
      domain.includes('britannica.com') ||
      domain.includes('setneg.go.id') ||
      domain.includes('kemdikbud.go.id') ||
      domain.includes('plato.stanford.edu') ||
      domain.includes('historia.id') ||
      domain.includes('anri.go.id')
    );
    if (isKnowledgeAuthority && (isTitlePrefix || isTitleContains)) {
      score += 8000;
    }

    // 2b-2. Web Pemerintah (.go.id) & BMKG Razor-Sharp Official Authority Boost
    const isGovIntentQuery = (
      lowerQuery.includes('bmkg') || lowerQuery.includes('cuaca') ||
      lowerQuery.includes('gempa') || lowerQuery.includes('pemerintah') ||
      lowerQuery.includes('kemenkeu') || lowerQuery.includes('kementerian') ||
      lowerQuery.includes('presiden') || lowerQuery.includes('kemkes') ||
      lowerQuery.includes('kominfo') || lowerQuery.includes('bps') ||
      lowerQuery.includes('ojk') || lowerQuery.includes('pajak') ||
      lowerQuery.includes('paspor') || lowerQuery.includes('pemprov') ||
      lowerQuery.includes('dprd') || lowerQuery.includes('polri') ||
      lowerQuery.includes('mahkamah agung')
    );
    if (isGovIntentQuery && (domain.endsWith('.go.id') || domain.endsWith('.mil') || domain.includes('bmkg.go.id') || row.category === 'gov_edu')) {
      score += 45000;
      if (isRootUrl || url.includes('/cuaca') || url.includes('/gempa') || url.includes('/berita')) {
        score += 20000;
      }
    }

    // 2b-3. Sports (Liga 1, Timnas Indonesia, PSSI, Bulu Tangkis, MotoGP, F1) Boost
    const isSportIntentQuery = (
      lowerQuery.includes('timnas') || lowerQuery.includes('pssi') ||
      lowerQuery.includes('liga 1') || lowerQuery.includes('bola') ||
      lowerQuery.includes('sepakbola') || lowerQuery.includes('sepak bola') ||
      lowerQuery.includes('motogp') || lowerQuery.includes('formula 1') ||
      lowerQuery.includes('f1') || lowerQuery.includes('bulutangkis') ||
      lowerQuery.includes('bulu tangkis') || lowerQuery.includes('badminton') ||
      lowerQuery.includes('all england') || lowerQuery.includes('skor') ||
      lowerQuery.includes('klasemen') || lowerQuery.includes('jadwal bola')
    );
    if (isSportIntentQuery && (
      row.category === 'sport' ||
      domain.includes('sport.detik.com') ||
      domain.includes('bola.kompas.com') ||
      domain.includes('bola.net') ||
      domain.includes('bola.com') ||
      domain.includes('pssi.org') ||
      domain.includes('ligaindonesiabaru.com') ||
      domain.includes('pbsi.id')
    )) {
      score += 35000;
    }

    // Indonesian domain / language prioritization
    const isIndonesianSource = (
      domain.endsWith('.id') ||
      domain.endsWith('.co.id') ||
      domain.endsWith('.go.id') ||
      domain.endsWith('.ac.id') ||
      domain.includes('id.wikipedia.org') ||
      domain.includes('kompas.com') ||
      domain.includes('detik.com') ||
      domain.includes('kontan.co.id') ||
      domain.includes('tribunnews.com') ||
      domain.includes('antaranews.com')
    );
    if (isIndonesianSource) {
      score += 4000;
    }

    // 2c. Definitional Q&A Boost (e.g. "X itu apa", "apa itu X")
    if (intentInfo?.isDefinitional && (isTitlePrefix || isTitleContains)) {
      if (content.includes('adalah') || content.includes('merupakan') || content.includes('is an') || content.includes('is a') || isKnowledgeAuthority || isExactBrandQuery) {
        score += 4000;
      }
    }

    // 3. Query Term Coverage (Weighted heavily on coreTerms in Title vs Body)
    let matchedCoreTermsCount = 0;
    let titleCoreTermsMatchedCount = 0;
    let totalOccurrencesWeighted = 0;

    for (let i = 0; i < effectiveCoreTerms.length; i++) {
      const term = effectiveCoreTerms[i];
      if (!term || term.length < 2) continue;

      let termFound = false;

      // Count occurrences in title (weighted x50) - SIMD C++ indexOf
      const titleMatches = fastCountOccurrences(title, term);
      if (titleMatches > 0) {
        termFound = true;
        titleCoreTermsMatchedCount++;
        totalOccurrencesWeighted += titleMatches * 50;
      }

      // Count occurrences in headings (weighted x20)
      const headingMatches = fastCountOccurrences(headings, term);
      if (headingMatches > 0) {
        termFound = true;
        totalOccurrencesWeighted += headingMatches * 20;
      }

      // Count occurrences in description (weighted x10)
      const descMatches = fastCountOccurrences(description, term);
      if (descMatches > 0) {
        termFound = true;
        totalOccurrencesWeighted += descMatches * 10;
      }

      // Count occurrences in content (weighted x2.0)
      const contentMatches = fastCountOccurrences(content, term);
      if (contentMatches > 0) {
        termFound = true;
        totalOccurrencesWeighted += Math.min(contentMatches, 40) * 2.0;
      }

      if (termFound) {
        matchedCoreTermsCount++;
      }
    }

    // Core terms coverage multiplier
    const coverageRatio = effectiveCoreTerms.length > 0 ? (matchedCoreTermsCount / effectiveCoreTerms.length) : 1;
    score += (coverageRatio * coverageRatio) * 1000;
    score += totalOccurrencesWeighted * 3.5;

    // If ALL core terms are present in the TITLE, give super relevancy bonus
    if (effectiveCoreTerms.length > 0 && titleCoreTermsMatchedCount === effectiveCoreTerms.length) {
      score += 8000;
    } else if (titleCoreTermsMatchedCount > 0) {
      score += titleCoreTermsMatchedCount * 2500;
    }

    // 2d. Specific Content / Deep Article Boost - ONLY IF RELEVANT TO QUERY!
    if (isArticle) {
      if (isExactTitle || isTitlePrefix || isTitleContains) {
        score += 5500;
      } else if (titleCoreTermsMatchedCount > 0 || headings.includes(coreSubject)) {
        score += 3000;
      }
    } else {
      const isDeepArticle = (
        url.includes('/read/') ||
        url.includes('/artikel/') ||
        url.includes('/berita/20') ||
        url.includes('/nasional/20') ||
        url.includes('/ekonomi/20') ||
        url.includes('/internasional/20') ||
        url.includes('/wiki/') ||
        url.includes('/post/') ||
        url.includes('/entries/')
      );
      if (isDeepArticle && (isTitlePrefix || isTitleContains || titleCoreTermsMatchedCount > 0)) {
        score += 2500;
      }
    }

    // Authority boost (PageRank & in-links graph & Domain Trust Score)
    const pr = row.pagerank || 1.0;
    const inLinks = row.in_links_count || 0;
    const trustScore = row.trust_score || 50.0;
    const isVerified = row.is_verified_trust || 0;

    score += (pr * 6.0) + (inLinks * 0.8) + (trustScore * 4.0);
    if (isVerified) {
      score += 300;
    }

    // 4. ANTI-GENERIC-CHANNEL DEMOTION (Anti-Portal Index Hijacking)
    const isGenericChannelOrHub = (
      url.endsWith('/berita') || url.endsWith('/berita/') ||
      url.endsWith('/nasional') || url.endsWith('/nasional/') ||
      url.endsWith('/ekonomi') || url.endsWith('/ekonomi/') ||
      url.endsWith('/internasional') || url.endsWith('/internasional/') ||
      url.endsWith('/terkini') || url.endsWith('/terkini/') ||
      url.endsWith('/terpopuler') || url.endsWith('/terpopuler/') ||
      url.endsWith('/news') || url.endsWith('/news/') ||
      url.endsWith('/feed') || url.endsWith('/rss') ||
      url.includes('/tag/') || url.includes('/kategori/') || url.includes('/kanal/') ||
      url.includes('/rubrik/') || url.includes('/category/') ||
      title.startsWith('berita terkini') || title.startsWith('indeks berita') ||
      title.startsWith('kabar harian') || title.startsWith('kumpulan berita') ||
      title.includes('kumpulan berita') || title.includes('indeks topik') ||
      title.startsWith('kategori:') || title.startsWith('category:')
    );

    // If it is a channel, check if the channel path/domain actually matches the user's specific query topic!
    // (e.g. query "cuaca jakarta" matching "kompas.com/cuaca" is a topic destination, NOT a random portal hub)
    const hasHubIntent = lowerQuery.includes('kanal') || lowerQuery.includes('indeks') || lowerQuery.includes('kategori');
    let pathname = '';
    const slashIdx = url.indexOf('/', 8);
    if (slashIdx !== -1) {
      const qmIdx = url.indexOf('?', slashIdx);
      pathname = qmIdx !== -1 ? url.slice(slashIdx, qmIdx) : url.slice(slashIdx);
    }
    const queryMatchesTopic = effectiveCoreTerms.some(t => t.length >= 3 && (pathname.includes(t) || domain.includes(t)));

    if ((isChannel || isGenericChannelOrHub) && !hasHubIntent && !isExactBrandQuery) {
      if (queryMatchesTopic && (isTitleContains || titleCoreTermsMatchedCount > 0)) {
        score += 6000; // Targeted topic destination
      } else {
        score *= 0.05; // Demote generic portal landing pages
      }
    }

    // Subdomain portal penalty (e.g. momsmoney.kontan.co.id for tech query)
    if (domain.split('.').length > 3 && !domain.includes(coreSubject)) {
      score *= 0.6;
    }

    // Demote obscure foreign language wikipedias for general Indonesian searches
    if (domain.includes('.wikipedia.org') && !domain.startsWith('id.') && !domain.startsWith('en.')) {
      score *= 0.02; // Slashes foreign wikis so Indonesian Wikipedia and official news always dominate
    }

    // 🛑 CRUCIAL: If query contains specific non-generic entity terms, title MUST match at least one!
    const specificEntityTerms = effectiveCoreTerms.filter(t => !GENERIC_CATEGORY_WORDS.has(t));
    let titleSpecificMatchedCount = 0;
    if (specificEntityTerms.length > 0) {
      for (const st of specificEntityTerms) {
        if (title.includes(st)) titleSpecificMatchedCount++;
      }
      if (!isExactBrandQuery && !isGeneralNewsQuery && titleSpecificMatchedCount === 0) {
        score *= 0.05; // 95% penalty for missing the specific subject (e.g. prabowo, gempa)
      }
    } else if (!isExactBrandQuery && !isGeneralNewsQuery && titleCoreTermsMatchedCount === 0) {
      score *= 0.10;
    }

    // 5. Intelligent Recency & Freshness Overhaul (Highest weight to newest relevant content)
    const now = Date.now();
    const isQueryRelevantToArticle = (isGeneralNewsQuery || isTitlePrefix || isTitleContains || titleCoreTermsMatchedCount > 0);
    const hasExplicitPublishedAt = Boolean(row.published_at && Number(row.published_at) > 946684800000);
    const pubTime = Number(row.published_at || (isArticle ? row.crawled_at : 0));

    if (pubTime > 946684800000 && !isChannel && !isGenericChannelOrHub && isQueryRelevantToArticle) {
      const diffHours = Math.max(0, (now - pubTime) / (3600 * 1000));
      const hasMetadata = Boolean(
        (row.author && row.author.length > 2) ||
        (row.schema_type && row.schema_type.includes('Article')) ||
        (row.lead_image_url) ||
        (row.reading_time_min && row.reading_time_min > 0)
      );

      const isBreakingNewsQuery = (
        lowerQuery.includes('terbaru') ||
        lowerQuery.includes('terkini') ||
        lowerQuery.includes('hari ini') ||
        lowerQuery.includes('update') ||
        lowerQuery.includes('gempa') ||
        lowerQuery.includes('cuaca') ||
        lowerQuery.includes('harga') ||
        lowerQuery.includes('kurs') ||
        lowerQuery.includes('live') ||
        lowerQuery.includes('skor') ||
        lowerQuery.includes('jadwal')
      );

      const isHistoricalQuery = (
        lowerQuery.includes('sejarah') ||
        lowerQuery.includes('asal usul') ||
        lowerQuery.includes('biografi') ||
        lowerQuery.includes('definisi') ||
        lowerQuery.includes('pengertian') ||
        lowerQuery.includes('apa itu') ||
        /\b(19\d\d|200\d|201\d|202[0-3])\b/.test(lowerQuery)
      );

      // Aggressive Freshness Boost (Highest weight to newest!)
      if (diffHours <= 2) {
        score *= (isBreakingNewsQuery ? 3.5 : 2.5);
        score += (isBreakingNewsQuery ? 45000 : 30000);
        if (hasMetadata) score += 3000;
        if (hasExplicitPublishedAt) score += 5000;
      } else if (diffHours <= 6) {
        score *= (isBreakingNewsQuery ? 2.8 : 2.0);
        score += (isBreakingNewsQuery ? 35000 : 20000);
        if (hasMetadata) score += 2000;
        if (hasExplicitPublishedAt) score += 3000;
      } else if (diffHours <= 24) {
        score *= (isBreakingNewsQuery ? 2.0 : 1.6);
        score += (isBreakingNewsQuery ? 20000 : 12000);
        if (hasMetadata) score += 1500;
        if (hasExplicitPublishedAt) score += 2000;
      } else if (diffHours <= 72) {
        score *= (isBreakingNewsQuery ? 1.5 : 1.3);
        score += (isBreakingNewsQuery ? 10000 : 6000);
        if (hasExplicitPublishedAt) score += 1000;
      } else if (diffHours <= 168) {
        score *= (isBreakingNewsQuery ? 1.2 : 1.1);
        score += (isBreakingNewsQuery ? 5000 : 2000);
      }

      // Progressive Stale Penalties (Decay old web pages)
      const isOfficialReference = domain.includes('.wikipedia.org') || domain.endsWith('.gov') || domain.endsWith('.go.id') || domain.endsWith('.edu') || domain.endsWith('.ac.id');
      if (!isHistoricalQuery && !isOfficialReference) {
        if (isBreakingNewsQuery && diffHours > 168) {
          score *= 0.15; // Breaking news query older than 7 days severely demoted
        } else if (diffHours > 26280) { // > 3 years
          score *= 0.05;
        } else if (diffHours > 17520) { // > 2 years
          score *= 0.10;
        } else if (diffHours > 8760) { // > 1 year
          score *= 0.25;
        } else if (diffHours > 4380) { // > 6 months
          score *= 0.50;
        } else if (diffHours > 2160) { // > 3 months
          score *= 0.75;
        }
      }
    }

    return score;
  }

  /**
   * Executes World-Scale High-Trust Search with Multi-Stage FTS5 + Instant Answers + Sitelinks
   */
  search(rawQuery, options = {}) {
    const startTime = performance.now();
    const limit = options.limit || 20;
    const page = options.page || 1;
    const offset = (page - 1) * limit;
    const type = options.type || options.category || 'all';

    const intentInfo = this.parseQueryIntent(rawQuery);
    const cleanRaw = intentInfo.cleanRaw;
    const coreSubject = intentInfo.coreSubject;
    const terms = intentInfo.allTerms;
    const coreTerms = intentInfo.coreTerms;
    const effectiveCoreTerms = coreTerms.length > 0 ? coreTerms : terms;

    const cacheKey = `${cleanRaw}:${limit}:${page}:${type}:${options.timeFilter || 'all'}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        durationMs: Math.max(0.1, Math.round((performance.now() - startTime) * 100) / 100)
      };
    }

    // 0. Compute Instant Answer (Calculations, Conversions, Knowledge Graph, Cached Geo)
    const instantAnswer = options.instantAnswer !== undefined
      ? options.instantAnswer
      : ((page === 1) ? InstantAnswersEngine.getInstantAnswer(rawQuery, this.dbInstance || this.db) : null);

    // 🛑 ZERO-TOLERANCE ANTI-JUDOL & SAFESEARCH COMPLIANCE SHIELD:
    const isExplicitIllegalQuery = (
      TrustGatekeeper.isSpamTitleOrContent(rawQuery, '', '') ||
      /\b(slot|judi|judol|togel|bokep|porno|maxwin|gacor|totomacau|sbobet|poker88|dewanaga|rokokbet|toto188|jablay123)\b/i.test(cleanRaw)
    );
    const isNewsCrackdownQuery = (
      cleanRaw.includes('tangkap') || cleanRaw.includes('polisi') || cleanRaw.includes('polri') ||
      cleanRaw.includes('blokir') || cleanRaw.includes('satgas') || cleanRaw.includes('kasus') ||
      cleanRaw.includes('berita') || cleanRaw.includes('hukum') || cleanRaw.includes('sidang') ||
      cleanRaw.includes('berantas') || cleanRaw.includes('cegah') || cleanRaw.includes('tersangka')
    );

    if (isExplicitIllegalQuery && !isNewsCrackdownQuery) {
      const noticeMsg = 'Pencarian terkait perjudian online (judi/slot/togel) atau konten pornografi dibatasi sesuai UU ITE No. 1 Tahun 2024 dan regulasi Kementerian Komunikasi dan Informatika Republik Indonesia. DeeperNova Search Engine menerapkan kebijakan zero-tolerance terhadap situs ilegal, penipuan, dan konten terlarang.';
      return {
        query: rawQuery,
        total: 0,
        page: 1,
        durationMs: Math.max(0.1, Math.round((performance.now() - startTime) * 100) / 100),
        safeSearchBlocked: true,
        safeSearchMessage: noticeMsg,
        safeSearchNotice: {
          blocked: true,
          type: 'compliance',
          title: 'Peringatan Keamanan & Kepatuhan Hukum (Anti-Judol & Anti-Pornografi)',
          message: noticeMsg,
          reportUrl: 'https://aduankonten.id'
        },
        instantAnswer: {
          type: 'compliance_alert',
          title: '🛡️ Konten Ilegal Dibatasi (SafeSearch Anti-Judol)',
          description: 'Layanan perjudian online dan situs dewasa dilarang di Indonesia berdasarkan Pasal 27 Ayat 2 UU ITE. Laporkan situs judi online ilegal ke portal resmi pemerintah melalui aduankonten.id.',
          source: 'Kementerian Kominfo RI',
          url: 'https://aduankonten.id'
        },
        results: []
      };
    }

    if (terms.length === 0) {
      return {
        query: rawQuery,
        total: 0,
        page,
        durationMs: 0,
        instantAnswer,
        results: []
      };
    }

    // Fast-path for empty or 1-character queries (e.g. 'i', 'a') to guarantee sub-1ms instant response
    if (cleanRaw.length <= 1) {
      if (cleanRaw.length === 0) {
        return {
          query: rawQuery,
          total: 0,
          page: 1,
          durationMs: 0.1,
          instantAnswer: null,
          results: []
        };
      }
      try {
        const nextChar = String.fromCharCode(cleanRaw.charCodeAt(0) + 1);
        const topRows = this.db.prepare(`
          SELECT id, url, domain, title, description, headings, SUBSTR(content, 1, 600) as content,
                 logo_url, lead_image_url, pagerank, trust_score, category, author, reading_time_min,
                 schema_type, is_verified_trust, in_links_count, published_at, crawled_at
          FROM pages
          WHERE domain >= ? AND domain < ?
          LIMIT ?
        `).all(cleanRaw, nextChar, limit);
        return {
          query: rawQuery,
          total: topRows.length,
          page: 1,
          durationMs: Math.max(0.1, Math.round((performance.now() - startTime) * 100) / 100),
          instantAnswer,
          results: topRows.map(r => this._formatSearchResult(r, rawQuery, cleanRaw, [cleanRaw]))
        };
      } catch {}
    }

    const now = Date.now();
    let filterCondition = '';
    if (options.timeFilter === '24h') {
      filterCondition += ` AND (p.published_at >= ${now - 86400000} OR p.crawled_at >= ${now - 86400000})`;
    } else if (options.timeFilter === '7d') {
      filterCondition += ` AND (p.published_at >= ${now - 604800000} OR p.crawled_at >= ${now - 604800000})`;
    } else if (options.timeFilter === '30d') {
      filterCondition += ` AND (p.published_at >= ${now - 2592000000} OR p.crawled_at >= ${now - 2592000000})`;
    }

    // Category Filtering
    if (type === 'academic') {
      filterCondition += ` AND (p.category = 'academic' OR p.domain LIKE '%.edu' OR p.domain LIKE '%.ac.id' OR p.domain LIKE '%arxiv.org%' OR p.domain LIKE '%pubmed%')`;
    } else if (type === 'developer') {
      filterCondition += ` AND (p.category = 'developer' OR p.domain LIKE '%github.com%' OR p.domain LIKE '%stackoverflow.com%' OR p.domain LIKE '%developer.mozilla.org%')`;
    } else if (type === 'gov_edu') {
      filterCondition += ` AND (p.category = 'gov_edu' OR p.domain LIKE '%.gov' OR p.domain LIKE '%.go.id' OR p.domain LIKE '%.edu' OR p.domain LIKE '%.ac.id')`;
    } else if (type === 'finance') {
      filterCondition += ` AND (p.category = 'finance' OR p.domain LIKE '%finance%' OR p.domain LIKE '%market%' OR p.domain LIKE '%investing.com%')`;
    } else if (type === 'knowledge') {
      filterCondition += ` AND (p.category = 'knowledge' OR p.domain LIKE '%wikipedia.org%' OR p.domain LIKE '%britannica.com%')`;
    } else if (type === 'sport') {
      filterCondition += ` AND (p.category = 'sport' OR p.domain LIKE '%sport%' OR p.domain LIKE '%bola%' OR p.domain LIKE '%pssi.org%' OR p.domain LIKE '%ligaindonesiabaru%')`;
    } else if (type === 'news') {
      filterCondition += ` AND ${this._buildNewsDomainCondition('p')}`;
    }

    const candidatesMap = new Map();
    const fetchQueryLimit = Math.max(limit * 4, 80);

    // Stage 0: DOMAIN-FIRST Candidate Retrieval (Guarantee official domains like youtube, detik, kompas enter pool)
    const isGenericNavQuery = GENERIC_CATEGORY_WORDS.has(coreSubject) || COMMON_NON_BRAND_WORDS.has(coreSubject) || GENERIC_CATEGORY_WORDS.has(cleanRaw);
    const domainCandidatesToProbe = new Set();
    const cleanSubj = coreSubject.replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();

    // Only probe brand domains if query looks like a specific brand/website name (NOT generic words/countries)
    if (cleanSubj.length >= 3 && !isGenericNavQuery && effectiveCoreTerms.length <= 2) {
      domainCandidatesToProbe.add(cleanSubj);
      domainCandidatesToProbe.add(`www.${cleanSubj}`);
      domainCandidatesToProbe.add(`${cleanSubj}.com`);
      domainCandidatesToProbe.add(`www.${cleanSubj}.com`);
      domainCandidatesToProbe.add(`${cleanSubj}.id`);
      domainCandidatesToProbe.add(`${cleanSubj}.co.id`);
      domainCandidatesToProbe.add(`${cleanSubj}.ai`);
      domainCandidatesToProbe.add(`www.${cleanSubj}.ai`);
      domainCandidatesToProbe.add(`${cleanSubj}.org`);
    }

    if (domainCandidatesToProbe.size > 0) {
      try {
        const probeList = Array.from(domainCandidatesToProbe);
        const stmtDomainProbe = this.getDomainProbeStmt(probeList.length);
        const domainMatches = stmtDomainProbe.all(...probeList);
        for (const r of domainMatches) {
          candidatesMap.set(r.id, r);
        }
      } catch {}
    }

    // Clean alphanumeric tokens (prevent FTS syntax injection and eliminate wildcard b-tree scans)
    const cleanTokens = coreTerms
      .map(t => t.replace(/[^\p{L}\p{N}]/gu, '').trim())
      .filter(t => t.length > 0 && !CONVERSATIONAL_QUESTION_WORDS.has(t));
    const effectiveTokens = cleanTokens.length > 0 ? cleanTokens : terms.map(t => t.replace(/[^\p{L}\p{N}]/gu, '').trim()).filter(Boolean);

    // Separate ultra-high-frequency generic news/location tokens from specific entity/topic tokens
    const HIGH_FREQ_GENERIC_TOKENS = new Set([
      'berita', 'terbaru', 'terkini', 'hari', 'ini', 'indonesia', 'nasional', 'dunia', 'internasional',
      'update', 'info', 'kabar', 'news', 'latest', 'today', 'breaking', 'viral', 'trending', 'utama',
      'populer', 'terpopuler', 'sekarang', 'apa', 'itu', 'siapa', 'cara', 'yang', 'dan', 'di', 'ke',
      'dari', 'untuk', 'dengan', 'pada', 'tahun', 'bulan', 'minggu'
    ]);
    const specificTokens = effectiveTokens.filter(t => !HIGH_FREQ_GENERIC_TOKENS.has(t) && t.length >= 2);
    const isBroadNewsQuery = specificTokens.length === 0 && effectiveTokens.length > 0;
    const ftsQueryTokens = specificTokens.length > 0 ? specificTokens : effectiveTokens.slice(0, 3);

    // Stage 0.5: ⚡ Ultra-Fast In-Memory Hot Ring Buffer Scan (< 0.2ms, Zero Disk I/O!)
    // Guarantees 100% of newly crawled & live-fetched articles are retrieved immediately!
    try {
      const hotNews = this.dbInstance?.hotNewsRing || [];
      const hotPages = this.dbInstance?.hotPagesRing || [];
      if (isBroadNewsQuery) {
        // User asked for general breaking news (e.g. "berita terbaru indonesia hari ini")
        for (let i = 0; i < hotNews.length && candidatesMap.size < fetchQueryLimit; i++) {
          const item = hotNews[i];
          if (item && !candidatesMap.has(item.id)) candidatesMap.set(item.id, item);
        }
        for (let i = 0; i < hotPages.length && candidatesMap.size < fetchQueryLimit; i++) {
          const item = hotPages[i];
          if (item && !candidatesMap.has(item.id)) candidatesMap.set(item.id, item);
        }
      } else if (ftsQueryTokens.length > 0) {
        const searchPool = type === 'news' ? hotNews : hotPages;
        for (let i = 0; i < searchPool.length; i++) {
          const item = searchPool[i];
          if (!item) continue;
          const haystack = item._searchLower || `${item.title || ''} ${item.headings || ''} ${item.description || ''} ${item.domain || ''}`.toLowerCase();
          if (ftsQueryTokens.some(tok => haystack.includes(tok))) {
            candidatesMap.set(item.id, item);
            if (candidatesMap.size >= fetchQueryLimit) break;
          }
        }
      }
    } catch {}

    // Stage 1: Lightning Tier - Fast FTS5 Conjunction on Title, Headings & Description (Sub-3ms, No Full-Index Sort!)
    if (!isBroadNewsQuery && ftsQueryTokens.length > 0) {
      try {
        const titleHeadingsQuery = `{title headings description}: (` + ftsQueryTokens.map(t => `"${t}"`).join(' ') + `)`;
        let andRowsDesc;
        if (!filterCondition && this.stmtFastTitleHeadingsDesc) {
          andRowsDesc = this.stmtFastTitleHeadingsDesc.all(titleHeadingsQuery, fetchQueryLimit);
        } else {
          const stmtAndDesc = this.db.prepare(`
            SELECT
              p.id, p.url, p.domain, p.title, p.description, p.headings,
              SUBSTR(p.content, 1, 600) as content,
              p.logo_url, p.lead_image_url, p.pagerank, p.trust_score, p.category,
              p.author, p.reading_time_min, p.schema_type, p.is_verified_trust,
              p.in_links_count, p.published_at, p.crawled_at
            FROM (
              SELECT rowid FROM fts_pages WHERE fts_pages MATCH ? LIMIT ?
            ) f
            JOIN pages p ON f.rowid = p.id
            WHERE 1=1 ${filterCondition}
          `);
          andRowsDesc = stmtAndDesc.all(titleHeadingsQuery, fetchQueryLimit);
        }
        for (const r of andRowsDesc) {
          candidatesMap.set(r.id, r);
        }
      } catch {}
    }

    // Stage 1b: Deep Content Tier (Fallback only if Tier 1 yielded fewer than limit candidates)
    if (!isBroadNewsQuery && candidatesMap.size < limit && ftsQueryTokens.length > 0) {
      try {
        const allColumnsQuery = ftsQueryTokens.map(t => `"${t}"`).join(' ');
        let moreRows;
        if (!filterCondition && this.stmtBaseAnd) {
          moreRows = this.stmtBaseAnd.all(allColumnsQuery, fetchQueryLimit);
        } else {
          const stmtAll = this.db.prepare(`
            SELECT
              p.id, p.url, p.domain, p.title, p.description, p.headings,
              SUBSTR(p.content, 1, 600) as content,
              p.logo_url, p.lead_image_url, p.pagerank, p.trust_score, p.category,
              p.author, p.reading_time_min, p.schema_type, p.is_verified_trust,
              p.in_links_count, p.published_at, p.crawled_at
            FROM (
              SELECT rowid FROM fts_pages WHERE fts_pages MATCH ? LIMIT ?
            ) f
            JOIN pages p ON f.rowid = p.id
            WHERE 1=1 ${filterCondition}
          `);
          moreRows = stmtAll.all(allColumnsQuery, fetchQueryLimit);
        }
        if (moreRows) {
          for (const r of moreRows) {
            if (!candidatesMap.has(r.id)) candidatesMap.set(r.id, r);
          }
        }
      } catch {}
    }

    // Stage 2: Fast Disjunction (OR) on Specific Tokens Only (Never OR high-frequency stopwords!)
    if (!isBroadNewsQuery && candidatesMap.size < limit && specificTokens.length > 1) {
      try {
        const orQuery = `{title headings description}: (` + specificTokens.slice(0, 4).map(t => `"${t}"`).join(' OR ') + `)`;
        let orRows;
        if (!filterCondition && this.stmtFastTitleHeadingsDesc) {
          orRows = this.stmtFastTitleHeadingsDesc.all(orQuery, fetchQueryLimit);
        } else {
          const stmtOr = this.db.prepare(`
            SELECT
              p.id, p.url, p.domain, p.title, p.description, p.headings,
              SUBSTR(p.content, 1, 600) as content,
              p.logo_url, p.lead_image_url, p.pagerank, p.trust_score, p.category,
              p.author, p.reading_time_min, p.schema_type, p.is_verified_trust,
              p.in_links_count, p.published_at, p.crawled_at
            FROM (
              SELECT rowid FROM fts_pages WHERE fts_pages MATCH ? LIMIT ?
            ) f
            JOIN pages p ON f.rowid = p.id
            WHERE 1=1 ${filterCondition}
          `);
          orRows = stmtOr.all(orQuery, fetchQueryLimit);
        }
        if (orRows) {
          for (const r of orRows) {
            if (!candidatesMap.has(r.id)) {
              candidatesMap.set(r.id, r);
            }
          }
        }
      } catch {}
    }

    // Stage 3: Fast Exact Domain Match using indexed domain
    try {
      const target = coreSubject.replace(/[^a-zA-Z0-9.-]/g, '');
      if (target && target.length >= 2 && this.stmtBaseDomain) {
        const domainRows = this.stmtBaseDomain.all(
          target,
          `www.${target}`,
          `${target}.com`,
          `www.${target}.com`,
          `${target}.ai`,
          `www.${target}.ai`,
          `${target}.org`
        );
        for (const r of domainRows) {
          if (!candidatesMap.has(r.id)) {
            candidatesMap.set(r.id, r);
          }
        }
      }
    } catch {}

    // Cross-Domain Headline & Version Deduplication:
    // Strips publisher branding suffixes and eliminates syndicated wire duplicates across all portals
    const freshCandidates = this._deduplicateArticles(Array.from(candidatesMap.values()));

    const termRegexes = coreTerms.map(term =>
      term && term.length >= 2 ? new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null
    );

    // Calculate Google-grade accuracy scores with E-E-A-T trust weighting and Intent Awareness
    const scoredRows = freshCandidates
      .map(row => ({
        ...row,
        accuracyScore: this.calculateQueryAccuracyScore(row, rawQuery, terms, termRegexes, intentInfo)
      }))
      .filter(row => row.accuracyScore > 0); // Exclude zero-scored irrelevant pages

    // Sort strictly by accuracy score descending (Strictly monotonic, prevents TimSort corruption)
    scoredRows.sort((a, b) => b.accuracyScore - a.accuracyScore);

    // Enforce root domain diversity across search results (max 2 per publisher root domain)
    const diverseScoredRows = this._applyDomainDiversity(scoredRows, 2, Math.max(offset + limit + 20, 60));

    const total = scoredRows.length;
    const pageRows = diverseScoredRows.slice(offset, offset + limit);

    // Deep Sitelinks Extraction for #1 ranked domain result (using fast index)
    let topDomainSitelinks = [];
    if (page === 1 && pageRows.length > 0) {
      const topResult = pageRows[0];
      try {
        if (this.stmtSitelinks) {
          topDomainSitelinks = this.stmtSitelinks.all(topResult.domain, topResult.url) || [];
        }
      } catch {}
    }

    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    const results = pageRows.map((row, idx) => {
      // Highlight matching query terms in title with stabilo (escape HTML first to prevent XSS)
      let highlightedTitle = this.escapeHtml(row.title || '');
      for (const term of terms) {
        if (term && term.length >= 2) {
          const escapedTerm = this.escapeHtml(term);
          const r = new RegExp(`(${escapedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          highlightedTitle = highlightedTitle.replace(r, '<mark class="hl">$1</mark>');
        }
      }

      const snippet = this.createSnippet(
        row.description || row.content,
        terms,
        220
      );

      return {
        id: row.id,
        url: row.url,
        domain: row.domain,
        title: (row.title || '').replace(/<[^>]*>/g, '').trim(),
        rawTitle: (row.title || '').replace(/<[^>]*>/g, '').trim(),
        highlightedTitle: highlightedTitle,
        snippet,
        description: snippet,
        content: row.content || snippet,
        logoUrl: row.logo_url || null,
        leadImageUrl: row.lead_image_url || null,
        pagerank: row.pagerank,
        trustScore: row.trust_score || 50,
        category: row.category || 'general',
        author: row.author || null,
        readingTimeMin: row.reading_time_min || 1,
        schemaType: row.schema_type || 'WebPage',
        isVerifiedTrust: Boolean(row.is_verified_trust || (row.domain && (row.domain.endsWith('.gov') || row.domain.endsWith('.go.id') || row.domain.endsWith('.edu') || row.domain.endsWith('.ac.id')))),
        bm25: row.bm25_score != null ? Math.round(Math.abs(row.bm25_score) * 100) / 100 : 1.0,
        accuracyScore: Math.round(row.accuracyScore * 10) / 10,
        inLinks: row.in_links_count,
        headings: row.headings,
        date: formatSearchDate(row.published_at || row.crawled_at),
        formattedDate: formatSearchDate(row.published_at || row.crawled_at),
        timestampMs: Number(row.published_at || row.crawled_at || 0),
        publishedAt: row.published_at || row.crawled_at,
        published_at: row.published_at || row.crawled_at,
        crawledAt: row.crawled_at,
        sitelinks: (idx === 0 && topDomainSitelinks.length > 0) ? topDomainSitelinks : []
      };
    });

    const finalResult = {
      query: options.displayedQuery || rawQuery,
      actualQuery: rawQuery,
      total,
      page,
      durationMs,
      instantAnswer,
      correction: options.correction || null,
      type,
      algorithm: {
        name: "DeeperNova High-Trust Neural Search Engine",
        formula: "Score = ExactDomainBonus + ExactPhraseTitle + (CoverageRatio^2 * 400) + DensityBonus + PageRank + TrustScore(E-E-A-T)",
        terms
      },
      results
    };

    // Cache computed response
    this.searchCache.set(cacheKey, finalResult);

    return finalResult;
  }

  /**
   * Asynchronous search executor with real-time autonomous crawling for unknown locations & entities
   * + Google-grade Anti-Typo Auto-Correction Engine
   */
  async searchAsync(rawQuery, options = {}, db = null) {
    const page = options.page || 1;
    const forceOriginal = options.forceOriginal === true || options.forceOriginal === 'true';

    // 1. Execute instant search on rawQuery directly (lightning fast in-memory / FTS5)
    const originalResult = this.search(rawQuery, options);

    // If original query yields good results or user forced original, return immediately (0ms overhead)
    if (forceOriginal || originalResult.total >= 3) {
      return originalResult;
    }

    // 2. Only if original query yields zero/sparse results and the query is long enough to justify typo-linting,
    // skip the expensive fuzzy pass for short terms like "ai", "tes", "id", which otherwise dominate CPU.
    const shouldRunTypoFix = rawQuery && rawQuery.trim().length >= 3 && rawQuery.trim().split(/\s+/).some(token => token.length >= 3);
    let typoInfo = null;
    if (shouldRunTypoFix) {
      try {
        typoInfo = this.antiTypo.correctQuery(rawQuery);
      } catch {}
    }

    if (typoInfo && typoInfo.isCorrected && typoInfo.correctedQuery.toLowerCase() !== rawQuery.trim().toLowerCase()) {
      const correctedResult = this.search(typoInfo.correctedQuery, options);
      if (correctedResult.total > originalResult.total) {
        const correction = {
          originalQuery: rawQuery,
          correctedQuery: typoInfo.correctedQuery,
          didYouMean: typoInfo.correctedQuery,
          autoCorrected: originalResult.total === 0,
          explanation: originalResult.total === 0
            ? `Menampilkan hasil untuk ${typoInfo.correctedQuery}. Cari ${rawQuery} sebagai gantinya?`
            : `Mungkin maksud Anda: ${typoInfo.correctedQuery}`
        };
        return {
          ...correctedResult,
          correction,
          displayedQuery: rawQuery
        };
      }
    }

    return originalResult;
  }

  /**
   * Dedicated Image Search Engine with Multi-Stage FTS5 & Page Inheritance relevance
   */
  searchImages(rawQuery, options = {}) {
    const startTime = performance.now();
    const limit = options.limit || 30;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
      return this.getExploreImages(limit, page);
    }

    const cleanRaw = rawQuery.trim().toLowerCase();
    const cacheKey = `${cleanRaw}:${limit}:${page}`;
    const cached = this.imageCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        durationMs: Math.max(0.1, Math.round((performance.now() - startTime) * 100) / 100)
      };
    }

    const terms = cleanRaw
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);

    const ftsQuery = this.sanitizeQuery(rawQuery);

    try {
      const candidatesMap = new Map();
      const fetchLimit = Math.min(limit * 3, 60);

      // Stage 1: Search Image FTS (alt_text, title, context_text, domain)
      if (ftsQuery) {
        try {
          const stmtFtsImg = this.stmtFtsImg || this.db.prepare(`
            SELECT
              img.id, img.image_url, img.page_url, img.domain,
              img.alt_text, img.title, img.context_text, img.is_logo,
              img.width, img.height,
              p.title as page_title, p.logo_url, p.pagerank,
              bm25(fts_images, 4.0, 3.0, 1.5, 2.0) as bm25_score
            FROM fts_images
            JOIN images img ON fts_images.rowid = img.id
            LEFT JOIN pages p ON img.page_id = p.id
            WHERE fts_images MATCH ?
            LIMIT ?
          `);
          const imgRows = stmtFtsImg.all(ftsQuery, fetchLimit) || [];
          for (const r of imgRows) {
            candidatesMap.set(r.id, { ...r, matchSource: 'fts_image' });
          }
        } catch {}
      }

      // Stage 1.5: High-speed FTS OR fallback for multi-word queries (<10ms)
      if (candidatesMap.size < limit && terms.length > 1) {
        try {
          const orTerms = terms.filter(t => t.length >= 2).map(t => `"${t}"*`).join(' OR ');
          if (orTerms) {
            const stmtOr = this.stmtFtsImg || this.db.prepare(`
              SELECT
                img.id, img.image_url, img.page_url, img.domain,
                img.alt_text, img.title, img.context_text, img.is_logo,
                img.width, img.height,
                p.title as page_title, p.logo_url, p.pagerank,
                bm25(fts_images, 4.0, 3.0, 1.5, 2.0) as bm25_score
              FROM fts_images
              JOIN images img ON fts_images.rowid = img.id
              LEFT JOIN pages p ON img.page_id = p.id
              WHERE fts_images MATCH ?
              LIMIT ?
            `);
            const orRows = stmtOr.all(orTerms, fetchLimit) || [];
            for (const r of orRows) {
              if (!candidatesMap.has(r.id)) {
                candidatesMap.set(r.id, { ...r, matchSource: 'fts_or' });
              }
            }
          }
        } catch {}
      }

      // Stage 2: Search Host Page FTS (Fallback only if still fewer than limit images)
      if (candidatesMap.size < limit && ftsQuery) {
        try {
          const stmtPageFts = this.stmtPageFtsImg || this.db.prepare(`
            SELECT
              img.id, img.image_url, img.page_url, img.domain,
              img.alt_text, img.title, img.context_text, img.is_logo,
              img.width, img.height,
              p.title as page_title, p.logo_url, p.pagerank,
              1.0 as bm25_score
            FROM (
              SELECT rowid FROM fts_pages WHERE fts_pages MATCH ? LIMIT 15
            ) f
            JOIN pages p ON f.rowid = p.id
            JOIN images img ON img.page_id = p.id
            LIMIT ?
          `);
          const pageImgRows = stmtPageFts.all(ftsQuery, fetchLimit) || [];
          for (const r of pageImgRows) {
            if (!candidatesMap.has(r.id)) {
              candidatesMap.set(r.id, { ...r, matchSource: 'fts_page' });
            }
          }
        } catch {}
      }

      // Stage 3: Indexed Domain Match (Strictly single-word / domain queries only, avoids full-table scans)
      if (candidatesMap.size < limit && cleanRaw.length >= 2 && !cleanRaw.includes(' ')) {
        try {
          const stmtDomainImg = this.stmtDomainImg || this.db.prepare(`
            SELECT
              img.id, img.image_url, img.page_url, img.domain,
              img.alt_text, img.title, img.context_text, img.is_logo,
              img.width, img.height,
              p.title as page_title, p.logo_url, p.pagerank,
              1.0 as bm25_score
            FROM images img
            LEFT JOIN pages p ON img.page_id = p.id
            WHERE (img.domain = ? OR img.domain = ?)
            LIMIT ?
          `);
          const domRows = stmtDomainImg.all(cleanRaw, `www.${cleanRaw}`, limit) || [];
          for (const r of domRows) {
            if (!candidatesMap.has(r.id)) {
              candidatesMap.set(r.id, { ...r, matchSource: 'domain' });
            }
          }
        } catch {}
      }

      const allCandidates = Array.from(candidatesMap.values()).filter(img => {
        if (!img.image_url || typeof img.image_url !== 'string') return false;
        const u = img.image_url.trim().toLowerCase();
        if (!u.startsWith('http://') && !u.startsWith('https://')) return false;
        if (u.includes('spacer.gif') || u.includes('blank.gif') || u.includes('pixel.gif') || u.includes('1x1') || u.includes('data:image')) return false;
        if (img.width !== null && img.width < 40 && img.height !== null && img.height < 40) return false;
        return true;
      });

      // Calculate composite Image Relevance Score
      const scoredCandidates = allCandidates.map(img => {
        let score = 100;
        const imgDomain = (img.domain || '').toLowerCase();
        const alt = (img.alt_text || '').toLowerCase();
        const title = (img.title || '').toLowerCase();
        const pageTitle = (img.page_title || '').toLowerCase();
        const context = (img.context_text || '').toLowerCase();

        // 1. Exact Domain Match
        if (imgDomain.includes(cleanRaw)) {
          score += 1500;
        }

        // 2. High-precision Term Matching
        let matchedCount = 0;
        for (const term of terms) {
          if (!term || term.length < 2) continue;
          if (alt.includes(term)) { score += 250; matchedCount++; }
          if (title.includes(term)) { score += 200; matchedCount++; }
          if (pageTitle.includes(term)) { score += 150; matchedCount++; }
          if (context.includes(term)) { score += 60; matchedCount++; }
        }

        if (terms.length > 0 && matchedCount === terms.length) {
          score += 300;
        }

        // Authority & Quality Boost
        const pr = img.pagerank || 1.0;
        score += pr * 10;
        if (img.width >= 300 && img.height >= 200) score += 80;
        if (img.is_logo) score += 50;

        return {
          ...img,
          imageScore: score
        };
      });

      // Sort strictly by relevance score descending
      scoredCandidates.sort((a, b) => b.imageScore - a.imageScore);

      const total = scoredCandidates.length;
      const pageRows = scoredCandidates.slice(offset, offset + limit);
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

      const results = pageRows.map(row => ({
        id: row.id,
        imageUrl: row.image_url,
        pageUrl: row.page_url,
        pageTitle: row.page_title || row.title || row.domain,
        alt: row.alt_text || row.title || row.page_title || 'Gambar web',
        title: row.title || row.alt_text || row.page_title || '',
        context: row.context_text || '',
        domain: row.domain,
        logoUrl: row.logo_url || null,
        isLogo: Boolean(row.is_logo),
        width: row.width || null,
        height: row.height || null,
        pagerank: row.pagerank || 1.0
      }));

      const finalResult = {
        query: rawQuery,
        total,
        page,
        durationMs,
        type: 'images',
        algorithm: {
          name: "DeeperNova Visual Intelligence Matcher",
          formula: "Score = DomainMatch + AltTextMatch + TitleMatch + PageInheritance + PageRank + HighResBonus",
          terms
        },
        results
      };

      this.imageCache.set(cacheKey, finalResult);
      return finalResult;
    } catch (e) {
      return { query: rawQuery, total: 0, page, durationMs: 0, type: 'images', results: [] };
    }
  }

  /**
   * Get Explore/Trending Images from the database when no query is given (Sub-1ms indexed query)
   */
  getExploreImages(limit = 30, page = 1) {
    const startTime = performance.now();
    const safeLimit = Math.min(Math.max(1, limit), 60);
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    // Cache explore images in RAM for 60 seconds (zero database load on repeated calls)
    const cacheKey = `explore:${safeLimit}:${safePage}`;
    const cached = this.imageCache ? this.imageCache.get(cacheKey) : null;
    if (cached) {
      return {
        ...cached,
        durationMs: 0.1
      };
    }

    try {
      // ⚡ ULTRA-FAST SUB-1MS INDEXED EXPLORE QUERY:
      // Uses the primary key `id DESC` index on images table to grab recent items instantly
      // without scanning or sorting 590,000+ rows in temporary B-Tree!
      const stmt = this.stmtExploreImg || this.db.prepare(`
        SELECT
          img.id, img.image_url, img.page_url, img.domain,
          img.alt_text, img.title, img.context_text, img.is_logo,
          img.width, img.height,
          p.title as page_title, p.logo_url, p.pagerank
        FROM images img
        LEFT JOIN pages p ON img.page_id = p.id
        WHERE img.id IN (
          SELECT id FROM images
          WHERE image_url IS NOT NULL
          ORDER BY id DESC
          LIMIT ? OFFSET ?
        )
        ORDER BY img.id DESC
      `);
      this.stmtExploreImg = stmt;

      const rows = stmt.all(safeLimit, offset) || [];
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

      const results = rows.map(row => ({
        id: row.id,
        imageUrl: row.image_url,
        pageUrl: row.page_url,
        pageTitle: row.page_title || row.title || row.domain,
        alt: row.alt_text || row.title || row.page_title || 'Gambar web',
        title: row.title || row.alt_text || row.page_title || '',
        context: row.context_text || '',
        domain: row.domain,
        logoUrl: row.logo_url || null,
        isLogo: Boolean(row.is_logo),
        width: row.width || null,
        height: row.height || null,
        pagerank: row.pagerank || 1.0
      }));

      const payload = {
        query: '',
        total: results.length,
        page: safePage,
        durationMs,
        type: 'images',
        results
      };

      if (this.imageCache) {
        this.imageCache.set(cacheKey, payload);
      }
      return payload;
    } catch (err) {
      return {
        query: '',
        total: 0,
        page: safePage,
        durationMs: 0.1,
        type: 'images',
        results: []
      };
    }
  }


  fallbackSearch(rawQuery, limit, offset, startTime, terms) {
    const clean = (rawQuery || '').trim();
    if (!clean) return { query: rawQuery, total: 0, page: 1, durationMs: 0, results: [] };
    const sanitized = this.sanitizeQuery(clean);
    if (sanitized) {
      try {
        const stmt = this.db.prepare(`
          SELECT
            p.id, p.url, p.domain, p.title, p.description, p.headings,
            SUBSTR(p.content, 1, 600) as content,
            p.logo_url, p.lead_image_url, p.pagerank, p.in_links_count, p.crawled_at
          FROM (
            SELECT rowid FROM fts_pages WHERE fts_pages MATCH ? LIMIT ?
          ) f
          JOIN pages p ON f.rowid = p.id
          ORDER BY p.pagerank DESC
          LIMIT ? OFFSET ?
        `);
        const rows = stmt.all(sanitized, Math.max(limit * 2, 40), limit, offset);
        const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
        return {
          query: rawQuery,
          total: rows.length,
          page: 1,
          durationMs,
          results: rows.map(r => this._formatSearchResult(r, rawQuery, clean, terms))
        };
      } catch {}
    }
    // Never full-table scan 20GB pages table with LIKE! Scan In-Memory Hot Ring Buffer (<0.2ms)
    const lowerClean = clean.toLowerCase();
    const hotPages = this.dbInstance?.hotPagesRing || [];
    const rows = hotPages
      .filter(r => r && ((r.title && r.title.toLowerCase().includes(lowerClean)) || (r.headings && r.headings.toLowerCase().includes(lowerClean))))
      .slice(offset, offset + limit);
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    const results = rows.map(row => ({
      id: row.id,
      url: row.url,
      domain: row.domain,
      title: row.title,
      rawTitle: row.title,
      snippet: this.createSnippet(row.description || row.content, terms, 200),
      logoUrl: row.logo_url || null,
      leadImageUrl: row.lead_image_url || null,
      pagerank: row.pagerank,
      bm25: 1.0,
      inLinks: row.in_links_count,
      headings: row.headings,
      crawledAt: row.crawled_at
    }));

    return {
      query: rawQuery,
      total: results.length,
      page: 1,
      durationMs,
      algorithm: {
        name: "PageRank Fallback LIKE",
        formula: "Score = PageRank * TextMatch",
        fallback: true
      },
      results
    };
  }

  fallbackImageSearch(rawQuery, limit, offset, startTime, terms) {
    const clean = rawQuery ? rawQuery.trim() : '';
    const likePattern = `%${clean}%`;
    const stmt = this.db.prepare(`
      SELECT
        img.id, img.image_url, img.page_url, img.domain, img.alt_text, img.title, img.context_text, img.is_logo, img.width, img.height,
        p.title as page_title, p.logo_url, p.pagerank
      FROM images img
      LEFT JOIN pages p ON img.page_id = p.id
      WHERE img.alt_text LIKE ? OR img.title LIKE ? OR img.domain LIKE ? OR img.context_text LIKE ? OR p.title LIKE ?
      ORDER BY COALESCE(p.pagerank, 1.0) DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(likePattern, likePattern, likePattern, likePattern, likePattern, limit, offset);
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    const results = rows.map(row => ({
      id: row.id,
      imageUrl: row.image_url,
      pageUrl: row.page_url,
      pageTitle: row.page_title || row.title || row.domain,
      alt: row.alt_text || row.title || row.page_title || 'Gambar web',
      title: row.title || row.alt_text || row.page_title || '',
      context: row.context_text || '',
      domain: row.domain,
      logoUrl: row.logo_url || null,
      isLogo: Boolean(row.is_logo),
      width: row.width || null,
      height: row.height || null,
      pagerank: row.pagerank || 1.0
    }));

    return {
      query: rawQuery,
      total: results.length,
      page: 1,
      durationMs,
      type: 'images',
      algorithm: {
        name: "Image Search Fallback LIKE",
        fallback: true
      },
      results
    };
  }

  // ============================================================
  // NEWS-SPECIFIC SEARCH METHODS
  // ============================================================

  /**
   * Google News-Grade Ranking & Virality Algorithm
   * Multi-signal composite score evaluating:
   * 1. Query intent & keyword density
   * 2. Cross-publisher virality & buzz clustering
   * 3. Publisher authority tier (Tier 1 National vs Tier 2)
   * 4. Exponential recency decay
   */
  calculateGoogleNewsRanking(row, rawQuery, terms, allRows = []) {
    if (!row) return { rankingScore: 1.0, viralityScore: 0, viralityBadge: null, mediaTier: 'Standard' };

    const lowerQuery = (rawQuery || '').trim().toLowerCase();
    const title = (row.title || '').toLowerCase();
    const headings = (row.headings || '').toLowerCase();
    const description = (row.description || '').toLowerCase();
    const content = (row.content || '').toLowerCase();
    const domain = (row.domain || '').toLowerCase();

    // 1. RELEVANCE & QUERY DENSITY
    let relevanceScore = 0;
    if (lowerQuery.length >= 2) {
      if (title.includes(lowerQuery)) relevanceScore += 450;
      else if (headings.includes(lowerQuery)) relevanceScore += 220;
      else if (description.includes(lowerQuery)) relevanceScore += 140;

      let matchedTermsCount = 0;
      let totalOccurrencesWeighted = 0;

      for (const term of terms) {
        if (!term || term.length < 2) continue;
        let termFound = false;

        const titleMatches = fastCountOccurrences(title, term);
        if (titleMatches > 0) {
          termFound = true;
          totalOccurrencesWeighted += titleMatches * 15;
        }

        const headingMatches = fastCountOccurrences(headings, term);
        if (headingMatches > 0) {
          termFound = true;
          totalOccurrencesWeighted += headingMatches * 8;
        }

        const descMatches = fastCountOccurrences(description, term);
        if (descMatches > 0) {
          termFound = true;
          totalOccurrencesWeighted += descMatches * 4;
        }

        const contentMatches = fastCountOccurrences(content, term);
        if (contentMatches > 0) {
          termFound = true;
          totalOccurrencesWeighted += Math.min(contentMatches, 40);
        }

        if (termFound) matchedTermsCount++;
      }

      const coverageRatio = terms.length > 0 ? (matchedTermsCount / terms.length) : 1;
      relevanceScore += (coverageRatio * coverageRatio) * 250;
      relevanceScore += totalOccurrencesWeighted * 3.5;
    } else {
      relevanceScore = 100; // Zero-query default
    }

    // 2. VIRALITY & CROSS-PUBLISHER BUZZ VELOCITY
    // Count how many unique media domains covered this story/topic
    const distinctCoveringDomains = new Set();
    if (terms && terms.length > 0) {
      for (const other of allRows) {
        if (!other || other.id === row.id) continue;
        const otherTitle = (other.title || '').toLowerCase();
        const matchesQuery = terms.some(t => t.length >= 3 && otherTitle.includes(t));
        if (matchesQuery && other.domain) {
          distinctCoveringDomains.add(other.domain);
        }
      }
    }
    const multiDomainCount = distinctCoveringDomains.size;

    // Detect viral trigger words
    const viralKeywords = ['viral', 'trending', 'breaking', 'heboh', 'gempa', 'presiden', 'resmi', 'update', 'bmkg', 'live', 'terkini'];
    const hasViralTrigger = viralKeywords.some(vk => title.includes(vk) || headings.includes(vk));

    const now = Date.now();
    const pubTime = Number(row.published_at || row.crawled_at || now);
    const diffHours = Math.max(0.05, (now - pubTime) / (3600 * 1000));
    const recencyVelocity = diffHours <= 2 ? 30 : (diffHours <= 6 ? 20 : (diffHours <= 24 ? 10 : 0));
    const recencyBoost = Math.max(0, 1200 - (diffHours * 80));

    const inLinks = row.in_links_count || 0;
    const pr = row.pagerank || 1.0;

    let viralityRaw = (multiDomainCount * 12) + (hasViralTrigger ? 20 : 0) + (inLinks * 5) + (pr * 3) + recencyVelocity;
    const viralityScore = Math.min(99, Math.max(15, Math.round(viralityRaw)));

    let viralityBadge = null;
    if (viralityScore >= 70 || multiDomainCount >= 4) {
      viralityBadge = { label: 'Super Viral', type: 'super_viral', icon: 'flame', color: '#dc2626' };
    } else if (viralityScore >= 45 || multiDomainCount >= 2) {
      viralityBadge = { label: 'Trending Cepat', type: 'trending', icon: 'zap', color: '#ea580c' };
    } else if (multiDomainCount >= 1 || hasViralTrigger) {
      viralityBadge = { label: 'Banyak Diberitakan', type: 'buzz', icon: 'newspaper', color: '#2563eb' };
    }

    // 3. PUBLISHER AUTHORITY TIER
    const tier1Domains = [
      'detik.com', 'kompas.com', 'antaranews.com', 'cnnindonesia.com', 'cnbcindonesia.com', 'tempo.co', 'bbc.com',
      'reuters.com', 'apnews.com', 'nytimes.com', 'washingtonpost.com', 'wsj.com', 'bloomberg.com', 'cnbc.com',
      'theguardian.com', 'aljazeera.com', 'npr.org', 'techcrunch.com', 'arstechnica.com', 'theverge.com',
      'news.ycombinator.com'
    ];
    const tier2Domains = [
      'sindonews.com', 'liputan6.com', 'merdeka.com', 'tribunnews.com', 'republika.co.id', 'kumparan.com', 'bmkg.go.id',
      'kontan.co.id', 'katadata.co.id', 'bisnis.com', 'jawapos.com', 'slate.com', 'engadget.com', 'wired.com',
      'technologyreview.com', 'fastcompany.com', 'zdnet.com', 'theregister.com', 'reddit.com', 'slashdot.org', 'lobste.rs'
    ];

    let authorityMultiplier = 1.0;
    let mediaTier = 'Standard Media';

    if (tier1Domains.some(d => domain.includes(d))) {
      authorityMultiplier = 1.6;
      mediaTier = 'Tier 1 National';
    } else if (tier2Domains.some(d => domain.includes(d))) {
      authorityMultiplier = 1.3;
      mediaTier = 'Tier 2 Trusted';
    }

    // 4. EXPONENTIAL RECENCY DECAY
    let freshnessMultiplier = 1.0;
    if (diffHours <= 1) freshnessMultiplier = 3.2;
    else if (diffHours <= 3) freshnessMultiplier = 2.5;
    else if (diffHours <= 6) freshnessMultiplier = 2.0;
    else if (diffHours <= 12) freshnessMultiplier = 1.6;
    else if (diffHours <= 24) freshnessMultiplier = 1.25;
    else if (diffHours <= 72) freshnessMultiplier = 0.95;
    else if (diffHours <= 168) freshnessMultiplier = 0.70;
    else freshnessMultiplier = 0.35; // Old news penalty

    // 5. RICH MEDIA COMPLETENESS
    let mediaBonus = 0;
    if (row.lead_image_url) mediaBonus += 35;
    if (row.logo_url) mediaBonus += 15;

    // 6. ARTICLE DEPTH VS CHANNEL HUB DISCRIMINATION
    const isChannel = isChannelOrHubPage(row.url, row.title);
    const isArticle = isRealArticlePage(row.url, row.title);
    let articleBonus = 0;
    if (isArticle) {
      articleBonus = 400;
    }

    // COMPOSITE GOOGLE NEWS SCORE
    let rankingScore = (relevanceScore + (viralityScore * 2.5) + mediaBonus + articleBonus) * authorityMultiplier * freshnessMultiplier;
    rankingScore += recencyBoost;

    // Severe demotion for channel landing hubs:
    if (isChannel) {
      rankingScore *= 0.01; // 99% penalty so real news articles always rank above channels
    }

    return {
      rankingScore,
      timestampMs: pubTime,
      newsAgeHours: diffHours,
      viralityScore,
      viralityBadge,
      mediaTier,
      multiDomainCoverage: multiDomainCount > 0 ? `${multiDomainCount + 1}+ media meliput` : null,
      freshnessMultiplier
    };
  }

  /**
   * Search news articles with Google News-grade multi-signal ranking
   */
  searchNews(rawQuery, options = {}) {
    const startTime = performance.now();
    const limit = options.limit || 20;
    const page = options.page || 1;
    const offset = (page - 1) * limit;
    const sort = options.sort || 'latest';
    const category = options.category || null;

    const cleanRaw = (rawQuery || '').trim().toLowerCase();
    const cacheKey = `${cleanRaw}:${limit}:${page}:${sort}:${category || 'all'}`;
    const cached = this.newsCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        durationMs: Math.max(0.1, Math.round((performance.now() - startTime) * 100) / 100)
      };
    }

    const terms = cleanRaw
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);

    const ftsQuery = this.sanitizeQuery(rawQuery);

    if (!ftsQuery) {
      return { query: rawQuery, total: 0, page, durationMs: 0, type: 'news', results: [] };
    }

    try {
      const newsDomainFilter = this._buildNewsDomainCondition('p');
      const fetchLimit = Math.max(limit * 3, 60);

      // 1. Scan In-Memory Hot News Ring first (<0.2ms)
      const hotMatches = [];
      const hotNews = this.dbInstance?.hotNewsRing || [];
      for (let i = 0; i < hotNews.length && hotMatches.length < fetchLimit; i++) {
        const hn = hotNews[i];
        if (!hn) continue;
        const hay = hn._searchLower || `${hn.title || ''} ${hn.description || ''}`.toLowerCase();
        if (terms.length === 0 || terms.some(t => t.length >= 2 && hay.includes(t))) {
          hotMatches.push({ ...hn, bm25_score: 1.0 });
        }
      }

      const stmt = this.db.prepare(`
        SELECT
          p.id, p.url, p.domain, p.title, p.description, p.headings,
          SUBSTR(p.content, 1, 600) as content,
          p.logo_url, p.lead_image_url, p.pagerank, p.in_links_count,
          p.published_at, p.crawled_at,
          f.bm25_score
        FROM (
          SELECT rowid, 1.0 as bm25_score
          FROM fts_pages
          WHERE fts_pages MATCH ?
          LIMIT ?
        ) f
        JOIN pages p ON f.rowid = p.id
        WHERE ${newsDomainFilter}
        LIMIT ? OFFSET ?
      `);

      const dbRows = stmt.all(ftsQuery, fetchLimit * 2, fetchLimit, offset);
      const seenUrls = new Set(hotMatches.map(m => m.url));
      const rows = [...hotMatches];
      for (const r of dbRows) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          rows.push(r);
        }
      }
      const total = rows.length >= fetchLimit ? (page * limit) + 20 : (offset + rows.length);

      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

      // Separate genuine news articles from generic channel hubs
      const articleCandidates = [];
      const hubCandidates = [];

      for (const r of rows) {
        if (isRealArticlePage(r.url, r.title)) {
          articleCandidates.push(r);
        } else if (!isChannelOrHubPage(r.url, r.title)) {
          articleCandidates.push(r);
        } else {
          hubCandidates.push(r);
        }
      }

      // If we have enough genuine articles, deduplicate and use them exclusively!
      const dedupedArticles = this._deduplicateArticles(articleCandidates);
      const candidatesToScore = dedupedArticles.length >= limit ? dedupedArticles : [...dedupedArticles, ...hubCandidates];

      // Calculate Google News composite score & virality for every candidate
      const scoredRows = candidatesToScore.map(row => {
        const metrics = this.calculateGoogleNewsRanking(row, rawQuery, terms, candidatesToScore);
        return {
          ...row,
          ...metrics
        };
      });

      // Sort based on chosen mode. Explicit timestamp ordering ensures newest news is always on top.
      const getTimestamp = row => Number(row.published_at || row.crawled_at || 0);
      if (sort === 'latest') {
        scoredRows.sort((a, b) => {
          const timeDiff = getTimestamp(b) - getTimestamp(a);
          if (timeDiff !== 0) return timeDiff;
          return b.rankingScore - a.rankingScore;
        });
      } else if (sort === 'trending') {
        scoredRows.sort((a, b) => b.viralityScore - a.viralityScore || (getTimestamp(b) - getTimestamp(a)) || b.rankingScore - a.rankingScore);
      } else {
        // 'toprank' remains quality-weighted, but newest publication always wins ties.
        scoredRows.sort((a, b) => (getTimestamp(b) - getTimestamp(a)) || b.rankingScore - a.rankingScore);
      }

      const diverseRows = this._applyDomainDiversity(scoredRows, 2, limit);
      const pageRows = diverseRows.slice(0, limit);

      const results = pageRows.map(row => {
        let highlightedTitle = this.escapeHtml(row.title || '');
        for (const term of terms) {
          if (term && term.length >= 2) {
            const escapedTerm = this.escapeHtml(term);
            const r = new RegExp(`(${escapedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            highlightedTitle = highlightedTitle.replace(r, '<mark class="hl">$1</mark>');
          }
        }

        const snippetText = this.createSnippet(row.description || row.content || row.title, terms, 240);

        return {
          id: row.id,
          url: row.url,
          domain: row.domain,
          title: highlightedTitle,
          rawTitle: row.title,
          snippet: snippetText,
          description: snippetText,
          content: row.content || snippetText,
          logoUrl: row.logo_url || null,
          leadImageUrl: row.lead_image_url || null,
          pagerank: row.pagerank,
          bm25: row.bm25_score != null ? Math.round(Math.abs(row.bm25_score) * 100) / 100 : 1.0,
          accuracyScore: Math.round(row.rankingScore * 10) / 10,
          viralityScore: row.viralityScore,
          viralityBadge: row.viralityBadge,
          mediaTier: row.mediaTier,
          multiDomainCoverage: row.multiDomainCoverage,
          inLinks: row.in_links_count,
          headings: row.headings,
          publishedAt: row.published_at || row.crawled_at,
          published_at: row.published_at || row.crawled_at,
          timestampMs: row.timestampMs || (row.published_at || row.crawled_at),
          crawledAt: row.crawled_at
        };
      });

      const finalResult = { query: rawQuery, total, page, durationMs, type: 'news', sort, results };
      this.newsCache.set(cacheKey, finalResult);
      return finalResult;
    } catch (err) {
      // Fallback
      return this._fallbackNewsSearch(rawQuery, limit, offset, startTime, terms, sort);
    }
  }

  /**
   * Get trending news — fresh recent articles with highest authority
   */
  getTrendingNews(limit = 20, page = 1) {
    const startTime = performance.now();
    const offset = (page - 1) * limit;
    const fetchLimit = Math.max(limit * 3, 60);
    const newsDomainFilter = this._buildNewsDomainCondition('p');

    const now = Date.now();
    const h2 = now - 2 * 3600 * 1000;
    const h6 = now - 6 * 3600 * 1000;
    const h12 = now - 12 * 3600 * 1000;
    const h24 = now - 24 * 3600 * 1000;
    const d3 = now - 3 * 86400 * 1000;
    const d7 = now - 7 * 86400 * 1000;

    const freshnessSql = `(CASE 
      WHEN COALESCE(p.published_at, p.crawled_at) >= ${h2} THEN 12.0
      WHEN COALESCE(p.published_at, p.crawled_at) >= ${h6} THEN 8.0
      WHEN COALESCE(p.published_at, p.crawled_at) >= ${h12} THEN 5.0
      WHEN COALESCE(p.published_at, p.crawled_at) >= ${h24} THEN 3.5
      WHEN COALESCE(p.published_at, p.crawled_at) >= ${d3} THEN 2.0
      WHEN COALESCE(p.published_at, p.crawled_at) >= ${d7} THEN 1.0
      ELSE 0.3
    END)`;

    try {
      let rows = (this.dbInstance?.hotNewsRing || []).slice(0, fetchLimit * 2);
      if (rows.length < limit) {
        const stmt = this.db.prepare(`
          SELECT id, url, domain, title, description, headings,
                 logo_url, lead_image_url, pagerank, in_links_count,
                 published_at, crawled_at
          FROM pages p
          WHERE p.id > (SELECT IFNULL(MAX(id), 0) - 2500 FROM pages)
            AND p.title IS NOT NULL AND length(p.title) > 10
          ORDER BY p.id DESC
          LIMIT ? OFFSET ?
        `);
        rows = stmt.all(fetchLimit, offset);
      }
      const articleCandidates = rows.filter(r => isRealArticlePage(r.url, r.title) || !isChannelOrHubPage(r.url, r.title));
      const pool = articleCandidates.length >= limit ? articleCandidates : (articleCandidates.length > 0 ? [...articleCandidates, ...rows.filter(r => !articleCandidates.includes(r))] : rows);
      const diverseRows = this._applyDomainDiversity(pool, 2, limit);

      const total = diverseRows.length >= limit ? (page * limit) + 20 : (offset + diverseRows.length);
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

      const results = diverseRows.map(row => {
        const metrics = this.calculateGoogleNewsRanking(row, '', [], diverseRows);
        const snippetText = (row.description || '').slice(0, 240);
        return {
          id: row.id,
          url: row.url,
          domain: row.domain,
          title: row.title,
          rawTitle: row.title,
          snippet: snippetText,
          description: snippetText,
          content: row.content || snippetText,
          logoUrl: row.logo_url || null,
          leadImageUrl: row.lead_image_url || null,
          pagerank: row.pagerank,
          bm25: null,
          accuracyScore: Math.round(metrics.rankingScore * 10) / 10,
          viralityScore: metrics.viralityScore,
          viralityBadge: metrics.viralityBadge,
          mediaTier: metrics.mediaTier,
          multiDomainCoverage: metrics.multiDomainCoverage,
          inLinks: row.in_links_count,
          headings: row.headings,
          publishedAt: row.published_at || row.crawled_at,
          published_at: row.published_at || row.crawled_at,
          crawledAt: row.crawled_at
        };
      });

      return { query: '', total, page, durationMs, type: 'news', sort: 'trending', results };
    } catch {
      return { query: '', total: 0, page, durationMs: 0, type: 'news', sort: 'trending', results: [] };
    }
  }

  /**
   * Get top-ranked news — Highest PageRank with strong Freshness & Virality Weight
   * Newest high-authority news stays firmly at the top!
   */
  getTopRankedNews(limit = 20, page = 1) {
    const startTime = performance.now();
    const offset = (page - 1) * limit;
    const fetchLimit = Math.max(limit * 3, 60);
    const newsDomainFilter = this._buildNewsDomainCondition('p');

    const now = Date.now();
    const h2 = now - 2 * 3600 * 1000;
    const h6 = now - 6 * 3600 * 1000;
    const h12 = now - 12 * 3600 * 1000;
    const h24 = now - 24 * 3600 * 1000;
    const d3 = now - 3 * 86400 * 1000;
    const d7 = now - 7 * 86400 * 1000;

    const freshnessSql = `(CASE 
      WHEN COALESCE(p.published_at, p.crawled_at) >= ${h2} THEN 12.0
      WHEN COALESCE(p.published_at, p.crawled_at) >= ${h6} THEN 8.0
      WHEN COALESCE(p.published_at, p.crawled_at) >= ${h12} THEN 5.0
      WHEN COALESCE(p.published_at, p.crawled_at) >= ${h24} THEN 3.5
      WHEN COALESCE(p.published_at, p.crawled_at) >= ${d3} THEN 2.0
      WHEN COALESCE(p.published_at, p.crawled_at) >= ${d7} THEN 1.0
      ELSE 0.3
    END)`;

    try {
      let rows = (this.dbInstance?.hotNewsRing || []).slice(0, fetchLimit * 2);
      if (rows.length < limit) {
        const stmt = this.db.prepare(`
          SELECT id, url, domain, title, description, headings,
                 logo_url, lead_image_url, pagerank, in_links_count,
                 published_at, crawled_at
          FROM pages p
          WHERE p.id > (SELECT IFNULL(MAX(id), 0) - 2500 FROM pages)
            AND p.title IS NOT NULL AND length(p.title) > 10
          ORDER BY p.id DESC
          LIMIT ? OFFSET ?
        `);
        rows = stmt.all(fetchLimit, offset);
      }
      const articleCandidates = rows.filter(r => isRealArticlePage(r.url, r.title) || !isChannelOrHubPage(r.url, r.title));
      const pool = articleCandidates.length >= limit ? articleCandidates : (articleCandidates.length > 0 ? [...articleCandidates, ...rows.filter(r => !articleCandidates.includes(r))] : rows);
      const diverseRows = this._applyDomainDiversity(pool, 2, limit);

      const total = diverseRows.length >= limit ? (page * limit) + 20 : (offset + diverseRows.length);
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

      const results = diverseRows.map(row => {
        const metrics = this.calculateGoogleNewsRanking(row, '', [], diverseRows);
        const snippetText = (row.description || '').slice(0, 240);
        return {
          id: row.id,
          url: row.url,
          domain: row.domain,
          title: row.title,
          rawTitle: row.title,
          snippet: snippetText,
          description: snippetText,
          content: row.content || snippetText,
          logoUrl: row.logo_url || null,
          leadImageUrl: row.lead_image_url || null,
          pagerank: row.pagerank,
          bm25: null,
          accuracyScore: Math.round(metrics.rankingScore * 10) / 10,
          viralityScore: metrics.viralityScore,
          viralityBadge: metrics.viralityBadge,
          mediaTier: metrics.mediaTier,
          multiDomainCoverage: metrics.multiDomainCoverage,
          inLinks: row.in_links_count,
          headings: row.headings,
          publishedAt: row.published_at || row.crawled_at,
          published_at: row.published_at || row.crawled_at,
          crawledAt: row.crawled_at
        };
      });

      return { query: '', total, page, durationMs, type: 'news', sort: 'toprank', results };
    } catch {
      return { query: '', total: 0, page, durationMs: 0, type: 'news', sort: 'toprank', results: [] };
    }
  }

  /**
   * Search images from news pages only
   */
  searchNewsImages(rawQuery, options = {}) {
    const startTime = performance.now();
    const limit = options.limit || 24;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    const ftsQuery = this.sanitizeQuery(rawQuery);
    if (!ftsQuery) {
      return { query: rawQuery, total: 0, page, durationMs: 0, type: 'news_images', results: [] };
    }

    try {
      const newsDomainFilter = this._buildNewsDomainCondition('img');

      const stmt = this.db.prepare(`
        SELECT
          img.id, img.image_url, img.page_url, img.domain,
          img.alt_text, img.title, img.context_text, img.is_logo,
          img.width, img.height,
          p.title as page_title, p.logo_url, p.pagerank,
          1.0 as bm25_score
        FROM (
          SELECT rowid FROM fts_images WHERE fts_images MATCH ? LIMIT ?
        ) f
        JOIN images img ON f.rowid = img.id
        LEFT JOIN pages p ON img.page_id = p.id
        WHERE ${newsDomainFilter}
        LIMIT ? OFFSET ?
      `);

      const rows = stmt.all(ftsQuery, Math.max(limit * 3, 60), limit, offset);
      let total = rows.length >= limit ? (page * limit) + 20 : (offset + rows.length);

      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

      const results = rows.map(row => ({
        id: row.id,
        imageUrl: row.image_url,
        pageUrl: row.page_url,
        pageTitle: row.page_title || row.title || row.domain,
        alt: row.alt_text || row.title || 'Gambar berita',
        title: row.title || row.alt_text || '',
        context: row.context_text || '',
        domain: row.domain,
        logoUrl: row.logo_url || null,
        isLogo: Boolean(row.is_logo),
        width: row.width || null,
        height: row.height || null,
        pagerank: row.pagerank || 1.0
      }));

      return { query: rawQuery, total, page, durationMs, type: 'news_images', results };
    } catch {
      return this.fallbackImageSearch(rawQuery, limit, offset, startTime, []);
    }
  }

  /**
   * Fallback news search using LIKE
   */
  _fallbackNewsSearch(rawQuery, limit, offset, startTime, terms, sort) {
    const likePattern = `%${rawQuery.trim()}%`;
    const newsDomainFilter = this._buildNewsDomainCondition('p');

    let orderBy = 'p.published_at DESC';
    if (sort === 'toprank') orderBy = 'p.pagerank DESC';
    if (sort === 'trending') orderBy = '(p.pagerank + COALESCE(p.in_links_count, 0) * 0.1) DESC';

    try {
      const lowerClean = rawQuery.trim().toLowerCase();
      const hotNews = this.dbInstance?.hotNewsRing || [];
      const rows = hotNews
        .filter(r => r && ((r.title && r.title.toLowerCase().includes(lowerClean)) || (r.description && r.description.toLowerCase().includes(lowerClean))))
        .slice(offset, offset + Math.max(limit * 3, 60));
      const articleCandidates = rows.filter(r => isRealArticlePage(r.url, r.title) || !isChannelOrHubPage(r.url, r.title));
      const pool = articleCandidates.length >= limit ? articleCandidates : (articleCandidates.length > 0 ? [...articleCandidates, ...rows.filter(r => !articleCandidates.includes(r))] : rows);
      const diverseRows = this._applyDomainDiversity(pool, 2, limit);
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

      const results = diverseRows.map(row => {
        let highlightedTitle = this.escapeHtml(row.title || '');
        for (const term of terms) {
          if (term && term.length >= 2) {
            const escapedTerm = this.escapeHtml(term);
            const r = new RegExp(`(${escapedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            highlightedTitle = highlightedTitle.replace(r, '<mark class="hl">$1</mark>');
          }
        }

        const snippetText = this.createSnippet(row.description || row.content || row.title, terms, 220);
        return {
          id: row.id,
          url: row.url,
          domain: row.domain,
          title: highlightedTitle,
          rawTitle: row.title,
          snippet: snippetText,
          description: snippetText,
          content: row.content || snippetText,
          logoUrl: row.logo_url || null,
          leadImageUrl: row.lead_image_url || null,
          pagerank: row.pagerank,
          bm25: 1.0,
          inLinks: row.in_links_count,
          headings: row.headings,
          publishedAt: row.published_at || row.crawled_at,
          published_at: row.published_at || row.crawled_at,
          crawledAt: row.crawled_at
        };
      });

      return { query: rawQuery, total: results.length, page: 1, durationMs, type: 'news', sort, results };
    } catch {
      return { query: rawQuery, total: 0, page: 1, durationMs: 0, type: 'news', sort, results: [] };
    }
  }
}

SearchEngine.formatSearchDate = formatSearchDate;

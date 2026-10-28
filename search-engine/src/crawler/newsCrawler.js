/**
 * Dedicated Ultra-Fast & Aggressive Indonesia News Crawler
 * Focuses exclusively on 50+ Indonesian news portals & direct RSS/Atom live streams
 * Uses the SAME unified database (pages + images tables) as the main crawler
 * High-frequency cycle (every 45s) for instant breaking news ingestion
 */
import { HTTPFetcher } from './fetcher.js';
import { HTMLParser } from './parser.js';
import { getDomain } from './urlUtils.js';
import EventEmitter from 'node:events';
import { priorityGovernor } from '../indexer/governor.js';
import { TrustGatekeeper } from './trustGatekeeper.js';

// ============================================================
// DIRECT INDONESIAN RSS FEEDS — REAL-TIME BREAKING NEWS (SECONDS OLD)
// ============================================================
// DIRECT INDONESIAN & WORLD RSS FEEDS — REAL-TIME BREAKING NEWS (SECONDS OLD)
// ============================================================
const NEWS_RSS_FEEDS = [

  // CNN & CNBC Indonesia
  'https://www.cnnindonesia.com/nasional/rss',
  'https://www.cnnindonesia.com/ekonomi/rss',
  'https://www.cnnindonesia.com/teknologi/rss',
  'https://www.cnnindonesia.com/internasional/rss',
  'https://www.cnnindonesia.com/olahraga/rss',
  'https://www.cnnindonesia.com/gaya-hidup/rss',
  'https://www.cnnindonesia.com/hiburan/rss',
  'https://www.cnbcindonesia.com/news/rss',
  'https://www.cnbcindonesia.com/market/rss',
  'https://www.cnbcindonesia.com/tech/rss',
  'https://www.cnbcindonesia.com/entrepreneur/rss',
  'https://www.cnbcindonesia.com/syariah/rss',
  'https://www.cnbcindonesia.com/opini/rss',
  'https://www.cnbcindonesia.com/lifestyle/rss',

  // Antara News (Kantor Berita Nasional)
  'https://www.antaranews.com/rss/terkini.xml',
  'https://www.antaranews.com/rss/top-news.xml',
  'https://www.antaranews.com/rss/nasional.xml',
  'https://www.antaranews.com/rss/ekonomi.xml',
  'https://www.antaranews.com/rss/politik.xml',
  'https://www.antaranews.com/rss/hukum.xml',
  'https://www.antaranews.com/rss/olahraga.xml',
  'https://www.antaranews.com/rss/dunia.xml',
  'https://www.antaranews.com/rss/tekno.xml',
  'https://www.antaranews.com/rss/lifestyle.xml',
  'https://www.antaranews.com/rss/humaniora.xml',
  'https://www.antaranews.com/rss/warta-bumi.xml',

  // Tempo Media Group
  'https://tempo.co/rss/terkini',
  'https://tempo.co/rss/nasional',
  'https://tempo.co/rss/bisnis',
  'https://tempo.co/rss/tekno',
  'https://tempo.co/rss/metro',
  'https://tempo.co/rss/dunia',
  'https://tempo.co/rss/politik',
  'https://tempo.co/rss/hukum',

  // Sindonews & Okezone
  'https://nasional.sindonews.com/rss',
  'https://ekbis.sindonews.com/rss',
  'https://tekno.sindonews.com/rss',
  'https://metro.sindonews.com/rss',
  'https://international.sindonews.com/rss',
  'https://daerah.sindonews.com/rss',
  'https://news.okezone.com/rss',
  'https://economy.okezone.com/rss',
  'https://techno.okezone.com/rss',

  // Republika & Kumparan
  'https://www.republika.co.id/rss',
  'https://republika.co.id/rss/nasional',
  'https://republika.co.id/rss/ekonomi',
  'https://republika.co.id/rss/dunia-islam',
  'https://republika.co.id/rss/internasional',
  'https://kumparan.com/rss',

  // Liputan6 & Merdeka
  'https://feed.liputan6.com/rss/news',
  'https://feed.liputan6.com/rss/bisnis',
  'https://feed.liputan6.com/rss/tekno',
  'https://feed.liputan6.com/rss/global',
  'https://feed.liputan6.com/rss/peristiwa',
  'https://www.merdeka.com/feed',

  // Suara, Jawa Pos & Pikiran Rakyat
  'https://www.suara.com/rss/news',
  'https://www.suara.com/rss/bisnis',
  'https://www.suara.com/rss/tekno',
  'https://www.suara.com/rss/health',
  'https://www.jawapos.com/nasional/rss',
  'https://www.jawapos.com/ekonomi/rss',
  'https://www.jawapos.com/internasional/rss',
  'https://www.pikiran-rakyat.com/feed',

  // Disway & Media Indonesia & RRI
  'https://disway.id/rss',
  'https://mediaindonesia.com/feed',
  'https://www.rri.co.id/rss/terkini',
  'https://www.rri.co.id/rss/nasional',
  'https://www.rri.co.id/rss/daerah',
  'https://www.rri.co.id/rss/internasional',

  // Sports, Liga 1, Timnas & Bulutangkis (PSSI, PBSI, DetikSport, Bola)
  'https://sport.detik.com/sepakbola/rss',
  'https://sport.detik.com/raket/rss',
  'https://sport.detik.com/moto-gp/rss',
  'https://sport.detik.com/f1/rss',
  'https://bola.kompas.com/rss',
  'https://www.bola.net/feed/',
  'https://www.bola.com/feed',
  'https://www.antaranews.com/rss/olahraga.xml',
  'https://www.skor.id/feed',

  // BMKG, Kominfo, Setkab
  'https://www.bmkg.go.id/berita/?lang=ID&format=rss',
  'https://www.kominfo.go.id/rss/berita',
  'https://setkab.go.id/feed',

  // International News in Indonesian (Luar Negeri Bahasa Indonesia)
  'https://feeds.bbci.co.uk/indonesia/rss.xml',
  'https://rss.dw.com/xml/rss-ind-all',
  'https://www.voaindonesia.com/api/z$g$pevyiq',

  // World Major Wire & Global News (International Rapid Ingestion)
  'https://feeds.bbci.co.uk/news/world/rss.xml',
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://feeds.bbci.co.uk/news/technology/rss.xml',
  'https://feeds.bbci.co.uk/news/business/rss.xml',
  'https://www.reutersagency.com/feed/?best-topics=world&post_type=best',
  'https://www.aljazeera.com/xml/rss/all.xml',
  'http://rss.cnn.com/rss/edition_world.rss',
  'http://rss.cnn.com/rss/edition.rss',
  'https://www.theguardian.com/world/rss',
  'https://www.theguardian.com/technology/rss',
  'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
  'https://rss.dw.com/xml/rss-en-all',
  'https://www.france24.com/en/rss',
  'https://www.cnbc.com/id/100727362/device/rss/rss.html',
  'https://www.cnbc.com/id/19854910/device/rss/rss.html',
  'https://www.japantimes.co.jp/feed/',
  'https://www.straitstimes.com/news/world/rss.xml',
  'https://www.scmp.com/rss/91/feed',
  'https://www.euronews.com/rss?format=mrss&level=theme&name=news',
  'https://techcrunch.com/feed/',
  'https://www.theverge.com/rss/index.xml',
  'https://feeds.arstechnica.com/arstechnica/index',
  'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US%3Aen'
];

// ============================================================
// INDONESIA & WORLD NEWS PORTAL SEEDS (HTML SCRAPING)
// ============================================================
const NEWS_SEEDS = [
  // Detik Group (Nasional & Regional)
  'https://news.detik.com/berita',
  'https://www.detik.com/terpopuler',
  'https://finance.detik.com',
  'https://inet.detik.com',
  'https://sport.detik.com',
  'https://www.detik.com/jatim',
  'https://www.detik.com/jateng',
  'https://www.detik.com/jabar',
  'https://www.detik.com/sumut',
  'https://www.detik.com/sulsel',
  'https://www.detik.com/bali',
  'https://www.bola.net',
  'https://www.bola.com',
  'https://www.pssi.org',
  'https://ligaindonesiabaru.com',
  'https://pbsi.id',
  'https://skor.id',
  'https://www.goal.com/id',

  // Kompas Group (Nasional & Regional)
  'https://nasional.kompas.com',
  'https://www.kompas.com/tag/berita-terkini',
  'https://megapolitan.kompas.com',
  'https://regional.kompas.com',
  'https://money.kompas.com',
  'https://tekno.kompas.com',
  'https://bola.kompas.com',
  'https://surabaya.kompas.com',
  'https://bandung.kompas.com',
  'https://medan.kompas.com',
  'https://makassar.kompas.com',

  // Antara News (Kantor Berita Nasional & Biro Daerah)
  'https://www.antaranews.com/terkini',
  'https://www.antaranews.com/nasional',
  'https://www.antaranews.com/ekonomi',
  'https://www.antaranews.com/politik',
  'https://bali.antaranews.com',
  'https://jatim.antaranews.com',
  'https://jateng.antaranews.com',
  'https://jabar.antaranews.com',
  'https://sumut.antaranews.com',
  'https://papua.antaranews.com',
  'https://sulsel.antaranews.com',

  // CNN & CNBC Indonesia
  'https://www.cnnindonesia.com/nasional',
  'https://www.cnnindonesia.com/ekonomi',
  'https://www.cnnindonesia.com/teknologi',
  'https://www.cnnindonesia.com/internasional',
  'https://www.cnbcindonesia.com/news',
  'https://www.cnbcindonesia.com/market',
  'https://www.cnbcindonesia.com/tech',

  // Tempo Media Group
  'https://www.tempo.co/terkini',
  'https://nasional.tempo.co',
  'https://bisnis.tempo.co',
  'https://tekno.tempo.co',
  'https://dunia.tempo.co',

  // Tribun Network (Nasional & Regional Nusantara 38 Provinsi)
  'https://www.tribunnews.com/nasional',
  'https://www.tribunnews.com/regional',
  'https://www.tribunnews.com/bisnis',
  'https://www.tribunnews.com/metropolitan',
  'https://surabaya.tribunnews.com',
  'https://jabar.tribunnews.com',
  'https://jateng.tribunnews.com',
  'https://jogja.tribunnews.com',
  'https://makassar.tribunnews.com',
  'https://medan.tribunnews.com',
  'https://bali.tribunnews.com',
  'https://kaltim.tribunnews.com',
  'https://banjarmasin.tribunnews.com',
  'https://lampung.tribunnews.com',
  'https://palembang.tribunnews.com',
  'https://pekanbaru.tribunnews.com',
  'https://aceh.tribunnews.com',
  'https://manado.tribunnews.com',
  'https://kupang.tribunnews.com',
  'https://papua.tribunnews.com',
  'https://banten.tribunnews.com',

  // Kumparan, Liputan6, Merdeka & Suara
  'https://kumparan.com/trending',
  'https://kumparan.com/kumparannews',
  'https://www.liputan6.com/news',
  'https://www.liputan6.com/bisnis',
  'https://www.merdeka.com/peristiwa',
  'https://www.suara.com/news',
  'https://www.suara.com/bisnis',

  // Jawa Pos & Radar Regional Network
  'https://www.jawapos.com/nasional',
  'https://radarbogor.id',
  'https://radarsurabaya.jawapos.com',
  'https://radarsolo.jawapos.com',
  'https://radarsemarang.jawapos.com',
  'https://radarbandung.id',
  'https://disway.id',
  'https://harian.disway.id',

  // Pikiran Rakyat, Republika, Media Indonesia
  'https://www.pikiran-rakyat.com/nasional',
  'https://www.republika.co.id/kanal/berita/nasional',
  'https://mediaindonesia.com',

  // Ekonomi & Bisnis Terpercaya
  'https://katadata.co.id/berita',
  'https://kabar24.bisnis.com',
  'https://nasional.kontan.co.id',
  'https://investasi.kontan.co.id',

  // Media Berita Populer Lainnya
  'https://tirto.id/berita-terkini',
  'https://www.viva.co.id/berita/nasional',
  'https://www.idntimes.com/news/indonesia',
  'https://nasional.sindonews.com',
  'https://daerah.sindonews.com',
  'https://news.okezone.com',
  'https://www.inews.id/news/nasional',
  'https://www.beritasatu.com/nasional',
  'https://www.rri.co.id/nasional',
  'https://www.rri.co.id/terkini',
  'https://tvrinews.com',
  'https://elshinta.com',
  'https://www.bmkg.go.id/berita',
  'https://setkab.go.id/berita',
  'https://www.kominfo.go.id/content/berita',

  // Kantor Berita Luar Negeri (Bahasa Indonesia & Dunia)
  'https://www.bbc.com/indonesia',
  'https://www.dw.com/id',
  'https://www.voaindonesia.com',
  'https://www.reuters.com/world/',
  'https://apnews.com/world-news',
  'https://www.aljazeera.com',
  'https://edition.cnn.com/world'
];

// Known Indonesian news domains for categorization
const NEWS_DOMAIN_CATEGORIES = {
  'news.detik.com': 'nasional', 'finance.detik.com': 'ekonomi', 'inet.detik.com': 'teknologi',
  'hot.detik.com': 'hiburan', 'sport.detik.com': 'olahraga',
  'nasional.kompas.com': 'nasional', 'megapolitan.kompas.com': 'nasional',
  'money.kompas.com': 'ekonomi', 'tekno.kompas.com': 'teknologi',
  'bola.kompas.com': 'olahraga', 'entertainment.kompas.com': 'hiburan',
  'www.antaranews.com': 'nasional',
  'www.cnnindonesia.com': 'nasional', 'www.cnbcindonesia.com': 'ekonomi',
  'nasional.tempo.co': 'nasional', 'bisnis.tempo.co': 'ekonomi', 'tekno.tempo.co': 'teknologi',
  'www.tribunnews.com': 'nasional',
  'kumparan.com': 'nasional',
  'www.liputan6.com': 'nasional', 'www.merdeka.com': 'nasional',
  'www.suara.com': 'nasional', 'www.jawapos.com': 'nasional',
  'www.pikiran-rakyat.com': 'nasional',
  'www.republika.co.id': 'nasional', 'tirto.id': 'nasional',
  'katadata.co.id': 'ekonomi', 'kabar24.bisnis.com': 'ekonomi',
  'nasional.kontan.co.id': 'ekonomi', 'industri.kontan.co.id': 'ekonomi',
  'www.viva.co.id': 'nasional', 'www.idntimes.com': 'nasional',
  'nasional.sindonews.com': 'nasional', 'ekbis.sindonews.com': 'ekonomi', 'tekno.sindonews.com': 'teknologi',
  'news.okezone.com': 'nasional', 'economy.okezone.com': 'ekonomi', 'techno.okezone.com': 'teknologi',
  'www.inews.id': 'nasional', 'www.beritasatu.com': 'nasional',
  'www.rri.co.id': 'nasional', 'www.bmkg.go.id': 'nasional',
  'disway.id': 'nasional', 'mediaindonesia.com': 'nasional',
  'www.bbc.com': 'internasional', 'setkab.go.id': 'nasional', 'www.kominfo.go.id': 'nasional',
  'www.reuters.com': 'internasional', 'apnews.com': 'internasional', 'www.aljazeera.com': 'internasional'
};

// Recognized news domains (to filter search results & prioritize crawler)
const ALL_NEWS_DOMAINS = new Set([
  'detik.com', 'news.detik.com', 'finance.detik.com', 'inet.detik.com', 'hot.detik.com', 'sport.detik.com',
  'kompas.com', 'nasional.kompas.com', 'megapolitan.kompas.com', 'money.kompas.com', 'tekno.kompas.com',
  'bola.kompas.com', 'entertainment.kompas.com', 'regional.kompas.com', 'surabaya.kompas.com', 'bandung.kompas.com', 'medan.kompas.com', 'makassar.kompas.com',
  'antaranews.com', 'www.antaranews.com', 'bali.antaranews.com', 'jatim.antaranews.com', 'jateng.antaranews.com', 'jabar.antaranews.com', 'sumut.antaranews.com', 'papua.antaranews.com', 'sulsel.antaranews.com',
  'cnnindonesia.com', 'www.cnnindonesia.com',
  'cnbcindonesia.com', 'www.cnbcindonesia.com',
  'tempo.co', 'nasional.tempo.co', 'bisnis.tempo.co', 'tekno.tempo.co', 'dunia.tempo.co',
  'tribunnews.com', 'www.tribunnews.com', 'surabaya.tribunnews.com', 'jabar.tribunnews.com', 'jateng.tribunnews.com', 'jogja.tribunnews.com', 'makassar.tribunnews.com', 'medan.tribunnews.com', 'bali.tribunnews.com', 'kaltim.tribunnews.com', 'banjarmasin.tribunnews.com', 'lampung.tribunnews.com', 'palembang.tribunnews.com', 'pekanbaru.tribunnews.com', 'aceh.tribunnews.com', 'manado.tribunnews.com', 'kupang.tribunnews.com', 'papua.tribunnews.com', 'banten.tribunnews.com',
  'kumparan.com',
  'liputan6.com', 'www.liputan6.com',
  'merdeka.com', 'www.merdeka.com',
  'suara.com', 'www.suara.com',
  'jawapos.com', 'www.jawapos.com', 'radarbogor.id', 'radarsurabaya.jawapos.com', 'radarsolo.jawapos.com', 'radarsemarang.jawapos.com', 'radarbandung.id',
  'disway.id', 'harian.disway.id',
  'pikiran-rakyat.com', 'www.pikiran-rakyat.com',
  'republika.co.id', 'www.republika.co.id',
  'mediaindonesia.com', 'www.mediaindonesia.com',
  'tirto.id',
  'katadata.co.id',
  'bisnis.com', 'kabar24.bisnis.com',
  'kontan.co.id', 'nasional.kontan.co.id', 'industri.kontan.co.id', 'investasi.kontan.co.id',
  'viva.co.id', 'www.viva.co.id',
  'idntimes.com', 'www.idntimes.com',
  'sindonews.com', 'nasional.sindonews.com', 'ekbis.sindonews.com', 'tekno.sindonews.com', 'daerah.sindonews.com',
  'okezone.com', 'news.okezone.com', 'economy.okezone.com', 'techno.okezone.com',
  'inews.id', 'www.inews.id', 'jatim.inews.id', 'jabar.inews.id', 'jateng.inews.id', 'sumut.inews.id',
  'beritasatu.com', 'www.beritasatu.com',
  'rri.co.id', 'www.rri.co.id',
  'tvrinews.com', 'elshinta.com',
  'bmkg.go.id', 'www.bmkg.go.id',
  'bbc.com', 'www.bbc.com',
  'dw.com', 'www.dw.com',
  'voaindonesia.com', 'www.voaindonesia.com',
  'reuters.com', 'www.reuters.com',
  'apnews.com',
  'aljazeera.com', 'www.aljazeera.com',
  'cnn.com', 'edition.cnn.com',
  'setkab.go.id', 'kominfo.go.id', 'www.kominfo.go.id',
  'sport.detik.com', 'bola.kompas.com', 'bola.net', 'www.bola.net',
  'bola.com', 'www.bola.com', 'pssi.org', 'www.pssi.org',
  'ligaindonesiabaru.com', 'pbsi.id', 'skor.id', 'www.skor.id'
]);

export { ALL_NEWS_DOMAINS, NEWS_DOMAIN_CATEGORIES };

/**
 * NewsCrawler — Ultra-Aggressive dedicated crawler for Indonesian news
 * Ingests live RSS streams + HTML breaking news with high concurrency
 */
export class NewsCrawler extends EventEmitter {
  constructor(db, options = {}) {
    super();
    this.db = db; // Same unified database instance
    this.fetcher = new HTTPFetcher({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      timeoutMs: 6000
    });

    this.quietMode = options.quietMode ?? true;
    this.intervalMs = options.intervalMs ?? 15 * 1000;   // 15-second ultra-fast breaking news cycle
    this.concurrency = options.concurrency ?? 8;         // 8 dedicated parallel news workers
    this.maxArticlesPerRun = options.maxArticlesPerRun ?? 150; // Ingest up to 150 breaking articles per cycle
    this.running = false;
    this.stopped = false;
    this.intervalId = null;
    this.seenUrls = new Set();
    this.stats = {
      totalRuns: 0,
      lastRunAt: null,
      lastArticlesFound: 0,
      totalArticlesCrawled: 0,
      isRunning: false
    };
  }

  _markUrlSeen(url) {
    if (this.seenUrls.size >= 15000) {
      let count = 0;
      for (const u of this.seenUrls) {
        this.seenUrls.delete(u);
        if (++count >= 5000) break;
      }
    }
    this.seenUrls.add(url);
  }

  setQuietMode(enabled = true) {
    this.quietMode = !!enabled;
    return this;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.stopped = false;
    if (!this.quietMode) {
      console.log(`[NEWS-CRAWLER] ⚡ Aggressive Live News Crawler Started — ${NEWS_RSS_FEEDS.length} RSS feeds & ${NEWS_SEEDS.length} seeds every ${this.intervalMs / 1000}s (workers: ${this.concurrency})`);
    }

    // Run immediately on start
    this.runCrawlCycle();

    // High-frequency periodic polling
    this.intervalId = setInterval(() => {
      this.runCrawlCycle();
    }, this.intervalMs);
  }

  stop() {
    this.running = false;
    this.stopped = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (!this.quietMode) {
      console.log('[NEWS-CRAWLER] ⏹ Stopped');
    }
  }

  /**
   * Fast XML RSS / Atom parser for breaking news
   */
  _parseRssFeed(xmlText, feedUrl) {
    if (!xmlText || typeof xmlText !== 'string') return [];
    const items = [];
    const feedDomain = getDomain(feedUrl);

    // Extract <item> (RSS) or <entry> (Atom) blocks
    const itemRegex = /<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const block = match[0];

      // Title
      const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      if (!title || title.length < 8) continue;

      // Link
      let link = '';
      const linkMatch = block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i) ||
                        block.match(/<link[^>]*href=["']([^"']+)["']/i);
      if (linkMatch) {
        link = (linkMatch[1] || '').trim();
      }
      if (!link || !link.startsWith('http')) continue;

      // Description / Summary
      const descMatch = block.match(/<(?:description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary|content)>/i);
      const rawDesc = descMatch ? descMatch[1] : '';
      const cleanDesc = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      // Published Date
      let publishedAt = Date.now();
      const dateMatch = block.match(/<(?:pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated|dc:date)>/i);
      if (dateMatch) {
        const parsedDate = new Date(dateMatch[1].trim()).getTime();
        if (!isNaN(parsedDate) && parsedDate > 0) {
          publishedAt = parsedDate;
        }
      }

      // Lead Image / Enclosure (Comprehensive RSS / Atom image extraction)
      let imageUrl = null;
      const mediaMatch = block.match(/<media:content[^>]*\burl=["']([^"']+)["']/i) ||
                         block.match(/<media:thumbnail[^>]*\burl=["']([^"']+)["']/i) ||
                         block.match(/<enclosure[^>]*\burl=["']([^"']+)["']/i) ||
                         block.match(/<image>[^<]*<url>([^<]+)<\/url>/i) ||
                         block.match(/<img[^>]*\bsrc=["']([^"']+)["']/i);
      if (mediaMatch && mediaMatch[1]) {
        const rawUrl = mediaMatch[1].trim();
        if (rawUrl.startsWith('http') && !rawUrl.includes('favicon') && !rawUrl.includes('icon.png')) {
          imageUrl = rawUrl;
        }
      }
      if (!imageUrl && rawDesc) {
        const imgMatch = rawDesc.match(/<img[^>]*\bsrc=["']([^"']+)["']/i);
        if (imgMatch && imgMatch[1] && imgMatch[1].startsWith('http') && !imgMatch[1].includes('favicon') && !imgMatch[1].includes('icon.png')) {
          imageUrl = imgMatch[1].trim();
        }
      }
      if (!imageUrl) {
        const contentMatch = block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i);
        if (contentMatch) {
          const imgMatch = contentMatch[1].match(/<img[^>]*\bsrc=["']([^"']+)["']/i);
          if (imgMatch && imgMatch[1] && imgMatch[1].startsWith('http') && !imgMatch[1].includes('favicon') && !imgMatch[1].includes('icon.png')) {
            imageUrl = imgMatch[1].trim();
          }
        }
      }

      const domain = getDomain(link) || feedDomain;

      items.push({
        url: link,
        domain,
        title,
        description: cleanDesc.slice(0, 400),
        headings: title,
        content: cleanDesc,
        leadImageUrl: imageUrl,
        publishedAt,
        crawledAt: Date.now()
      });
    }

    return items;
  }

  async runCrawlCycle() {
    if (this.stats.isRunning) return;

    // Yield to search queries: pause news cycle if users are actively searching
    if (priorityGovernor.isPriorityActive()) {
      await priorityGovernor.waitForSearchIdle();
    }

    this.stats.isRunning = true;
    this.stats.totalRuns++;
    this.stats.lastRunAt = Date.now();

    let articlesFound = 0;
    const startTime = Date.now();
    const articleUrlsToDeepCrawl = new Set();

    const totalFrontier = NEWS_RSS_FEEDS.length + NEWS_SEEDS.length;
    if (!this.quietMode) {
      console.log(`\n[NEWS-CRAWLER] 🚀 Cycle #${this.stats.totalRuns} Started | Frontier: ${totalFrontier} feeds/seeds | Hosts: ${ALL_NEWS_DOMAINS.size}`);
    }

    this.emit('cycle_start', { run: this.stats.totalRuns });

    try {
      // ============================================================
      // PHASE 1: ULTRA-FAST RSS FEED INGESTION (BREAKING NEWS STREAM)
      // ============================================================
      const rssChunks = chunkArray(NEWS_RSS_FEEDS, this.concurrency);

      for (const chunk of rssChunks) {
        if (this.stopped) break;
        if (priorityGovernor.isPriorityActive()) {
          await priorityGovernor.waitForSearchIdle();
        }

        const rssResults = await Promise.allSettled(
          chunk.map(async (feedUrl) => {
            try {
              const res = await this.fetcher.fetch(feedUrl);
              if (!res || !res.html) return 0;

              const items = this._parseRssFeed(res.html, feedUrl);
              let savedCount = 0;

              for (const item of items) {
                // Zero-tolerance Anti-Spam Gatekeeper check
                if (TrustGatekeeper.isSpamUrl(item.url) || TrustGatekeeper.isCompromisedGovEduSpam(item.url, item.title, item.content)) {
                  continue;
                }
                if (TrustGatekeeper.isSpamTitleOrContent(item.title, item.content, item.url)) {
                  continue;
                }
                const cat = TrustGatekeeper.classifyCategory(item.url, item.domain, item.title, item.content);

                // Save directly to shared DB buffer
                this.db.savePage({
                  url: item.url,
                  domain: item.domain,
                  title: item.title,
                  description: item.description,
                  headings: item.headings,
                  content: item.content,
                  lang: (item.domain.endsWith('.id') || item.url.includes('/indonesia/') || item.url.includes('/id/')) ? 'id' : 'en',
                  logoUrl: null,
                  leadImageUrl: item.leadImageUrl,
                  category: cat || 'news',
                  trustScore: 90.0,
                  isVerifiedTrust: 1,
                  images: item.leadImageUrl ? [{
                    url: item.leadImageUrl,
                    alt_text: item.title,
                    title: item.title,
                    is_logo: 0,
                    width: 600,
                    height: 400
                  }] : [],
                  wordCount: item.content.split(/\s+/).length,
                  publishedAt: item.publishedAt,
                  crawledAt: item.crawledAt,
                  statusCode: 200,
                  latencyMs: res.latencyMs || 20,
                  outgoingLinks: []
                });

                savedCount++;

                if (!this.seenUrls.has(item.url)) {
                  this._markUrlSeen(item.url);
                  articleUrlsToDeepCrawl.add(item.url);
                }
              }

              return savedCount;
            } catch {
              return 0;
            }
          })
        );

        for (const r of rssResults) {
          if (r.status === 'fulfilled') {
            articlesFound += r.value;
          }
        }
      }

      // ============================================================
      // PHASE 2: HTML SEED PORTAL EXTRACTION
      // ============================================================
      const seedChunks = chunkArray(NEWS_SEEDS, this.concurrency);

      for (const chunk of seedChunks) {
        if (this.stopped) break;
        if (priorityGovernor.isPriorityActive()) {
          await priorityGovernor.waitForSearchIdle();
        }

        const results = await Promise.allSettled(
          chunk.map(async (seedUrl) => {
            try {
              const result = await this.fetcher.fetch(seedUrl);
              if (!result || !result.html) return [];

              await new Promise(r => setTimeout(r, 3));
              const parsed = HTMLParser.parse(result.html, seedUrl);
              if (!parsed) return [];

              const seedDomain = getDomain(seedUrl);
              const seedQuality = TrustGatekeeper.evaluateContentQuality(parsed, seedDomain);
              if (seedQuality.isSpam) return [];

              // Save seed page to unified DB
              this.db.savePage({
                url: seedUrl,
                domain: seedDomain,
                title: parsed.title || '',
                description: parsed.description || '',
                headings: parsed.headings || '',
                content: (parsed.content || '').slice(0, 5000),
                lang: parsed.lang || 'id',
                logoUrl: parsed.logoUrl || null,
                leadImageUrl: parsed.leadImageUrl || null,
                category: TrustGatekeeper.classifyCategory(seedUrl, seedDomain, parsed.title, parsed.content),
                trustScore: seedQuality.score,
                isVerifiedTrust: seedQuality.isVerifiedTrust,
                images: parsed.images || [],
                wordCount: parsed.wordCount || 0,
                publishedAt: parsed.publishedAt || Date.now(),
                crawledAt: Date.now(),
                statusCode: result.statusCode || 200,
                latencyMs: result.latencyMs || 0,
                outgoingLinks: parsed.outgoingLinks || []
              });

              const links = (parsed.outgoingLinks || [])
                .map(l => l.url)
                .filter(url => isNewsArticleUrl(url));

              return links;
            } catch {
              return [];
            }
          })
        );

        for (const r of results) {
          if (r.status === 'fulfilled' && Array.isArray(r.value)) {
            for (const url of r.value) {
              if (!this.seenUrls.has(url)) {
                this._markUrlSeen(url);
                articleUrlsToDeepCrawl.add(url);
              }
            }
          }
        }
      }

      // ============================================================
      // PHASE 3: PARALLEL DEEP CRAWL DISCOVERED BREAKING ARTICLES
      // ============================================================
      const articleList = [...articleUrlsToDeepCrawl].slice(0, this.maxArticlesPerRun);
      
      // Prioritize breaking news URLs
      articleList.sort((a, b) => {
        const isBreakingA = /terkini|breaking|live|terpopuler/i.test(a) ? 1 : 0;
        const isBreakingB = /terkini|breaking|live|terpopuler/i.test(b) ? 1 : 0;
        return isBreakingB - isBreakingA;
      });

      const articleChunks = chunkArray(articleList, this.concurrency);

      for (const chunk of articleChunks) {
        if (this.stopped) break;
        if (priorityGovernor.isPriorityActive()) {
          await priorityGovernor.waitForSearchIdle();
        }

        await Promise.allSettled(
          chunk.map(async (articleUrl) => {
            try {
              const result = await this.fetcher.fetch(articleUrl);
              if (!result || !result.html) return;

              await new Promise(r => setTimeout(r, 3));
              const parsed = HTMLParser.parse(result.html, articleUrl);
              if (!parsed || !parsed.title || parsed.title.length < 10) return;

              const domain = getDomain(articleUrl);
              // Zero-tolerance Anti-Spam Gatekeeper check
              const quality = TrustGatekeeper.evaluateContentQuality(parsed, domain);
              if (quality.isSpam) {
                return; // Silently drop gambling/porn/spam
              }

              const category = TrustGatekeeper.classifyCategory(articleUrl, domain, parsed.title, parsed.content);

              this.db.savePage({
                url: articleUrl,
                domain,
                title: parsed.title,
                description: parsed.description || '',
                headings: parsed.headings || '',
                content: (parsed.content || '').slice(0, 8000),
                lang: parsed.lang || 'id',
                logoUrl: parsed.logoUrl || null,
                leadImageUrl: parsed.leadImageUrl || null,
                category: category || 'news',
                trustScore: quality.score,
                isVerifiedTrust: quality.isVerifiedTrust,
                images: (parsed.images || []).slice(0, 2),
                wordCount: parsed.wordCount || 0,
                publishedAt: parsed.publishedAt || Date.now(),
                crawledAt: Date.now(),
                statusCode: result.statusCode || 200,
                latencyMs: result.latencyMs || 0,
                outgoingLinks: parsed.outgoingLinks || []
              });

              articlesFound++;

              this.emit('news_indexed', {
                url: articleUrl,
                domain: getDomain(articleUrl),
                title: parsed.title,
                leadImageUrl: parsed.leadImageUrl || null,
                latencyMs: result.latencyMs || 20,
                publishedAt: parsed.publishedAt || Date.now()
              });
            } catch {
              // Skip failed articles
            }
          })
        );
      }
    } catch (err) {
      console.error('[NEWS-CRAWLER] Cycle error:', err.message);
    }

    const durationMs = Date.now() - startTime;
    const durationSec = Math.max(0.1, durationMs / 1000);
    const crawlRate = articlesFound / durationSec;
    const totalPagesIndexed = this.db?.getPageCount ? this.db.getPageCount() : (this.stats.totalArticlesCrawled + articlesFound);
    const remainingFrontier = articleUrlsToDeepCrawl.size;

    this.stats.lastArticlesFound = articlesFound;
    this.stats.totalArticlesCrawled += articlesFound;
    this.stats.isRunning = false;

    this.emit('cycle_end', {
      run: this.stats.totalRuns,
      articlesFound,
      durationMs,
      crawlRate: Number(crawlRate.toFixed(1)),
      totalArticlesCrawled: this.stats.totalArticlesCrawled,
      pagesIndexed: totalPagesIndexed,
      frontierQueue: remainingFrontier,
      domainsHosts: ALL_NEWS_DOMAINS.size
    });

    if (!this.quietMode) {
      console.log(`
========================================================================================
📰 [NEWS CRAWLER METRICS DASHBOARD — CYCLE #${this.stats.totalRuns}]
  ⚡ Crawl Rate    : ${crawlRate.toFixed(1)} articles/sec
  📚 Pages Indexed : ${totalPagesIndexed.toLocaleString()} articles in Database
  🎯 Frontier Queue: ${remainingFrontier} discovered feeds/links pending
  🌐 Domains/Hosts : ${ALL_NEWS_DOMAINS.size} active news portals
  ⏱️ Cycle Duration: ${durationSec.toFixed(2)}s | Ingested: ${articlesFound} new articles
========================================================================================
`);
    }
  }

  async triggerManualCrawl() {
    return this.runCrawlCycle();
  }

  getStats() {
    return { ...this.stats };
  }
}

// ============================================================
// HELPERS
// ============================================================

function isNewsArticleUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    const pathname = parsed.pathname;

    const isNewsDomain = ALL_NEWS_DOMAINS.has(domain) ||
      [...ALL_NEWS_DOMAINS].some(d => domain.endsWith('.' + d) || domain === d);
    if (!isNewsDomain) return false;

    if (pathname === '/' || pathname === '') return false;
    if (pathname.match(/\/(tag|tags|kategori|category|topic|topics|author|profil|page|search|login|register)\//i)) return false;
    if (pathname.match(/\.(css|js|png|jpg|gif|svg|ico|woff|woff2|ttf)$/i)) return false;

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length < 2) return false;

    return true;
  } catch {
    return false;
  }
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

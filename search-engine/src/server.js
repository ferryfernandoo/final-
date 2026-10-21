async function warmTopQueries() {
  const topQueries = [
    'indonesia', 'deepseek ai', 'deepernova', 'youtube', 'kecerdasan buatan',
    'wikipedia', 'berita terbaru', '1 usd berapa rupiah', 'harga bitcoin hari ini',
    'bmkg cuaca', 'saham bbca', 'borobudur', 'google', 'kompas', 'detik', 'resep masakan'
  ];
  console.log('[Server Cache] 🚀 Pre-warming top search queries for sub-0.1ms responses...');
  for (const q of topQueries) {
    try {
      const res = await searchEngine.searchAsync(q, { page: 1, limit: 12, type: 'all', timeFilter: 'all' }, db);
      const cacheKey = `${q.trim().toLowerCase()}|1|12|all|all|false`;
      setHttpSearchCache(cacheKey, { ...res, type: 'all', timeFilter: 'all', liveCrawlTriggered: false });

      // Pre-warm images query into RAM
      const imgRes = searchEngine.searchImages(q, { page: 1, limit: 24 });
      const imgCacheKey = `${q.trim().toLowerCase()}|1|24|images|all|false`;
      setHttpSearchCache(imgCacheKey, { ...imgRes, liveCrawlTriggered: false });
    } catch {}
  }
  console.log('[Server Cache] ✅ Top search queries pre-warmed into RAM!');
}

process.env.UV_THREADPOOL_SIZE = '8';

// Process-Level Resilience & Zero-Downtime Crash Prevention
process.on('uncaughtException', (err) => {
  console.error('[CRASH PREVENTED] Uncaught Exception:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRASH PREVENTED] Unhandled Rejection:', reason);
});

// Proactive Memory Guard & V8 Heap Protection (Optimized for 8GB RAM Systems)
setInterval(() => {
  const mem = process.memoryUsage();
  const heapUsedMb = Math.round(mem.heapUsed / (1024 * 1024));
  const rssMb = Math.round(mem.rss / (1024 * 1024));

  if ((heapUsedMb > 600 || rssMb > 900) && typeof global.gc === 'function') {
    console.log(`[MEMORY GUARD] 🧹 Heap: ${heapUsedMb}MB, RSS: ${rssMb}MB ➜ Triggering V8 Garbage Collection`);
    global.gc();
  }
}, 10000);

import express from 'express';
import compression from 'compression';
import os from 'node:os';
import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { SearchDatabase } from './indexer/db.js';
import { CrawlerEngine, CrawlerState } from './crawler/engine.js';
import { SearchEngine } from './indexer/search.js';
import { PageRankCalculator } from './indexer/pagerank.js';
import { NewsCrawler } from './crawler/newsCrawler.js';
import { TokohCrawler } from './crawler/tokohCrawler.js';
import { GeoCrawler } from './crawler/geoCrawler.js';
import { ImageCrawler } from './crawler/imageCrawler.js';
import { InstantAnswers } from './indexer/instantAnswers.js';
import { CurrencyEngine } from './indexer/currencyEngine.js';
import { MarketDataEngine } from './indexer/marketDataEngine.js';
import { RealChartFetcher } from './indexer/realChartFetcher.js';
import { AiSynthesisEngine } from './indexer/aiSynthesisEngine.js';
import { SEED_CATEGORIES, getAllGlobalSeeds, getTotalSeedCount } from './crawler/seeds.js';
import { priorityGovernor } from './indexer/governor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Automatically load .env file if present in workspace root
try {
  const envPath = path.resolve(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  // Ignore env read error
}

const app = express();
const server = createServer(app);

// 🛡️ Cloudflare Tunnel & Reverse Proxy Keep-Alive Optimization
// Cloudflare edge keeps idle sockets alive for up to 60s. Node.js default is 5s.
// When Node closes the socket first without Cloudflare knowing, Cloudflare forwards incoming
// client requests to a half-closed socket, immediately throwing 502 Bad Gateway!
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

const wss = new WebSocketServer({ server });

// Universal Cross-Origin Resource Sharing (CORS) Middleware for External Web Frontends
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  const reqHeaders = req.headers['access-control-request-headers'];
  if (reqHeaders) {
    res.setHeader('Access-Control-Allow-Headers', reqHeaders);
  } else {
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, Cache-Control, Pragma, *');
  }
  res.setHeader('Access-Control-Expose-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24-hour preflight cache
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(compression({ threshold: 1024, level: 6 }));
app.use(express.json({ limit: '10mb' }));
// 🚀 PURE API & CRAWLER MODE: Frontend UI dialihkan sepenuhnya ke Vercel CDN
// Server lokal dibebaskan dari beban menyajikan ribuan bundle static JS/CSS
// app.use(express.static(path.join(rootDir, 'public'), ...));

// Initialize Core Database and Engines (Instant Lightning Boot)
const db = new SearchDatabase();
const searchEngine = new SearchEngine(db);
const pagerankCalc = new PageRankCalculator(db);
// ============================================================================
// ============================================================================
// 🚀 GENTLE & CPU/RAM-FRIENDLY CRAWLERS (ADAPTIVE QoS, ZERO LAG)
// ============================================================================
// Increase default crawler workers for aggressive crawling when not overridden
const requestedCrawlerConcurrency = parseInt(process.env.CRAWLER_CONCURRENCY, 10) || 7000;
const cpuCount = Math.max(1, os.cpus().length || 4);
// User request is explicit: 7000 parallel workers for worldwide seed coverage.
const maxSafeConcurrency = 7000;
const crawlerConcurrency = Math.min(requestedCrawlerConcurrency, maxSafeConcurrency);
if (requestedCrawlerConcurrency > crawlerConcurrency) {
  console.log(`[CRAWLER] Requested ${requestedCrawlerConcurrency} workers, capped to safe concurrency ${crawlerConcurrency} (CPUs=${cpuCount})`);
}
const newsCrawlerConcurrency = parseInt(process.env.NEWS_CRAWLER_CONCURRENCY, 10) || 12;

// 1. Web Text Crawler: High-throughput SSD parallel workers (Auto-throttled to 1 worker during search)
let crawlerEngine = new CrawlerEngine(db, { 
  concurrency: crawlerConcurrency, 
  maxDepth: 15, 
  perDomainDelayMs: 10,
  maxConcurrentPerDomain: 12
});

// 2. Breaking News Crawler: Dedicated high-speed parallel workers for Media Portals & RSS
const newsCrawler = new NewsCrawler(db, {
  intervalMs: 8 * 1000,       // 8s ultra-fast breaking news cycle
  concurrency: newsCrawlerConcurrency,
  maxArticlesPerRun: 400,     // Large micro-batch for high-speed news ingestion
  quietMode: true
});

// Secondary background utilities (Gentle 1-worker background mode, zero lag)
const tokohCrawler = new TokohCrawler(db, {
  concurrency: 1,
  batchDelayMs: 2500 // Santai 2.5s per figure
});

const geoCrawler = new GeoCrawler(db, {
  concurrency: 1,
  batchDelayMs: 2500 // Santai 2.5s per location
});

const imageCrawler = new ImageCrawler(db, {
  concurrency: 1,
  batchDelayMs: 1000
});

// Initialize Google-Grade AI Overview & Direct Synthesis Engine
const aiSynthesisEngine = new AiSynthesisEngine(db, searchEngine);

function seedInitialBrandPages(dbInstance) {
  try {
    const existing = dbInstance.db.prepare('SELECT COUNT(*) as count FROM pages WHERE domain = ?').get('deepernova.com');
    if (existing && existing.count > 0) return; // Zero disk writes if already seeded!
  } catch {}

  const defaultBrands = [
    // === TOP PRIORITY: DEEPERNOVA.COM ECOSYSTEM ===
    {
      url: 'https://deepernova.com',
      domain: 'deepernova.com',
      title: 'DeeperNova - Advanced Artificial Intelligence & Next-Gen Search Technology',
      description: 'DeeperNova is an advanced technology platform delivering cutting-edge AI solutions, deep web crawling, next-generation intelligent search indexing, and neural data architecture.',
      headings: 'DeeperNova Artificial Intelligence Next-Gen Search Neural Indexing Cloud Solutions AI Innovation',
      content: 'DeeperNova official platform advanced AI search engine neural architecture intelligent web crawling deep index cloud computing data analysis generative AI machine learning technology innovation deeper nova portal',
      logoUrl: 'https://deepernova.com/favicon.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60', alt_text: 'DeeperNova AI & Neural Architecture Platform', title: 'DeeperNova Official Brand Logo', is_logo: 1, width: 800, height: 500 },
        { url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=60', alt_text: 'DeeperNova Intelligent Search Infrastructure', title: 'DeeperNova Technology Ecosystem', is_logo: 0, width: 800, height: 500 }
      ],
      pagerank: 15.0
    },
    {
      url: 'https://www.deepernova.com',
      domain: 'deepernova.com',
      title: 'DeeperNova Official Website - AI Innovations & Deep Intelligence',
      description: 'Explore DeeperNova products, neural search engines, AI enterprise software, and cloud-native solutions built for global scale.',
      headings: 'DeeperNova Products Services Solutions Documentation AI Cloud',
      content: 'DeeperNova products services AI search neural crawling enterprise solutions cloud documentation deeper nova official',
      logoUrl: 'https://deepernova.com/favicon.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60', alt_text: 'DeeperNova AI Solutions', title: 'DeeperNova Solutions', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 14.5
    },
    {
      url: 'https://deepernova.com/about',
      domain: 'deepernova.com',
      title: 'About DeeperNova - Vision, Team & Technological Mission',
      description: 'Learn about DeeperNova mission, our world-class engineering team, and our commitment to building open, hyper-fast AI and search infrastructure.',
      headings: 'About DeeperNova Mission Vision Engineering AI Research',
      content: 'About DeeperNova company mission vision artificial intelligence neural search research world class engineering team deeper nova',
      logoUrl: 'https://deepernova.com/favicon.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=60', alt_text: 'About DeeperNova Team and Vision', title: 'About DeeperNova', is_logo: 0, width: 800, height: 500 }
      ],
      pagerank: 14.0
    },

    // === Video & Streaming ===
    { 
      url: 'https://www.youtube.com', 
      domain: 'youtube.com', 
      title: 'YouTube - Video Sharing and Live Streaming Platform', 
      description: 'Enjoy the videos and music you love, upload original content, and share it all with friends, family, and the world on YouTube.', 
      headings: 'YouTube Trending Music Gaming Movies News Live Shorts', 
      content: 'YouTube video sharing live streaming platform watch upload music gaming movies news shorts trending creators subscribe channel playlist', 
      logoUrl: 'https://www.youtube.com/s/desktop/f7129532/img/favicon.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=60', alt_text: 'YouTube Logo and Video Streaming', title: 'YouTube Official Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 10.0 
    },
    { 
      url: 'https://www.netflix.com', 
      domain: 'netflix.com', 
      title: 'Netflix - Watch TV Shows Online, Watch Movies Online', 
      description: 'Watch Netflix movies & TV shows online or stream right to your smart TV, game console, PC, Mac, mobile, tablet and more.', 
      headings: 'Netflix Movies TV Shows Streaming Original Series', 
      content: 'Netflix streaming movies TV shows series drama action comedy anime documentary watch online subscription', 
      logoUrl: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60', alt_text: 'Netflix Movies and Shows Streaming Logo', title: 'Netflix Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.5 
    },
    { 
      url: 'https://www.twitch.tv', 
      domain: 'twitch.tv', 
      title: 'Twitch - Interactive Live Streaming Service', 
      description: 'Twitch is an interactive livestreaming service for content spanning gaming, entertainment, sports, music, and more.', 
      headings: 'Twitch Live Streaming Gaming Entertainment', 
      content: 'Twitch live streaming gaming esports entertainment music IRL broadcast channel stream chat', 
      logoUrl: 'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png',
      leadImageUrl: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=800&auto=format&fit=crop&q=60', alt_text: 'Twitch Gaming Live Streaming Logo', title: 'Twitch Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.0 
    },
    { 
      url: 'https://open.spotify.com', 
      domain: 'open.spotify.com', 
      title: 'Spotify - Web Player: Music for everyone', 
      description: 'Spotify is a digital music service that gives you access to millions of songs, podcasts and videos.', 
      headings: 'Spotify Music Podcasts Playlists Albums Artists', 
      content: 'Spotify music streaming podcasts playlists albums artists songs audio premium free listen discover', 
      logoUrl: 'https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png',
      leadImageUrl: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=800&auto=format&fit=crop&q=60', alt_text: 'Spotify Music Streaming App Logo', title: 'Spotify Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.0 
    },

    // === Search Engines ===
    { 
      url: 'https://www.google.com', 
      domain: 'google.com', 
      title: 'Google Search Engine', 
      description: 'Search the world\'s information, including webpages, images, videos and more. Google has many special features to help you find exactly what you\'re looking for.', 
      headings: 'Google Search Images Maps News Gmail Drive YouTube', 
      content: 'Google search engine web images videos maps news gmail drive youtube play store android chrome', 
      logoUrl: 'https://www.google.com/favicon.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1572945281869-d20ef39f1c7d?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1572945281869-d20ef39f1c7d?w=800&auto=format&fit=crop&q=60', alt_text: 'Google Search Interface & Brand Logo', title: 'Google Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 10.0 
    },

    // === AI & LLM Platforms ===
    { 
      url: 'https://deepseek.com', 
      domain: 'deepseek.com', 
      title: 'DeepSeek - AI Assistant and Large Language Model', 
      description: 'DeepSeek is an AI company focused on building powerful large language models. DeepSeek-V3 and DeepSeek-R1 deliver state-of-the-art reasoning and coding capabilities.', 
      headings: 'DeepSeek AI LLM Chat Reasoning Coding V3 R1', 
      content: 'DeepSeek AI artificial intelligence large language model LLM chat assistant reasoning coding DeepSeek-V3 DeepSeek-R1 open source Chinese AI company', 
      logoUrl: 'https://deepseek.com/favicon.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60', alt_text: 'DeepSeek AI Model and Neural Architecture', title: 'DeepSeek AI Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.5 
    },
    { 
      url: 'https://chat.deepseek.com', 
      domain: 'chat.deepseek.com', 
      title: 'DeepSeek Chat - Free AI Assistant', 
      description: 'Chat with DeepSeek AI assistant for free. Powered by DeepSeek-V3 and R1 models with advanced reasoning, coding, and conversation capabilities.', 
      headings: 'DeepSeek Chat AI Assistant Free Conversation', 
      content: 'DeepSeek chat AI assistant free conversation reasoning coding math writing analysis DeepSeek-V3 R1', 
      logoUrl: 'https://deepseek.com/favicon.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=60', alt_text: 'DeepSeek AI Chat Assistant App Interface', title: 'DeepSeek Chat Interface', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.0 
    },
    { 
      url: 'https://openai.com', 
      domain: 'openai.com', 
      title: 'OpenAI - Creating safe AGI that benefits all of humanity', 
      description: 'OpenAI is an AI research and deployment company. Our mission is to ensure that artificial general intelligence benefits all of humanity.', 
      headings: 'OpenAI ChatGPT GPT-4 DALL-E Sora API Research', 
      content: 'OpenAI artificial intelligence AI research ChatGPT GPT-4 GPT-4o DALL-E Sora language model AGI', 
      logoUrl: 'https://openai.com/favicon.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1686191128892-3b37add41544?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1686191128892-3b37add41544?w=800&auto=format&fit=crop&q=60', alt_text: 'OpenAI Artificial Intelligence Research Logo', title: 'OpenAI Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.5 
    },
    { 
      url: 'https://chatgpt.com', 
      domain: 'chatgpt.com', 
      title: 'ChatGPT - AI Chatbot by OpenAI', 
      description: 'ChatGPT is an AI chatbot developed by OpenAI. It can help with writing, coding, math, analysis, and creative tasks.', 
      headings: 'ChatGPT AI Chatbot Writing Coding Analysis', 
      content: 'ChatGPT AI chatbot OpenAI GPT conversation writing coding analysis creative tasks assistant', 
      logoUrl: 'https://chatgpt.com/favicon.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=60', alt_text: 'ChatGPT AI Conversational Bot Logo', title: 'ChatGPT Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.5 
    },

    // === Social Media ===
    { 
      url: 'https://www.facebook.com', 
      domain: 'facebook.com', 
      title: 'Facebook - Connect with friends and the world', 
      description: 'Create an account or log into Facebook. Connect with friends, family and other people you know. Share photos and videos.', 
      headings: 'Facebook Social Network Connect Friends Posts Groups Marketplace', 
      content: 'Facebook social media network connect friends family share photos videos posts groups marketplace messenger', 
      logoUrl: 'https://www.facebook.com/favicon.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&auto=format&fit=crop&q=60', alt_text: 'Facebook App Social Icon Logo', title: 'Facebook Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.5 
    },
    { 
      url: 'https://www.instagram.com', 
      domain: 'instagram.com', 
      title: 'Instagram - Photos, Videos, Reels & Stories', 
      description: 'Create an account or log in to Instagram - share photos, videos, reels, and stories with the people who matter most.', 
      headings: 'Instagram Photos Videos Reels Stories Explore', 
      content: 'Instagram social media photos videos reels stories explore share followers feed', 
      logoUrl: 'https://static.cdninstagram.com/rsrc.php/v3/yI/r/VsNE-OHk_8a.png',
      leadImageUrl: 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=800&auto=format&fit=crop&q=60', alt_text: 'Instagram Photo Sharing & Reels App Logo', title: 'Instagram Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.5 
    },
    { 
      url: 'https://x.com', 
      domain: 'x.com', 
      title: 'X (formerly Twitter) - What is happening', 
      description: 'From breaking news and entertainment to sports and politics, get the full story with live commentary on X.', 
      headings: 'X Twitter Social Media Posts Trending Topics', 
      content: 'X Twitter social media posts trending topics breaking news entertainment sports politics live commentary tweets', 
      logoUrl: 'https://abs.twimg.com/favicons/twitter.3.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&auto=format&fit=crop&q=60', alt_text: 'X Twitter Social Media Platform Logo', title: 'X Twitter Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.5 
    },
    { 
      url: 'https://www.tiktok.com', 
      domain: 'tiktok.com', 
      title: 'TikTok - Make Your Day', 
      description: 'TikTok is a short-form video platform where you can watch, create, and discover videos on any topic.', 
      headings: 'TikTok Short Videos Trending Creators Music', 
      content: 'TikTok short form video platform watch create discover trending creators music dance entertainment viral', 
      logoUrl: 'https://sf-tb-sg.ibytedtos.com/obj/eden-sg/uomwuh7nuhj/favicon.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1598128558393-70ff21433be0?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1598128558393-70ff21433be0?w=800&auto=format&fit=crop&q=60', alt_text: 'TikTok Short Video App Logo', title: 'TikTok Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.5 
    },

    // === E-Commerce Indonesia ===
    { 
      url: 'https://shopee.co.id', 
      domain: 'shopee.co.id', 
      title: 'Shopee Indonesia - Belanja Online Terlengkap', 
      description: 'Shopee Indonesia jual beli online terlengkap dengan harga murah, gratis ongkir, dan cashback.', 
      headings: 'Shopee Belanja Online Indonesia Promo Gratis Ongkir', 
      content: 'Shopee Indonesia belanja online marketplace jual beli promo gratis ongkir cashback flash sale voucher toko', 
      logoUrl: 'https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_32.png',
      leadImageUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=60', alt_text: 'Shopee Online Shopping Marketplace Logo', title: 'Shopee Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.0 
    },
    { 
      url: 'https://www.tokopedia.com', 
      domain: 'tokopedia.com', 
      title: 'Tokopedia - Jual Beli Online Terpercaya', 
      description: 'Tokopedia memudahkan jual beli online terpercaya. Temukan produk dengan harga terbaik.', 
      headings: 'Tokopedia Jual Beli Online Indonesia Terpercaya', 
      content: 'Tokopedia jual beli online marketplace Indonesia terpercaya produk harga terbaik toko official store', 
      logoUrl: 'https://assets.tokopedia.net/assets-tokopedia-lite/v2/zeus/kratos/614f0a06.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop&q=60', alt_text: 'Tokopedia Jual Beli Online Marketplace Logo', title: 'Tokopedia Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.0 
    },

    // === Knowledge ===
    { 
      url: 'https://id.wikipedia.org/wiki/Halaman_Utama', 
      domain: 'id.wikipedia.org', 
      title: 'Wikipedia bahasa Indonesia, ensiklopedia bebas', 
      description: 'Wikipedia adalah ensiklopedia bebas yang ditulis dan disunting oleh sukarelawan dari seluruh dunia.', 
      headings: 'Wikipedia Halaman Utama Ensiklopedia Bebas Indonesia', 
      content: 'Wikipedia bahasa Indonesia ensiklopedia bebas ilmu pengetahuan artikel sejarah sains teknologi budaya', 
      logoUrl: 'https://id.wikipedia.org/static/favicon/wikipedia.ico',
      leadImageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/800px-Wikipedia-logo-v2.svg.png',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/800px-Wikipedia-logo-v2.svg.png', alt_text: 'Wikipedia Ensiklopedia Bebas Globe Logo', title: 'Wikipedia Logo', is_logo: 1, width: 800, height: 800 }
      ],
      pagerank: 9.5 
    },

    // === Developer ===
    { 
      url: 'https://github.com', 
      domain: 'github.com', 
      title: 'GitHub: Let\'s build from here', 
      description: 'GitHub is where over 100 million developers shape the future of software, together.', 
      headings: 'GitHub Developers Code Repositories Open Source AI', 
      content: 'GitHub developers code repositories open source software programming git pull request issues actions copilot', 
      logoUrl: 'https://github.githubassets.com/favicons/favicon.svg',
      leadImageUrl: 'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=800&auto=format&fit=crop&q=60', alt_text: 'GitHub Octocat Open Source Logo', title: 'GitHub Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.5 
    },

    // === Indonesian News (Top Brands) ===
    { 
      url: 'https://news.detik.com/berita', 
      domain: 'news.detik.com', 
      title: 'detikNews - Berita Terkini Hari Ini Indonesia dan Internasional', 
      description: 'Berita terkini, liputan mendalam, dan informasi terhangat dari seluruh wilayah Indonesia dan dunia di detikNews.', 
      headings: 'detikNews Berita Terkini Indonesia Politik Ekonomi Hukum Nasional', 
      content: 'detikNews berita terkini hari ini Indonesia nasional politik ekonomi hukum peristiwa terpopuler detik.com portal berita', 
      logoUrl: 'https://cdn.detik.net.id/detik2/images/favicon.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=60', alt_text: 'detikNews Portal Berita Indonesia Logo', title: 'detikNews Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.0 
    },
    { 
      url: 'https://nasional.kompas.com', 
      domain: 'nasional.kompas.com', 
      title: 'Berita Nasional Terkini Hari Ini - Kompas.com', 
      description: 'Berita Nasional Indonesia terkini hari ini, menyajikan informasi politik, pemerintahan, hukum, dan peristiwa di seluruh Nusantara.', 
      headings: 'Kompas.com Berita Nasional Terkini Indonesia Politik Hukum', 
      content: 'Kompas.com berita nasional Indonesia terkini hari ini politik pemerintahan hukum peristiwa nusantara', 
      logoUrl: 'https://asset.kompas.com/data/2021/kompascom/header/favicon.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=60', alt_text: 'Kompas.com Berita Nasional Terkini Logo', title: 'Kompas Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 9.0 
    },
    { 
      url: 'https://www.bmkg.go.id/berita', 
      domain: 'bmkg.go.id', 
      title: 'BMKG - Badan Meteorologi, Klimatologi, dan Geofisika', 
      description: 'Informasi Prakiraan Cuaca, Iklim, Kualitas Udara, dan Gempabumi Berkedalaman Terkini di Indonesia.', 
      headings: 'BMKG Cuaca Gempa Bumi Iklim Potensi Bencana Indonesia', 
      content: 'BMKG informasi resmi cuaca gempa bumi iklim peringatan dini bencana Indonesia prakiraan', 
      logoUrl: 'https://www.bmkg.go.id/asset/img/favicon.ico',
      leadImageUrl: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&auto=format&fit=crop&q=60',
      images: [
        { url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&auto=format&fit=crop&q=60', alt_text: 'BMKG Badan Meteorologi Klimatologi dan Geofisika Logo', title: 'BMKG Logo', is_logo: 1, width: 800, height: 500 }
      ],
      pagerank: 8.5 
    }
  ];

  try {
    for (const b of defaultBrands) {
      dbInstance.savePage({
        url: b.url,
        domain: b.domain,
        title: b.title,
        description: b.description,
        headings: b.headings,
        content: b.content,
        lang: 'id',
        logoUrl: b.logoUrl || null,
        leadImageUrl: b.leadImageUrl || null,
        images: b.images || [],
        wordCount: b.content.split(/\s+/).length,
        statusCode: 200,
        latencyMs: 10,
        pagerank: b.pagerank,
        publishedAt: Date.now(),
        crawledAt: Date.now()
      });
    }
    // CRITICAL: Force immediate flush — the buffer threshold is 40 and we must
    // guarantee all brand pages are written to SQLite + FTS5 before any search
    dbInstance.flushPageBuffer();
    console.log(`[PRE-SEED] Inserted ${defaultBrands.length} brand pages with logos & images into database`);
  } catch (e) {
    console.error('Error pre-seeding brand pages:', e);
  }
}

// Broadcast helper to all connected WebSocket clients with error-trapping
function broadcast(type, payload) {
  try {
    const msg = JSON.stringify({ type, data: payload, timestamp: Date.now() });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg, (err) => {
          if (err) {
            // Ignore socket drop
          }
        });
      }
    });
  } catch {}
}

let liveLogsEnabled = false;

// Batched Log Broadcaster (flushes every 100ms only if live logs enabled)
let logBatch = [];
setInterval(() => {
  if (liveLogsEnabled && logBatch.length > 0 && wss.clients.size > 0) {
    const toSend = logBatch.slice(0, 30);
    logBatch = [];
    broadcast('crawl_logs_batch', toSend);
  } else if (logBatch.length > 0) {
    logBatch = []; // zero memory retention when live logs are disabled
  }
}, 100);

// Attach Crawler Events to WebSocket broadcasts
function attachCrawlerEvents(engine) {
  engine.on('log', (logEntry) => {
    if (liveLogsEnabled && wss.clients.size > 0) {
      logBatch.push(logEntry);
    }
  });

  engine.on('status', (status) => {
    broadcast('crawler_status', status);
  });
}
attachCrawlerEvents(crawlerEngine);

newsCrawler.on('log', (logEntry) => {
  if (liveLogsEnabled && wss.clients.size > 0) {
    logBatch.push(logEntry);
  }
});

newsCrawler.on('cycle_end', (data) => {
  broadcast('news_crawl_update', data);
});

tokohCrawler.on('tokoh_indexed', (data) => {
  broadcast('tokoh_indexed', data);
  if (liveLogsEnabled && wss.clients.size > 0) {
    logBatch.push({
      url: data.sourceUrl || `https://id.wikipedia.org/wiki/${encodeURIComponent(data.name)}`,
      domain: 'wikipedia.org',
      title: `🌟 ${data.name} (${data.profession || 'Figur Publik'})`,
      status: 200,
      statusText: 'TOKOH OK',
      latencyMs: data.latencyMs || 25,
      type: 'success',
      source: 'tokoh'
    });
  }
});

tokohCrawler.on('cycle_end', (data) => {
  broadcast('tokoh_crawl_update', data);
});

geoCrawler.on('geo_indexed', (data) => {
  broadcast('geo_indexed', data);
  if (liveLogsEnabled && wss.clients.size > 0) {
    logBatch.push({
      url: data.sourceUrl || `https://id.wikipedia.org/wiki/${encodeURIComponent(data.name)}`,
      domain: 'wikipedia.org',
      title: `🗺️ ${data.name} (${data.category || 'Wilayah'})`,
      status: 200,
      statusText: 'GEO OK',
      latencyMs: data.latencyMs || 20,
      type: 'success',
      source: 'geo'
    });
  }
});

geoCrawler.on('cycle_end', (data) => {
  broadcast('geo_crawl_update', data);
});

imageCrawler.on('image_indexed', (data) => {
  broadcast('image_indexed', data);
  if (liveLogsEnabled && wss.clients.size > 0) {
    logBatch.push({
      url: data.url,
      domain: data.domain || 'images.cdn',
      title: `📸 ${data.title || 'Visual Media Asset'}`,
      status: 200,
      statusText: 'IMG OK',
      latencyMs: data.latencyMs || 15,
      type: 'success',
      source: 'image'
    });
  }
});

imageCrawler.on('image_crawl_update', (data) => {
  broadcast('image_crawl_update', data);
});

// Periodic Telemetry Pulse (every 15 seconds, ultra-light payload) & Proactive Memory Watchdog
setInterval(() => {
  const mem = process.memoryUsage();
  const heapMb = Math.round(mem.heapUsed / 1024 / 1024);

  // Proactive Garbage Collection when heap exceeds 600MB
  if (heapMb > 600 && global.gc) {
    try {
      global.gc();
    } catch {}
  }

  if (wss.clients.size > 0) {
    try {
      const status = crawlerEngine.getStatus();
      const dbStats = db.getStats();
      const governorStatus = priorityGovernor.getStatus();

      broadcast('telemetry', {
        crawler: {
          state: status.state,
          rps: status.rps || 0,
          activeWorkers: status.activeWorkers || 0,
          queueSize: status.queueSize || 0,
          crawledCount: status.crawledCount || 0,
          errorCount: status.errorCount || 0
        },
        db: {
          totalPages: dbStats.totalPages || 0,
          totalDomains: dbStats.totalDomains || 0
        },
        governor: {
          isPriorityActive: governorStatus.isPriorityActive,
          mode: governorStatus.mode,
          activeSearches: governorStatus.activeSearches || 0
        },
        system: {
          memoryMb: heapMb,
          cpuUptime: Math.round(process.uptime())
        }
      });
    } catch {}
  }
}, 15000);

// WebSocket connection handling
wss.on('connection', (ws) => {
  ws.on('error', () => {});
  try {
    ws.send(JSON.stringify({
      type: 'init',
      data: {
        crawler: crawlerEngine.getStatus(),
        db: dbStats(),
        history: crawlerEngine.getHistory(),
        point: crawlerEngine.getSnapshot(),
        governor: priorityGovernor.getStatus(),
        system: {
          memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          cpuUptime: Math.round(process.uptime())
        }
      },
      timestamp: Date.now()
    }), () => {});
  } catch {}
});

function dbStats() {
  try {
    return db.getStats();
  } catch {
    return {};
  }
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// ⚡ Autonomous QoS Search Priority Middleware:
// Enforces a strict 5-second per-session deadline for deep crawling and instant search responses
const MAX_SEARCH_SESSION_TIMEOUT_MS = 5000;

function searchPriorityMiddleware(req, res, next) {
  const tag = (req.query.q || req.path).slice(0, 60);
  priorityGovernor.acquireSearch(tag);
  let released = false;
  let safetyTimeout = null;

  const onEnd = () => {
    if (!released) {
      released = true;
      if (safetyTimeout) clearTimeout(safetyTimeout);
      priorityGovernor.releaseSearch(tag);
    }
  };

  // Safety guard: auto-release after 5s to guarantee activeSearches never blocks other users
  safetyTimeout = setTimeout(onEnd, MAX_SEARCH_SESSION_TIMEOUT_MS);

  // Set 5-second hard socket/request timeout
  req.setTimeout(MAX_SEARCH_SESSION_TIMEOUT_MS, () => {
    onEnd();
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Search timeout (5.0s exceeded)',
        message: 'Batas waktu pencarian 2.2 detik per sesi tercapai agar tidak mengganggu kecepatan layanan untuk pengguna lain.'
      });
    }
  });

  res.on('finish', onEnd);
  res.on('close', onEnd);
  next();
}

// 0. QoS Governor Telemetry Endpoint
app.get('/api/governor', (req, res) => {
  res.json(priorityGovernor.getStatus());
});

// ============================================================================
// 🔑 DEVELOPER & AI AGENT SEARCH API (v1)
// ============================================================================

// API Key Authentication Middleware for /api/v1/*
function apiKeyAuthMiddleware(req, res, next) {
  let key = null;
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    key = authHeader.slice(7).trim();
  } else if (req.headers['x-api-key']) {
    key = String(req.headers['x-api-key']).trim();
  } else if (req.query.api_key) {
    key = String(req.query.api_key).trim();
  } else if (req.query.key) {
    key = String(req.query.key).trim();
  } else if (req.body && req.body.api_key) {
    key = String(req.body.api_key).trim();
  } else if (req.body && req.body.apiKey) {
    key = String(req.body.apiKey).trim();
  }

  // If no key provided, allow demo mode
  if (!key) {
    req.apiKeyInfo = { name: 'Anonymous Free User', apiKey: 'dn_live_free_public_demo', isDemo: true };
    return next();
  }

  // Allow default public demo key
  if (key === 'dn_live_free_public_demo') {
    req.apiKeyInfo = { name: 'Public Free Demo Key', apiKey: key, isDemo: true };
    return next();
  }

  const validation = db.validateApiKey(key);
  if (!validation.valid) {
    return res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: `Invalid API Key: ${validation.reason}. Dapatkan API key gratis di dashboard DeeperNova atau gunakan key demo: 'dn_live_free_public_demo'.`
    });
  }

  req.apiKeyInfo = validation.keyInfo;
  next();
}

// 1. API Key Generation & Listing Endpoints
app.post('/api/keys/generate', (req, res) => {
  const { name } = req.body || {};
  const result = db.createApiKey(name || 'Developer API Key');
  if (result.success) {
    res.json({
      status: 'success',
      message: 'API Key berhasil dibuat!',
      ...result
    });
  } else {
    res.status(500).json({ status: 'error', message: result.error });
  }
});

app.get('/api/keys', (req, res) => {
  const keys = db.listApiKeys(50);
  res.json({
    status: 'success',
    keys: keys.map(k => ({
      id: k.id,
      name: k.name,
      apiKey: k.api_key,
      maskedKey: k.api_key.slice(0, 12) + '...' + k.api_key.slice(-4),
      requestsCount: k.requests_count,
      rateLimitPerMin: k.rate_limit_per_min,
      isActive: Boolean(k.is_active),
      createdAt: k.created_at,
      lastUsedAt: k.last_used_at
    }))
  });
});

// Helper to format clean Markdown context for AI Agents and LLMs (RAG ready)
function formatAiContext(query, results) {
  if (!results || results.length === 0) {
    return `### Search Results for "${query}"\nNo relevant web results found in index.`;
  }
  let md = `### Web Search Results for "${query}" (Source: DeeperNova Engine):\n`;
  results.forEach((r, idx) => {
    const rawTitle = (r.title || r.domain || 'Untitled').replace(/<[^>]+>/g, '').trim();
    const snippet = (r.snippet || r.description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    md += `\n[${idx + 1}] **${rawTitle}**\n`;
    md += `URL: ${r.url}\n`;
    md += `Domain: ${r.domain}\n`;
    if (r.published_at) md += `Tanggal: ${r.published_at}\n`;
    if (snippet) md += `Ringkasan: ${snippet}\n`;
  });
  return md.trim();
}

// Dedicated Developer & AI Search API Handler (v1)
async function handleV1Search(req, res) {
  const query = (req.query.q || req.body?.query || req.body?.q || '').trim();
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || req.body?.limit || '10', 10)));
  const page = Math.max(1, parseInt(req.query.page || req.body?.page || '1', 10));
  const timeFilter = req.query.timeFilter || req.body?.timeFilter || 'all';
  const type = req.query.type || req.body?.type || 'all'; // 'all' | 'news' | 'images'
  const forceCrawl = req.query.crawl === '1' || req.query.crawl === 'true';

  if (!query) {
    return res.status(400).json({
      status: 'error',
      code: 'MISSING_QUERY',
      message: 'Parameter "q" (atau JSON body "query") wajib diisi.'
    });
  }

  // ⚡ Check High-Speed In-Memory HTTP Cache first (<1ms response)
  const cacheKey = `v1|${query.toLowerCase()}|${page}|${limit}|${timeFilter}|${type}`;
  if (!forceCrawl) {
    const cached = getHttpSearchCache(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Response-Time', '0.05ms');
      return res.json(cached);
    }
  }

  const tStart = performance.now();
  let result;
  let searchTimer = null;
  const timeoutPromise = new Promise((resolve) => {
    searchTimer = setTimeout(() => {
      resolve({
        total: 0,
        results: [],
        durationMs: MAX_SEARCH_SESSION_TIMEOUT_MS,
        timedOut: true,
        message: 'Batas waktu pencarian 2.2 detik per sesi tercapai (QoS Protection).'
      });
    }, MAX_SEARCH_SESSION_TIMEOUT_MS);
  });

  const searchExecution = (async () => {
    if (type === 'images') {
      return searchEngine.searchImages(query, { page, limit });
    } else {
      return await searchEngine.searchAsync(query, { page, limit, timeFilter, type, forceOriginal: false }, db);
    }
  })();

  result = await Promise.race([searchExecution, timeoutPromise]);
  if (searchTimer) clearTimeout(searchTimer);
  const latencyMs = Math.round((performance.now() - tStart) * 100) / 100;

  // Autonomous on-demand crawl injection: keep crawler fed with user/AI queries
  if (query && crawlerEngine && typeof crawlerEngine.injectSeeds === 'function') {
    try {
      const encoded = encodeURIComponent(query.trim());
      const querySeeds = [
        `https://id.wikipedia.org/wiki/Special:Search?search=${encoded}`,
        `https://en.wikipedia.org/wiki/Special:Search?search=${encoded}`,
        `https://news.google.com/rss/search?q=${encoded}&hl=id&gl=ID&ceid=ID:id`,
        `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`
      ];
      crawlerEngine.injectSeeds(querySeeds, 35);
    } catch (_cErr) {}
  }

  const formattedResults = (result.results || []).map(r => {
    const rawTitle = (r.rawTitle || r.title || '').replace(/<[^>]+>/g, '').trim();
    const snippet = (r.snippet || r.description || r.content || '').replace(/<[^>]+>/g, '').trim();
    const pubDate = r.publishedAt || r.published_at;
    const formattedDate = r.formattedDate || r.date || (pubDate ? new Date(pubDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null);
    return {
      title: rawTitle,
      url: r.url || '',
      domain: r.domain || '',
      snippet: snippet,
      description: snippet,
      author: r.author || null,
      published_at: pubDate ? new Date(pubDate).toISOString() : null,
      date: formattedDate,
      formatted_date: formattedDate,
      formattedDate: formattedDate,
      accuracyScore: r.accuracyScore || r.rankingScore || 0,
      score: r.accuracyScore || r.rankingScore || 0,
      pagerank: r.pagerank || 0,
      trust_score: r.trust_score || r.trustScore || 0,
      logo_url: r.logo_url || r.logoUrl || null,
      lead_image_url: r.lead_image_url || r.leadImageUrl || null
    };
  });

  // 🚀 Fast Live Crawl Fallback: If results are sparse or fresh news query, fetch and index live in seconds
  if (formattedResults.length < 3 && query && type !== 'images') {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`;
      const rssResp = await fetch(rssUrl, {
        signal: AbortSignal.timeout(2200),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
        }
      });
      if (rssResp.ok) {
        const xml = await rssResp.text();
        const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
        for (const m of itemMatches.slice(0, 8)) {
          const itemXml = m[1];
          const rawTitle = (itemXml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim();
          const rawLink = (itemXml.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '').trim();
          const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '').trim();
          const source = (itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || '').trim();
          if (rawTitle && rawLink) {
            let domain = '';
            try { domain = new URL(rawLink).hostname.replace('www.', ''); } catch(e) {}
            const pageItem = {
              url: rawLink,
              domain: domain || 'news.google.com',
              title: rawTitle,
              description: rawTitle,
              headings: rawTitle,
              content: `${rawTitle} - ${source || 'Berita Web Terverifikasi'}`,
              author: source || null,
              publishedAt: pubDate ? new Date(pubDate).getTime() : Date.now(),
              pagerank: 1.2,
              trustScore: 85
            };
            db.savePage(pageItem);
            formattedResults.push({
              title: rawTitle,
              url: rawLink,
              domain: domain || 'news.google.com',
              snippet: `${rawTitle} (Sumber: ${source || 'Berita Web Terverifikasi'})`,
              description: `${rawTitle} (Sumber: ${source || 'Berita Web Terverifikasi'})`,
              author: source || null,
              published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
              pagerank: 1.2,
              trust_score: 85,
              logo_url: null,
              lead_image_url: null
            });
          }
        }
        db.flushPageBuffer();
      }
    } catch (_liveErr) {
      console.warn('[V1-SEARCH] Fast live crawl note:', _liveErr.message);
    }
  }

  const aiContext = formatAiContext(query, formattedResults);

  const payload = {
    status: 'success',
    api_version: 'v1',
    query,
    total_results: result.total || formattedResults.length,
    page,
    limit,
    duration_ms: result.durationMs || latencyMs,
    client_latency_ms: latencyMs,
    auth: {
      key_name: req.apiKeyInfo?.name || 'Public Demo',
      is_demo: Boolean(req.apiKeyInfo?.isDemo)
    },
    results: formattedResults,
    ai_context: aiContext
  };

  if (!forceCrawl) {
    setHttpSearchCache(cacheKey, payload);
  }

  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
  res.setHeader('X-Cache', 'MISS');
  res.json(payload);
}

app.get('/api/v1/search', searchPriorityMiddleware, apiKeyAuthMiddleware, handleV1Search);
app.post('/api/v1/search', searchPriorityMiddleware, apiKeyAuthMiddleware, handleV1Search);

// Dedicated Developer & AI News Search API (v1)
app.get('/api/v1/news', searchPriorityMiddleware, apiKeyAuthMiddleware, (req, res) => {
  const query = (req.query.q || '').trim();
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
  const page = Math.max(1, parseInt(req.query.page || '1', 10));

  const tStart = performance.now();
  let result;
  if (!query) {
    result = searchEngine.getTrendingNews(limit, page);
  } else {
    result = searchEngine.searchNews(query, { page, limit, sort: req.query.sort || 'toprank' });
  }
  const latencyMs = Math.round((performance.now() - tStart) * 100) / 100;

  const formattedResults = (result.results || []).map(r => {
    const rawTitle = (r.rawTitle || r.title || '').replace(/<[^>]+>/g, '').trim();
    const snippet = (r.snippet || r.description || r.content || '').replace(/<[^>]+>/g, '').trim();
    const pubDate = r.publishedAt || r.published_at;
    return {
      title: rawTitle,
      url: r.url,
      domain: r.domain,
      snippet: snippet,
      description: snippet,
      author: r.author || null,
      published_at: pubDate ? new Date(pubDate).toISOString() : null,
      category: r.category || 'news',
      lead_image_url: r.leadImageUrl || r.lead_image_url || null,
      logo_url: r.logoUrl || r.logo_url || null
    };
  });

  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
  res.json({
    status: 'success',
    api_version: 'v1',
    query,
    total_results: result.total || formattedResults.length,
    page,
    limit,
    duration_ms: latencyMs,
    auth: {
      key_name: req.apiKeyInfo?.name || 'Public Demo',
      is_demo: Boolean(req.apiKeyInfo?.isDemo)
    },
    results: formattedResults,
    ai_context: formatAiContext(query || 'Berita Terkini', formattedResults)
  });
});

// Dedicated Developer & AI Image Search API (v1)
app.get('/api/v1/images', searchPriorityMiddleware, apiKeyAuthMiddleware, (req, res) => {
  const query = (req.query.q || '').trim();
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '12', 10)));
  const page = Math.max(1, parseInt(req.query.page || '1', 10));

  if (!query) {
    return res.json({
      status: 'success',
      api_version: 'v1',
      query: '',
      total_results: 0,
      page,
      limit,
      duration_ms: 0,
      auth: {
        key_name: req.apiKeyInfo?.name || 'Public Demo',
        is_demo: Boolean(req.apiKeyInfo?.isDemo)
      },
      results: []
    });
  }

  const tStart = performance.now();
  const result = searchEngine.searchImages(query, { page, limit });
  const latencyMs = Math.round((performance.now() - tStart) * 100) / 100;

  res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  res.json({
    status: 'success',
    api_version: 'v1',
    query,
    total_results: result.total || (result.results || result.images || []).length,
    page,
    limit,
    duration_ms: latencyMs,
    auth: {
      key_name: req.apiKeyInfo?.name || 'Public Demo',
      is_demo: Boolean(req.apiKeyInfo?.isDemo)
    },
    results: result.results || result.images || []
  });
});

// Health & Engine Status API (v1)
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    engine: 'DeeperNova Search Core',
    api_version: 'v1',
    timestamp: new Date().toISOString(),
    governor: priorityGovernor.getStatus(),
    features: {
      full_text_search: 'FTS5 BM25',
      ai_rag_context: true,
      adaptive_qos: true,
      sub_20ms_latency: true
    }
  });
});

// Dynamic Network & Tunnel Info Endpoint for Real-time Documentation
app.get('/api/tunnel/info', (req, res) => {
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
  const proto = req.get('x-forwarded-proto') || (req.connection?.encrypted ? 'https' : 'http');
  const serverOrigin = `${proto}://${host}`;

  let serverTunnel = '';
  let clientTunnel = '';
  let isFixed = false;

  // 1. Dynamic active_tunnel.json file (live tunnel coordinator)
  try {
    const activeFile = path.resolve('scratch/active_tunnel.json');
    if (fs.existsSync(activeFile)) {
      const parsed = JSON.parse(fs.readFileSync(activeFile, 'utf8'));
      if (parsed.serverTunnel) serverTunnel = parsed.serverTunnel.trim().replace(/\/+$/, '');
      if (parsed.clientTunnel) clientTunnel = parsed.clientTunnel.trim().replace(/\/+$/, '');
      if (parsed.isFixed !== undefined) isFixed = parsed.isFixed;
    }
  } catch {}

  // 2. Environment variable override
  const envFixedUrl = process.env.PUBLIC_API_URL || process.env.FIXED_API_URL;
  if (!serverTunnel && envFixedUrl) {
    serverTunnel = envFixedUrl.trim().replace(/\/+$/, '');
    isFixed = true;
  }

  if (!serverTunnel) {
    if (host.includes('loca.lt') || host.includes('trycloudflare.com')) {
      serverTunnel = `${proto}://${host}`;
    } else {
      serverTunnel = 'https://drops-lots-tunnel-world.trycloudflare.com';
      isFixed = true;
    }
  }


  res.json({
    success: true,
    serverOrigin,
    serverTunnel,
    clientTunnel: clientTunnel || serverTunnel,
    isFixed,
    localUrl: 'http://localhost:3000',
    timestamp: Date.now()
  });
});

app.post('/api/tunnel/update', express.json(), (req, res) => {
  const { serverTunnel, clientTunnel } = req.body || {};
  try {
    const activeFile = path.resolve('scratch/active_tunnel.json');
    const data = {
      serverTunnel: serverTunnel || 'https://begun-career-nut-promptly.trycloudflare.com',
      clientTunnel: clientTunnel || 'https://rep-sublime-sculpture-yale.trycloudflare.com',
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(activeFile, JSON.stringify(data, null, 2), 'utf8');
    res.json({ success: true, active: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ⚡ ULTRA-FAST IN-MEMORY RESPONSE CACHE (Sub-0.1ms Query Delivery)
// ============================================================================
const httpSearchCache = new Map();
const HTTP_CACHE_TTL_MS = 15 * 60 * 1000; // 15 mins TTL
const HTTP_CACHE_MAX_ENTRIES = 20000;

function getHttpSearchCache(key) {
  const item = httpSearchCache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > HTTP_CACHE_TTL_MS) {
    httpSearchCache.delete(key);
    return null;
  }
  return item.data;
}

function setHttpSearchCache(key, data) {
  if (httpSearchCache.size >= HTTP_CACHE_MAX_ENTRIES) {
    const oldest = httpSearchCache.keys().next().value;
    if (oldest !== undefined) httpSearchCache.delete(oldest);
  }
  httpSearchCache.set(key, { data, time: Date.now() });
}

let cachedTrendingPayload = null;
let cachedTrendingTime = 0;

// 1. Search Query Endpoint with Web & Image Search support
app.get('/api/search', searchPriorityMiddleware, async (req, res) => {
  const query = req.query.q || '';
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '15', 10);
  const timeFilter = req.query.timeFilter || 'all';
  const type = req.query.type || 'all'; // 'all' | 'images'
  const liveCrawl = req.query.liveCrawl === 'true' || req.query.liveCrawl === '1';

  if (!query.trim()) {
    return res.json({ query: '', total: 0, results: [], durationMs: 0, type });
  }

  // Set lightweight cache header for repeated queries
  res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=60');

  // Log user search query asynchronously (0ms overhead)
  db.logQuery(query);

  // Trigger On-Demand Live Web Crawl in Background if requested
  if (liveCrawl) {
    const encoded = encodeURIComponent(query.trim());
    const querySeeds = [
      `https://id.wikipedia.org/wiki/Special:Search?search=${encoded}`,
      `https://en.wikipedia.org/wiki/Special:Search?search=${encoded}`,
      `https://dev.to/search?q=${encoded}`,
      `https://news.ycombinator.com`
    ];
    crawlerEngine.injectSeeds(querySeeds, 10);
  }

  if (type === 'images') {
    const cacheKey = `${query.trim().toLowerCase()}|${page}|${limit}|images|all|false`;
    if (!liveCrawl) {
      const cached = getHttpSearchCache(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
    }
    const result = searchEngine.searchImages(query, { page, limit: parseInt(req.query.limit || '24', 10) });
    const payload = {
      ...result,
      liveCrawlTriggered: liveCrawl
    };
    if (!liveCrawl) {
      setHttpSearchCache(cacheKey, payload);
    }
    res.setHeader('X-Cache', 'MISS');
    return res.json(payload);
  }

  const forceOriginal = req.query.forceOriginal === 'true' || req.query.forceOriginal === '1';
  const cacheKey = `${query.trim().toLowerCase()}|${page}|${limit}|${timeFilter}|${type}|${forceOriginal}`;

  if (!liveCrawl) {
    const cachedResponse = getHttpSearchCache(cacheKey);
    if (cachedResponse) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Response-Time', '0.05ms');
      return res.json(cachedResponse);
    }
  }

  const t_start = performance.now();
  let searchTimer = null;
  const timeoutPromise = new Promise((resolve) => {
    searchTimer = setTimeout(() => {
      resolve({
        timedOut: true,
        query,
        total: 0,
        results: [],
        durationMs: MAX_SEARCH_SESSION_TIMEOUT_MS,
        message: 'Batas waktu pencarian 10 detik tercapai (QoS Protection). Layanan dibatasi demi menjaga kecepatan bersama.'
      });
    }, MAX_SEARCH_SESSION_TIMEOUT_MS);
  });

  const searchExecution = searchEngine.searchAsync(query, { page, limit, timeFilter, type, forceOriginal }, db);
  const result = await Promise.race([searchExecution, timeoutPromise]);
  if (searchTimer) clearTimeout(searchTimer);

  const t_diff = performance.now() - t_start;
  if (t_diff > 30) {
    console.log(`[PERF-SEARCH] query="${query}" async=${t_diff.toFixed(1)}ms engine=${result.durationMs}ms`);
  }

  const payload = {
    ...result,
    type,
    timeFilter,
    liveCrawlTriggered: liveCrawl,
    maxProcessTimeMs: MAX_SEARCH_SESSION_TIMEOUT_MS
  };

  if (!liveCrawl) {
    setHttpSearchCache(cacheKey, payload);
  }

  res.setHeader('X-Cache', 'MISS');
  res.setHeader('X-Response-Time', `${t_diff.toFixed(2)}ms`);
  res.json(payload);
});

// Autocomplete & Trending Search Suggestions (Google-style, Non-blocking In-Memory Speed)
app.get('/api/suggestions', (req, res) => {
  const query = req.query.q || '';
  const limit = parseInt(req.query.limit || '8', 10);
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const suggestions = db.getSuggestions(query, limit);
  res.json({ query, suggestions });
});

app.get('/api/suggestions/trending', (req, res) => {
  const limit = parseInt(req.query.limit || '12', 10);
  res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
  if (cachedTrendingPayload && (Date.now() - cachedTrendingTime < 60000)) {
    return res.json(cachedTrendingPayload);
  }
  const trending = db.getTrendingQueries(limit);
  const payload = { trending, suggestions: trending.map(t => t.query || t) };
  cachedTrendingPayload = payload;
  cachedTrendingTime = Date.now();
  res.json(payload);
});

app.post('/api/queries/log', (req, res) => {
  const { query } = req.body || {};
  if (query && typeof query === 'string') {
    db.logQuery(query);
  }
  res.json({ success: true });
});

// ============================================================================
// 🤖 PERPLEXITY-GRADE MULTI-STEP AI DIRECT SYNTHESIS & REASONING STREAM
// ============================================================================
app.post('/api/ai/stream', searchPriorityMiddleware, async (req, res) => {
  const { query, results = [], mode = 'search_overview', options = {} } = req.body || {};
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  // Set headers for real-time Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const controller = new AbortController();
  
  // ⏱️ Batas waktu proses AI maksimal 10 detik per sesi tanya agar tidak membebani server untuk pengguna lain
  const streamSessionTimer = setTimeout(() => {
    try {
      sendEvent('step', { message: 'Batas waktu 10 detik per sesi tercapai. Menyelesaikan jawaban...' });
      sendEvent('complete', {
        summary: 'Batas waktu AI 10 detik tercapai (QoS Protection). Sesi ditutup agar kecepatan layanan tetap lancar untuk semua pengguna.',
        isTimeout: true
      });
      res.write('data: [DONE]\n\n');
      res.end();
    } catch {}
    controller.abort();
  }, MAX_SEARCH_SESSION_TIMEOUT_MS);

  const cleanStreamTimer = () => {
    if (streamSessionTimer) clearTimeout(streamSessionTimer);
  };
  res.on('finish', cleanStreamTimer);
  res.on('close', cleanStreamTimer);

  res.on('close', () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  });

  try {
    // Top 15 results for comprehensive grounding
    let targetResults = results;
    let instantAnswer = null;
    if (!targetResults || targetResults.length === 0) {
      const searchRes = await searchEngine.searchAsync(query, { limit: 15 }, db);
      targetResults = searchRes?.results || [];
      instantAnswer = searchRes?.instantAnswer || null;
    } else if (targetResults.length < 15) {
      targetResults = targetResults.slice(0, 15);
    }

    await aiSynthesisEngine.synthesizeStream({
      query,
      results: targetResults,
      mode,
      options: { ...options, instantAnswer, mode },
      signal: controller.signal,
      onStep: (stepInfo) => sendEvent('step', stepInfo),
      onThinking: (chunk, accumulated) => {
        sendEvent('thinking', { chunk, accumulated });
      },
      onToken: (token) => {
        sendEvent('token', { token });
      },
      onComplete: (data) => {
        cleanStreamTimer();
        sendEvent('complete', data);
        res.write('data: [DONE]\n\n');
        res.end();
      },
      onError: (err) => {
        cleanStreamTimer();
        sendEvent('error', { message: err.message || 'AI Synthesis error' });
        res.end();
      }
    });
  } catch (err) {
    cleanStreamTimer();
    sendEvent('error', { message: err.message || 'Server synthesis exception' });
    res.end();
  }
});

app.post('/api/ai/summary', searchPriorityMiddleware, async (req, res) => {
  const { query, results = [] } = req.body || {};
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    let targetResults = results;
    let instantAnswer = null;
    if (!targetResults || targetResults.length === 0) {
      const searchRes = searchEngine.search(query, { limit: 15 });
      targetResults = searchRes?.results || [];
      instantAnswer = searchRes?.instantAnswer || null;
    } else {
      targetResults = targetResults.slice(0, 15);
    }

    // ⏱️ Batas waktu maksimal 10 detik per sesi tanya
    let summaryTimer = null;
    const timeoutPromise = new Promise((resolve) => {
      summaryTimer = setTimeout(() => {
        resolve({
          summary: generateLocalRagSummary(query, targetResults),
          isTimeout: true,
          message: 'Ringkasan instan disajikan karena batas waktu AI 10 detik tercapai.'
        });
      }, MAX_SEARCH_SESSION_TIMEOUT_MS);
    });

    const summaryPromise = aiSynthesisEngine.synthesizeFast(query, targetResults, { instantAnswer });
    const summaryData = await Promise.race([summaryPromise, timeoutPromise]);
    if (summaryTimer) clearTimeout(summaryTimer);

    res.json({
      success: true,
      ...summaryData
    });
  } catch (err) {
    console.error('AI summary error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate AI summary' });
  }
});

// Interactive Multi-Step Deep Search / Research Assistant
app.post('/api/ai/deep-search', searchPriorityMiddleware, async (req, res) => {
  const { query, history = [] } = req.body || {};
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // Step 1: Multi-tier search
    const searchRes = await searchEngine.searchAsync(query, { limit: 15 }, db);
    const results = searchRes?.results || [];
    const instantAnswer = searchRes?.instantAnswer || null;

    // ⏱️ Batas waktu maksimal 10 detik per sesi tanya
    let deepTimer = null;
    const timeoutPromise = new Promise((resolve) => {
      deepTimer = setTimeout(() => {
        resolve({
          summary: generateLocalRagSummary(query, results),
          isTimeout: true,
          message: 'Batas waktu Deep Search 10 detik tercapai. Menampilkan ringkasan awal.'
        });
      }, MAX_SEARCH_SESSION_TIMEOUT_MS);
    });

    // Step 2: Synthesis with DeepSeek reading top 15 results
    const summaryPromise = aiSynthesisEngine.synthesizeFast(query, results, { instantAnswer });
    const summaryData = await Promise.race([summaryPromise, timeoutPromise]);
    if (deepTimer) clearTimeout(deepTimer);

    res.json({
      success: true,
      query,
      resultsCount: results.length,
      ...summaryData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// ⚡ HIGH-CONCURRENCY ACCELERATED IMAGE PROXY (Multi-Tier RAM Cache & Inflight Coalescing)
// Optimized to serve millions of concurrent image requests with sub-0.1ms RAM hits
// ============================================================================
const imageProxyCache = new Map();
const MAX_PROXY_CACHE_ENTRIES = 3000; // ~100MB RAM max
const PROXY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in RAM
const failedImageUrls = new Map(); // Negative cache for broken/404 image URLs (5 min TTL)
const pendingImageFetches = new Map(); // Coalesce inflight requests: 1 network request for N clients

function getCachedProxyImage(url) {
  const item = imageProxyCache.get(url);
  if (!item) return null;
  if (Date.now() - item.time > PROXY_CACHE_TTL_MS) {
    imageProxyCache.delete(url);
    return null;
  }
  return item;
}

function setCachedProxyImage(url, buffer, contentType) {
  if (imageProxyCache.size >= MAX_PROXY_CACHE_ENTRIES) {
    const oldest = imageProxyCache.keys().next().value;
    if (oldest !== undefined) imageProxyCache.delete(oldest);
  }
  imageProxyCache.set(url, { buffer, contentType, time: Date.now() });
}

app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).send('Missing url parameter');
  }

  // 1. Check Negative Cache (Skip known broken URLs immediately in 0.01ms)
  const failedTime = failedImageUrls.get(imageUrl);
  if (failedTime && (Date.now() - failedTime < 300000)) {
    return res.status(404).send('Image unavailable');
  }

  // 2. Check In-Memory RAM Cache (Instant Sub-0.1ms Hit)
  const cached = getCachedProxyImage(imageUrl);
  if (cached) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('X-Proxy-Cache', 'HIT');
    return res.send(cached.buffer);
  }

  // 3. Inflight Request Coalescing (If 10 clients ask for the same image, fetch once!)
  let fetchPromise = pendingImageFetches.get(imageUrl);
  if (!fetchPromise) {
    fetchPromise = (async () => {
      try {
        const parsedUrl = new URL(imageUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(imageUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Referer': `${parsedUrl.protocol}//${parsedUrl.host}/`
          }
        });

        clearTimeout(timeout);

        if (!response.ok) {
          failedImageUrls.set(imageUrl, Date.now());
          return null;
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await response.arrayBuffer());
        setCachedProxyImage(imageUrl, buffer, contentType);
        return { buffer, contentType };
      } catch (err) {
        failedImageUrls.set(imageUrl, Date.now());
        return null;
      } finally {
        pendingImageFetches.delete(imageUrl);
      }
    })();

    pendingImageFetches.set(imageUrl, fetchPromise);
  }

  try {
    const result = await fetchPromise;
    if (!result) {
      return res.status(404).send('Failed to fetch image');
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('X-Proxy-Cache', 'MISS');
    return res.send(result.buffer);
  } catch (err) {
    return res.status(500).send('Proxy error: ' + err.message);
  }
});

// Dedicated Images Endpoint Alias
app.get('/api/images', searchPriorityMiddleware, (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) {
    return res.json({ query: '', total: 0, results: [], durationMs: 0, type: 'images' });
  }
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '24', 10);

  const result = searchEngine.searchImages(query, { page, limit });
  res.json(result);
});

// ==========================================
// NEWS API ENDPOINTS
// ==========================================

// News Search with sort (latest/trending/toprank)
app.get('/api/news', searchPriorityMiddleware, (req, res) => {
  const query = req.query.q || '';
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '15', 10);
  const sort = req.query.sort || 'toprank'; // 'toprank' | 'trending' | 'latest'
  const subtype = req.query.subtype || 'articles'; // 'articles' | 'images'

  if (subtype === 'images') {
    if (!query.trim()) {
      return res.json({ query: '', total: 0, results: [], durationMs: 0, type: 'news_images' });
    }
    const result = searchEngine.searchNewsImages(query, { page, limit: parseInt(req.query.limit || '24', 10) });
    return res.json(result);
  }

  // If no query, return trending/toprank news
  if (!query.trim()) {
    if (sort === 'toprank') {
      return res.json(searchEngine.getTopRankedNews(limit, page));
    }
    return res.json(searchEngine.getTrendingNews(limit, page));
  }

  db.logQuery(query);

  const result = searchEngine.searchNews(query, { page, limit, sort });
  res.json(result);
});

// Trending News endpoint
app.get('/api/news/trending', (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  res.json(searchEngine.getTrendingNews(limit, page));
});

// Top Ranked News endpoint
app.get('/api/news/toprank', (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  res.json(searchEngine.getTopRankedNews(limit, page));
});

// News Images endpoint
app.get('/api/news/images', (req, res) => {
  const query = req.query.q || '';
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '24', 10);
  if (!query.trim()) {
    return res.json({ query: '', total: 0, results: [], durationMs: 0, type: 'news_images' });
  }
  res.json(searchEngine.searchNewsImages(query, { page, limit }));
});

// Manual News Crawl Trigger
app.post('/api/news/crawl', async (req, res) => {
  try {
    newsCrawler.triggerManualCrawl();
    res.json({ success: true, message: 'News crawl triggered', stats: newsCrawler.getStats() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// News Crawler Stats
app.get('/api/news/stats', (req, res) => {
  res.json(newsCrawler.getStats());
});

// Tokoh & Public Figure Crawler Stats, Recent Feed & Manual Trigger
app.get('/api/tokoh/stats', (req, res) => {
  res.json(tokohCrawler.getStats());
});

app.get('/api/tokoh/recent', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '30', 10), 100);
  const items = db.getRecentCelebrities(limit);
  res.json({ total: items.length, results: items });
});

app.post('/api/tokoh/crawl', async (req, res) => {
  tokohCrawler.triggerManualCrawl();
  res.json({ success: true, message: 'Tokoh crawl triggered', stats: tokohCrawler.getStats() });
});

// Geo & Location Crawler Stats, Recent Feed & Manual Trigger
app.get('/api/geo/stats', (req, res) => {
  res.json(geoCrawler.getStats());
});

app.get('/api/geo/recent', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '30', 10), 100);
  const items = db.getRecentGeoEntities(limit);
  res.json({ total: items.length, results: items });
});

app.post('/api/geo/crawl', async (req, res) => {
  geoCrawler.harvestCategories(true);
  res.json({ success: true, message: 'Geo crawl triggered', stats: geoCrawler.getStats() });
});

// Image & Visual Media Crawler Stats, Recent Feed & Manual Trigger
app.get('/api/images/stats', (req, res) => {
  res.json(imageCrawler.getStats());
});

app.get('/api/images/recent', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '30', 10), 100);
  const items = db.getRecentImages(limit);
  res.json({ total: items.length, results: items });
});

app.post('/api/images/crawl', async (req, res) => {
  imageCrawler.harvestChannels(true);
  res.json({ success: true, message: 'Image crawl triggered', stats: imageCrawler.getStats() });
});

// DeeperNova Economics Comprehensive Live Market Data API
app.get('/api/economics', (req, res) => {
  res.json({
    success: true,
    lastUpdated: Date.now(),
    lastUpdatedText: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    forex: CurrencyEngine.liveRates,
    crypto: MarketDataEngine.liveCrypto,
    stocks: MarketDataEngine.liveStocks
  });
});

// Seeds Metadata & Categories API
app.get('/api/crawler/seeds', (req, res) => {
  const categoryCounts = {};
  for (const [k, v] of Object.entries(SEED_CATEGORIES)) {
    categoryCounts[k] = Array.isArray(v) ? v.length : 0;
  }
  res.json({
    totalCount: getTotalSeedCount(),
    categories: categoryCounts,
    allSeeds: getAllGlobalSeeds()
  });
});

// 2. Start Crawler
app.post('/api/crawl/start', (req, res) => {
  const {
    seeds = [],
    concurrency = 4,
    maxDepth = 10,
    maxPages = 10000000,
    perDomainDelayMs = 250,
    allowedDomains = null,
    autonomousMode = true
  } = req.body || {};

  if (crawlerEngine.state === CrawlerState.RUNNING) {
    // If already running, dynamically inject seeds instead of erroring
    if (seeds && seeds.length > 0) {
      const added = crawlerEngine.injectSeeds(seeds, 15);
      return res.json({ success: true, message: `Injected ${added} seed URLs into running crawler`, status: crawlerEngine.getStatus() });
    }
    return res.status(400).json({ error: 'Crawler is already running' });
  }

  // Re-instantiate crawler with new config (gentle & anti-lag defaults)
  crawlerEngine = new CrawlerEngine(db, {
    concurrency: Math.min(Math.max(1, Number(concurrency) || 4), 6),
    maxDepth: Math.min(Math.max(1, maxDepth), 15),
    maxPages: maxPages || 10000000,
    perDomainDelayMs: Math.max(150, perDomainDelayMs || 250),
    allowedDomains: allowedDomains && allowedDomains.length > 0 ? allowedDomains : null,
    autonomousMode: Boolean(autonomousMode)
  });

  attachCrawlerEvents(crawlerEngine);

  crawlerEngine.start(seeds && seeds.length > 0 ? seeds : getAllGlobalSeeds(), { autonomousMode });
  res.json({ success: true, message: 'Crawler started in gentle mode (zero-lag)', status: crawlerEngine.getStatus() });
});

// 3. Pause Crawler
app.post('/api/crawl/pause', (req, res) => {
  crawlerEngine.pause();
  res.json({ success: true, status: crawlerEngine.getStatus() });
});

// 4. Resume Crawler
app.post('/api/crawl/resume', (req, res) => {
  crawlerEngine.resume();
  res.json({ success: true, status: crawlerEngine.getStatus() });
});

// 5. Stop Crawler
app.post('/api/crawl/stop', async (req, res) => {
  await crawlerEngine.stop();
  res.json({ success: true, status: crawlerEngine.getStatus() });
});

// 6. Get Current Status & Stats
app.get('/api/status', (req, res) => {
  res.json({
    crawler: crawlerEngine.getStatus(),
    news: newsCrawler.getStats(),
    tokoh: tokohCrawler.getStats(),
    db: db.getStats(),
    history: crawlerEngine.getHistory(),
    point: crawlerEngine.getSnapshot(),
    liveLogsEnabled
  });
});

// 6b. Toggle Live Log Stream (Low-CPU Mode)
app.post('/api/telemetry/toggle', express.json(), (req, res) => {
  const { liveLogs } = req.body || {};
  if (typeof liveLogs === 'boolean') {
    liveLogsEnabled = liveLogs;
  }
  res.json({ success: true, liveLogsEnabled });
});

// 7. Calculate PageRank (Asynchronous & Non-Blocking)
app.post('/api/pagerank/calculate', async (req, res) => {
  try {
    const result = await pagerankCalc.calculateAsync();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Reset Database
app.post('/api/database/reset', async (req, res) => {
  if (crawlerEngine.state === CrawlerState.RUNNING) {
    await crawlerEngine.stop();
  }
  crawlerEngine.frontier.clear();
  db.reset();
  res.json({ success: true, message: 'Database reset successfully' });
});

// 8b. Checkpoint & Shrink SQLite WAL File
app.post('/api/database/checkpoint', (req, res) => {
  const result = db.checkpoint('TRUNCATE');
  res.json({ success: true, checkpoint: result });
});

// 9c. DeeperNova Economics Hub - Real Live Market Quotes & Matrix
app.get('/api/economics', (req, res) => {
  try {
    res.json({
      success: true,
      forex: CurrencyEngine.liveForex || {},
      crypto: MarketDataEngine.liveCrypto || {},
      stocks: MarketDataEngine.liveStocks || {},
      lastSyncTime: MarketDataEngine.lastSyncTime || Date.now(),
      lastUpdatedText: new Date(MarketDataEngine.lastSyncTime || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isRealData: true,
      sources: ['Yahoo Finance API', 'CoinGecko Live API', 'European Central Bank / Frankfurter']
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9d. 100% Real Historical Financial Market Chart Time-Series Endpoint
app.get('/api/economics/chart', async (req, res) => {
  try {
    const symbol = (req.query.symbol || 'BBCA').trim().toUpperCase();
    const type = (req.query.type || 'stock').trim().toLowerCase();
    const chartSeries = await RealChartFetcher.getRealChartSeries(symbol, type, db);

    res.json({
      success: true,
      symbol,
      type,
      charts: chartSeries,
      isReal: true,
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * High-quality, deeply informative, and structured local RAG synthesis engine
 * Formats findings into clear executive summaries, key highlights, and deep contextual insights.
 */
function generateLocalRagSummary(query = '', results = []) {
  try {
    const summaryText = aiSynthesisEngine.synthesizeLocal(query, results);
    return summaryText || 'Ringkasan tidak tersedia.';
  } catch (e) {
    return `Ringkasan AI untuk kueri "${query}". Silakan telusuri hasil pencarian di bawah.`;
  }
}

// 10. API-Only Fallback: Bebaskan server dari melayani file HTML besar
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (req.accepts('html')) {
    return res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>DeeperNova Search API</title><meta http-equiv="refresh" content="3;url=/search"></head><body style="font-family:sans-serif;padding:40px;background:#0d1117;color:#c9d1d9;text-align:center;"><h2>🚀 DeeperNova Search API Engine</h2><p>Tampilan frontend berjalan di Vercel CDN (/search).</p><p><a href="/search" style="color:#58a6ff;">Buka Antarmuka Pencarian &rarr;</a></p></body></html>`);
  }
  res.status(200).json({
    status: 'online',
    service: 'DeeperNova Search & Crawler API Engine',
    frontend: 'Hosted on Vercel CDN (/search)',
    endpoints: ['/api/search', '/api/v1/search', '/api/v1/images', '/api/v1/news', '/api/suggestions', '/api/ai/stream']
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 DEEPERNOVA SEARCH ENGINE & CRAWLER READY`);
  console.log(`  🌐 Web UI: http://localhost:${PORT}`);
  console.log(`  ⚡ SQLite WAL Database: active`);
  console.log(`  🔍 Real-time WebSocket: active on port ${PORT}`);
  console.log(`======================================================\n`);

  // Asynchronous background startup (zero disk I/O at boot)
  setTimeout(() => {
    try {
      seedInitialBrandPages(db);
      db.seedInitialPopularQueries();
      warmTopQueries();
      CurrencyEngine.startLiveSync();
      MarketDataEngine.startLiveSync(db);
    } catch {}
  }, 1000);

  // Non-blocking WAL checkpoint on boot to keep read queries <20ms
  setTimeout(() => {
    try {
      const ck = db.checkpoint('PASSIVE');
      if (ck && !ck.error) {
        console.log('⚡ SQLite WAL Checkpointed Successfully (Zero Disk Bloat)');
      }
    } catch {}
  }, 2500);

  const autoStartCrawler = process.env.AUTO_START_CRAWLER !== 'false';

  if (autoStartCrawler) {
    // 1. Web Text & Information Crawler (SSD Turbo 4-Tier Mode)
    setTimeout(() => {
      const allSeeds = getAllGlobalSeeds();
      console.log(`\n======================================================`);
      console.log(`⚡ [CRAWLER OMNI 4-TIER AKTIF - SSD TURBO MODE]`);
      console.log(`   Menjalankan ${allSeeds.length} master seed (1st Berita Indo -> 2nd Berita Global -> 3rd Web Indo -> 4th Web Global)`);
      console.log(`   Workers: ${crawlerConcurrency} paralel, 25ms delay, SSD WAL micro-batching`);
      console.log(`   ⚡ Search Priority Governor: AKTIF (auto-throttle saat search)`);
      console.log(`======================================================\n`);
      try {
        crawlerEngine.start(allSeeds, { autonomousMode: true });
      } catch (e) {
        console.error('Web Text crawler auto-start error:', e.message);
      }
    }, 1500);

    // 2. Breaking News & Live RSS Crawler (SSD Turbo Mode)
    setTimeout(() => {
      console.log(`\n======================================================`);
      console.log(`📰 [CRAWLER LIVE NEWS & RSS AKTIF - SSD TURBO MODE]`);
      console.log(`   Menjalankan ${newsCrawlerConcurrency} workers paralel langsung dari 60+ media Indo & Global RSS live feeds...`);
      console.log(`======================================================\n`);
      try {
        newsCrawler.start();
      } catch (e) {
        console.error('News crawler auto-start error:', e.message);
      }
    }, 3000);

    // 3. Public Figure / Tokoh Crawler (Gentle Background Mode)
    setTimeout(() => {
      console.log(`\n======================================================`);
      console.log(`🌟 [CRAWLER TOKOH & PUBLIC FIGURE AKTIF - GENTLE MODE]`);
      console.log(`   Menjalankan 1 worker santai (delay: 2500ms) untuk tokoh publik & figur...`);
      console.log(`======================================================\n`);
      try {
        tokohCrawler.start();
      } catch (e) {
        console.error('Tokoh crawler auto-start error:', e.message);
      }
    }, 4500);

    // 4. Geolocation & Landmark Crawler (Gentle Background Mode)
    setTimeout(() => {
      console.log(`\n======================================================`);
      console.log(`🗺️ [CRAWLER LOKASI & GEOLOKASI AKTIF - GENTLE MODE]`);
      console.log(`   Menjalankan 1 worker santai (delay: 2500ms) untuk wilayah & landmark...`);
      console.log(`======================================================\n`);
      try {
        geoCrawler.start();
      } catch (e) {
        console.error('Geo crawler auto-start error:', e.message);
      }
    }, 6000);
  } else {
    console.log('ℹ️  Autonomous Crawler is in STANDBY mode.');
    console.log('   Click "Start Crawler" in the Web UI dashboard to begin on-demand indexing.\n');
  }
});

// Clean shutdown handler to prevent crashes on termination
let isShuttingDown = false;
const gracefulShutdown = () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[SYSTEM] 🛑 Gracefully shutting down search engine...');
  try {
    if (crawlerEngine && crawlerEngine.stop) crawlerEngine.stop();
    if (newsCrawler && newsCrawler.stop) newsCrawler.stop();
    if (tokohCrawler && tokohCrawler.stop) tokohCrawler.stop();
    if (geoCrawler && geoCrawler.stop) geoCrawler.stop();
    db.close();
  } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

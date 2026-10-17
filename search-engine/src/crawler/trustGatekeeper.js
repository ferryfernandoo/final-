/**
 * ============================================================================
 * 🛡️ UNIVERSAL TRUST & ANTI-SPAM GATEKEEPER ENGINE
 * ============================================================================
 * World-Scale Data Quality & Trust Filter for DeeperNova Search Engine
 * Enforces E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
 * Eliminates Web Spam, Casino/Slot, Link Farms, Phishing & Junk Scrapers.
 * Zero-Tolerance Protection Against Online Gambling, Pornography & Fraud.
 * ============================================================================
 */

// Blocked gambling / slot / togel / adult / porn / malware / spam keywords across paths, queries, and titles
export const SPAM_KEYWORDS = [
  // Indonesian Online Gambling, Slot & Togel (Zero-Tolerance Anti-Judol Shield)
  'slot', 'gacor', 'judi', 'togel', 'poker88', 'sbobet', 'maxwin', 'zeus slot',
  'pragmatic play', 'slot88', 'bandar judi', 'agen bola', 'casino online',
  'taruhan bola', 'link gacor', 'rtp slot', 'bocoran slot', 'scatter hitam',
  'mahjong ways', 'deposit pulsa', 'daftar slot', 'situs judi', 'jackpot slot',
  'depo pulsa', 'link slot', 'akun pro', 'rtp live', 'pola gacor', 'scatter merah',
  'gates of olympus', 'starlight princess', 'sweet bonanza', 'server kamboja',
  'server thailand', 'server rusia', 'server vietnam', 'server filipina',
  'judi slot', 'kasino online', 'roulette online', 'baccarat online', 'dominoqq',
  'bandarq', 'ceme online', 'capsa susun', 'slot deposit dana', 'slot deposit qris',
  'slot tanpa potongan', 'link alternatif slot', 'bocoran admin jarwo', 'bocoran admin riki',
  'situs slot gacor', 'judi online', 'agen judi', 'bandar togel', 'togel hongkong',
  'togel singapore', 'togel sydney', 'totomacau', 'toto macau', 'live draw hk',
  'live draw sgp', 'live draw sdy', 'prediksi togel', 'bocoran angka togel',
  'syair togel', 'angka main hk', 'sbobet88', 'mpo slot', 'hoki slot', 'sultan slot',
  'raja slot', 'nexus slot', 'judol', 'slot777', 'slot888', 'slot138', 'slot188',
  'slot303', 'slot388', 'slot365', 'slotqris', 'pola maxwin', 'bocoran slot gacor',
  'anti rungkad', 'gampang menang', 'situs judi slot', 'bandar judi online',
  'taruhan judi', 'agen sbobet', 'agen casino', 'casino live', 'rolet online',
  'bakarat online', 'sicbo online', 'tembak ikan online', 'sabung ayam', 'sv388',
  's128', 'togel singapura', 'togel hk pools', 'togel macau', 'keluaran hk',
  'keluaran sgp', 'pengeluaran hk', 'pengeluaran sgp', 'data hk', 'data sgp',
  'angka main togel', 'syair hk', 'syair sgp', 'syair sdy', 'link alternatif',
  'login alternatif', 'daftar akun judi', 'bonus new member 100', 'depo 25 bonus 25',
  'depo 50 bonus 50', 'slot garansi kekalahan', 'freebet tanpa deposit',
  'dewanaga77', 'dewanaga', 'rakun16', 'jablay123', 'dewaslot', 'mposlot',
  'panen138', 'ligaciputra', 'asiktoto', 'olxtoto', 'kaskustoto', 'gas138',
  'rajabandot', 'sensa138', 'toto188', 'rokokbet', 'hoki188', 'nagahoki',
  'king4d', 'indotogel', 'situs toto', 'bo togel', 'bo slot', 'judi bola',

  // Indonesian Adult & Pornography (SafeSearch Protection)
  'bokep', 'ngentot', 'mesum', 'lendir', 'colmek', 'stw', 'vcs', 'open bo',
  'bugil', 'telanjang', 'cerita dewasa', 'video mesum', 'live bugil', 'pepek',
  'memek', 'kontol', 'jav sub indo', 'bokep indo', 'bokep jepang', 'bokep barat',
  'video porno', 'film porno', 'situs porno', 'nonton bokep', 'link bokep',
  
  // English & Global Adult / NSFW / Pornography
  'porn', 'porno', 'xxx', 'xxnx', 'xvideos', 'xnxx', 'porn-hub', 'pornhub',
  'redtube', 'youporn', 'brazzers', 'xhamster', 'onlyfans-leak', 'chaturbate',
  'camsoda', 'stripchat', 'livejasmin', 'adult-chat', 'xxx-video', 'erotic-video',
  'hardcore-porn', 'hentai-haven', 'rule34', 'nude-girls', 'sex-video',
  'escort-service', 'fetish-porn', 'camgirl', 'hentai',

  // Web Spam, Malware, Phishing & Fraud
  'casino-online', 'online-gambling', 'viagra', 'cialis', 'free-download-crack',
  'keygen', 'warez', 'buy-followers', 'crypto-giveaway-scam', 'free-gift-cards',
  'crypto-drainer', 'pinjol-ilegal', 'hack-tool', 'saldo-dana-gratis-penipuan'
];

// High-confidence regex for promotional gambling keywords in titles, content, or slugs
const PROMOTIONAL_GAMBLING_REGEX = new RegExp(
  '(' +
  'slot[\\s\\-_]*gacor|slot[0-9]{2,4}|judi[\\s\\-_]*online|situs[\\s\\-_\\w]{0,25}(judi|slot|toto|togel)|' +
  'daftar[\\s\\-_\\w]{0,20}(slot|judi|togel|akun)|bandar[\\s\\-_\\w]{0,20}(togel|judi|slot|bola)|' +
  'agen[\\s\\-_\\w]{0,20}(judi|slot|bola|casino)|link[\\s\\-_]*alternatif|rtp[\\s\\-_]*(slot|live)|' +
  'bocoran[\\s\\-_]*slot|scatter[\\s\\-_]*(hitam|merah)|mahjong[\\s\\-_]*ways|depo[\\s\\-_]*(pulsa|dana|qris)|' +
  'pola[\\s\\-_]*gacor|anti[\\s\\-_]*rungkad|gampang[\\s\\-_]*menang|bonus[\\s\\-_]*new[\\s\\-_]*member|' +
  'freebet|maxwin|jackpot[\\s\\-_]*slot|toto[\\s\\-_]*macau|totomacau|live[\\s\\-_]*draw[\\s\\-_]*(hk|sgp|sdy)|' +
  'prediksi[\\s\\-_]*togel|syair[\\s\\-_]*(hk|sgp|sdy)|rokokbet[0-9]*|dewanaga[0-9]*|toto188|' +
  'rakun16|jablay[0-9]*|panen[0-9]*|sensa[0-9]*|gas[0-9]*|asiktoto|olxtoto|dewaslot[0-9]*|mposlot[0-9]*' +
  ')',
  'i'
);

// High-confidence regex for adult / pornographic titles or URLs
const ADULT_CONTENT_REGEX = new RegExp(
  '\\b(bokep|ngentot|mesum|colmek|open\\s*bo|vcs\\s*bugil|pepek|memek|kontol|porno|pornhub|' +
  'xvideos|xnxx|brazzers|xhamster|jav\\s*sub\\s*indo|video\\s*porno|film\\s*porno|nonton\\s*bokep)\\b',
  'i'
);

// Journalistic context terms indicating legitimate news reporting on crime/crackdown
const JOURNALISM_CRACKDOWN_TERMS = new Set([
  'polisi', 'polri', 'polda', 'polres', 'kapolri', 'kapolda', 'bareskrim',
  'tangkap', 'ciduk', 'ringkus', 'gerebek', 'bongkar', 'tersangka', 'pelaku',
  'kominfo', 'kemkominfo', 'blokir', 'tutup', 'berantas', 'satgas', 'operasi',
  'sidang', 'vonis', 'dakwaan', 'hukum', 'penjara', 'kasus', 'rugi', 'korban',
  'edukasi', 'cegah', 'himbauan', 'waspada', 'darurat', 'ancaman'
]);

// Spam & Adult TLDs
const SUSPICIOUS_TLDS = new Set([
  'xxx', 'porn', 'adult', 'sex', 'sexy', 'cam',
  'gq', 'cf', 'tk', 'ml', 'men', 'loan', 'click', 'work', 'rest', 'buzz', 'top', 'xyz'
]);

// Ultra High Authority Domains (Tier 1: 95-100 Score)
const TIER_1_AUTHORITY_DOMAINS = new Set([
  // Core Ecosystem
  'deepernova.com', 'www.deepernova.com',

  // Global AI & Tech Leaders
  'openai.com', 'deepseek.com', 'anthropic.com', 'ai.google', 'deepmind.google',
  'ai.meta.com', 'microsoft.com', 'apple.com', 'huggingface.co', 'nvidia.com',
  'github.com', 'gitlab.com', 'stackoverflow.com', 'developer.mozilla.org',

  // Global Science, Knowledge & Education
  'wikipedia.org', 'en.wikipedia.org', 'id.wikipedia.org', 'wikimedia.org', 'wikidata.org',
  'arxiv.org', 'nature.com', 'science.org', 'pubmed.ncbi.nlm.nih.gov', 'ncbi.nlm.nih.gov',
  'nasa.gov', 'who.int', 'un.org', 'worldbank.org', 'britannica.com',
  'mit.edu', 'stanford.edu', 'harvard.edu', 'ox.ac.uk', 'cam.ac.uk', 'berkeley.edu',

  // Indonesian Top Universities (.ac.id)
  'ui.ac.id', 'itb.ac.id', 'ugm.ac.id', 'undip.ac.id', 'unair.ac.id', 'its.ac.id',
  'ipb.ac.id', 'unpad.ac.id', 'unhas.ac.id', 'ub.ac.id', 'usu.ac.id', 'uns.ac.id',

  // Indonesian Government & BMKG (.go.id)
  'bmkg.go.id', 'kemkes.go.id', 'kominfo.go.id', 'kemenkeu.go.id', 'setkab.go.id',
  'kemdikbud.go.id', 'kemlu.go.id', 'bps.go.id', 'bi.go.id', 'ojk.go.id', 'brin.go.id',
  'setneg.go.id', 'polri.go.id', 'mahkamahagung.go.id', 'kpk.go.id', 'dpr.go.id',

  // World Wire News & Prestigious Media
  'reuters.com', 'apnews.com', 'bbc.com', 'nytimes.com', 'wsj.com', 'bloomberg.com',
  'ft.com', 'theguardian.com', 'dw.com', 'france24.com', 'aljazeera.com',
  'detik.com', 'kompas.com', 'antaranews.com', 'tempo.co', 'cnnindonesia.com', 'cnbcindonesia.com'
]);

export class TrustGatekeeper {
  /**
   * Evaluates if a URL is obvious spam, gambling, porn, or phishing
   */
  static isSpamUrl(url) {
    if (!url || typeof url !== 'string') return true;
    const lower = url.toLowerCase();
    const normalized = lower.replace(/[-_./?&=#]+/g, ' ');

    // 1. Check for spam keywords in path or query
    for (const kw of SPAM_KEYWORDS) {
      if (lower.includes(kw) || normalized.includes(kw)) {
        return true;
      }
    }

    // 2. Check for regex promotional patterns in URL slug
    if (
      PROMOTIONAL_GAMBLING_REGEX.test(lower) ||
      PROMOTIONAL_GAMBLING_REGEX.test(normalized) ||
      ADULT_CONTENT_REGEX.test(lower) ||
      ADULT_CONTENT_REGEX.test(normalized)
    ) {
      return true;
    }

    // 3. Check for suspicious TLDs paired with high-risk subdomains
    try {
      const parsed = new URL(url);
      const host = parsed.hostname;
      const parts = host.split('.');
      const tld = parts[parts.length - 1];

      if (['xxx', 'porn', 'adult', 'sex', 'sexy', 'cam'].includes(tld)) {
        return true;
      }

      if (SUSPICIOUS_TLDS.has(tld)) {
        if (/\d{3,}/.test(host) || host.length > 28) {
          return true;
        }
      }

      // Check for excessively deep or repetitive subdomains (e.g. slot.gacor.server.xyz.com)
      if (parts.length > 5) {
        return true;
      }
    } catch {
      return true;
    }

    return false;
  }

  /**
   * Anti-Parasite SEO: Strictly detects defaced/compromised .go.id or .ac.id pages
   * where malicious actors injected gambling/slot content into government/university domains.
   */
  static isCompromisedGovEduSpam(url, title = '', content = '') {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const isGovOrEdu = host.endsWith('.go.id') || host.endsWith('.ac.id') || host.endsWith('.gov') || host.endsWith('.edu');
      if (!isGovOrEdu) return false;

      const path = parsed.pathname.toLowerCase();

      // Check for tell-tale hacked path slugs
      const hackedSlugs = [
        'slot', 'gacor', 'togel', 'judol', 'maxwin', 'rtp', 'scatter', 'mahjong',
        'poker', 'sbobet', 'pragmatic', 'depo', 'bonus', 'link-alternatif',
        'totomacau', 'toto188', 'rokokbet', 'dewanaga', 'jablay123', 'sensa138'
      ];
      for (const slug of hackedSlugs) {
        if (path.includes(`/${slug}`) || path.includes(`-${slug}`) || path.includes(`${slug}-`)) {
          return true; // 100% Compromised government subdomain
        }
      }

      // Check for promotional gambling keywords in title
      if (PROMOTIONAL_GAMBLING_REGEX.test(title)) {
        return true;
      }

      // Check for heavy gambling density in content on gov/edu page
      const lowerContent = (content || '').toLowerCase().slice(0, 3000);
      let judolSignals = 0;
      for (const kw of ['slot', 'gacor', 'togel', 'maxwin', 'deposit', 'scatter', 'jackpot']) {
        if (lowerContent.includes(kw)) judolSignals++;
      }
      if (judolSignals >= 3) {
        return true;
      }
    } catch {}
    return false;
  }

  /**
   * Universal title/content spam validator used at both crawl time and search time
   */
  static isSpamTitleOrContent(title = '', content = '', url = '') {
    const lowerTitle = (title || '').toLowerCase();
    const lowerUrl = (url || '').toLowerCase();

    // 1. Parasite SEO check on gov/edu domains
    if (url && TrustGatekeeper.isCompromisedGovEduSpam(url, title, content)) {
      return true;
    }

    // 2. Direct URL check
    if (url && TrustGatekeeper.isSpamUrl(url)) {
      return true;
    }

    // 3. Pornography check (Never legitimate news)
    if (ADULT_CONTENT_REGEX.test(lowerTitle) || (url && ADULT_CONTENT_REGEX.test(lowerUrl))) {
      return true;
    }

    // 4. Gambling / Judi / Togel check with legitimate journalism exception
    const hasGamblingKeywords = PROMOTIONAL_GAMBLING_REGEX.test(lowerTitle);
    if (hasGamblingKeywords) {
      // Check if this is legitimate journalism about anti-gambling enforcement
      let journalismScore = 0;
      for (const term of JOURNALISM_CRACKDOWN_TERMS) {
        if (lowerTitle.includes(term)) {
          journalismScore++;
        }
      }

      // If it contains strong journalistic context (e.g. "Polri Tangkap 10 Tersangka Judi Online"),
      // verify it doesn't contain promotional trigger words (e.g. "daftar", "link login", "depo 25")
      const isPromotional = (
        lowerTitle.includes('daftar') ||
        lowerTitle.includes('login') ||
        lowerTitle.includes('link alternatif') ||
        lowerTitle.includes('bonus') ||
        lowerTitle.includes('depo') ||
        lowerTitle.includes('gacor') ||
        lowerTitle.includes('scatter') ||
        lowerTitle.includes('anti rungkad') ||
        lowerTitle.includes('maxwin') ||
        lowerTitle.includes('rtp')
      );

      if (journalismScore >= 1 && !isPromotional) {
        return false; // Valid journalistic reporting
      }

      return true; // Pure promotional gambling spam
    }

    // 5. Content-level spam density check
    if (content) {
      const lowerContent = content.toLowerCase().slice(0, 3000);
      let spamDensity = 0;
      for (const kw of ['slot gacor', 'situs judi', 'daftar slot', 'bandar togel', 'maxwin', 'scatter hitam', 'anti rungkad']) {
        if (lowerContent.includes(kw)) spamDensity += 2;
      }
      if (spamDensity >= 4) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verifies parsed content quality against thin content and link farms
   */
  static evaluateContentQuality(doc, domain = '') {
    if (!doc) return { isSpam: true, score: 0, reason: 'Null document' };

    const wordCount = doc.wordCount || 0;
    const title = (doc.title || '').trim();
    const content = (doc.content || '').trim();
    const url = doc.url || '';

    // 1. Parasite SEO Check (Hacked .go.id / .ac.id pages)
    if (url && TrustGatekeeper.isCompromisedGovEduSpam(url, title, content)) {
      return { isSpam: true, score: 0, reason: 'Compromised Gov/Edu Parasite SEO' };
    }

    // 2. Minimum Word Count Gate (Reject empty/broken scraper pages)
    if (wordCount < 15 && !title.toLowerCase().includes('home') && !title.toLowerCase().includes('index') && !domain.endsWith('.gov') && !domain.endsWith('.go.id')) {
      return { isSpam: true, score: 10, reason: 'Thin content (<15 words)' };
    }

    // 3. Spam & Gambling Title/Content Filter
    if (TrustGatekeeper.isSpamTitleOrContent(title, content, url)) {
      return { isSpam: true, score: 0, reason: 'Illegal Gambling/Porn/Spam detected' };
    }

    // 4. Compute High-Precision Trust Score (0 to 100)
    let trustScore = 50.0; // Baseline for normal web

    // Domain Authority Tiering
    if (domain === 'deepernova.com' || domain.endsWith('.deepernova.com')) {
      trustScore = 100.0;
    } else if (domain.endsWith('.gov') || domain.endsWith('.go.id') || domain.endsWith('.mil')) {
      trustScore = 96.0; // Government & Official
    } else if (domain.endsWith('.edu') || domain.endsWith('.ac.id')) {
      trustScore = 95.0; // Higher Education & Research
    } else if (TIER_1_AUTHORITY_DOMAINS.has(domain)) {
      trustScore = 98.0; // Top Tier 1 Global Authority
    } else if (domain.endsWith('.org')) {
      trustScore = 75.0; // Non-profit / Standards
    }

    // Content Quality Enhancers
    if (wordCount >= 500) trustScore += 8;
    if (wordCount >= 1200) trustScore += 6;
    if (doc.headings && doc.headings.length > 20) trustScore += 4;
    if (doc.leadImageUrl) trustScore += 3;
    if (doc.publishedAt && doc.publishedAt > Date.now() - 86400000 * 30) trustScore += 4; // Fresh article bonus

    trustScore = Math.min(100, Math.max(10, trustScore));

    return {
      isSpam: false,
      score: trustScore,
      isVerifiedTrust: trustScore >= 85 ? 1 : 0
    };
  }

  /**
   * Classifies page into deep topic categories for specialized search tabs
   */
  static classifyCategory(url, domain, title, content) {
    const lowerUrl = (url || '').toLowerCase();
    const lowerDomain = (domain || '').toLowerCase();
    const lowerTitle = (title || '').toLowerCase();
    const lowerContent = (content || '').toLowerCase().slice(0, 3000);

    // 1. Government & Education
    if (lowerDomain.endsWith('.gov') || lowerDomain.endsWith('.go.id') || lowerDomain.endsWith('.mil')) {
      return 'gov_edu';
    }
    if (lowerDomain.endsWith('.edu') || lowerDomain.endsWith('.ac.id') || lowerUrl.includes('/universitas') || lowerUrl.includes('/kampus')) {
      return 'gov_edu';
    }

    // 2. Sports (National, Regional & International Sports Hubs)
    if (
      lowerDomain.includes('sport.detik.com') || lowerDomain.includes('bola.kompas.com') ||
      lowerDomain.includes('bola.net') || lowerDomain.includes('bola.com') ||
      lowerDomain.includes('pssi.org') || lowerDomain.includes('ligaindonesiabaru.com') ||
      lowerDomain.includes('liga1.id') || lowerDomain.includes('pbsi.id') ||
      lowerDomain.includes('bwfbadminton.com') || lowerDomain.includes('fifa.com') ||
      lowerDomain.includes('uefa.com') || lowerDomain.includes('premierleague.com') ||
      lowerDomain.includes('motogp.com') || lowerDomain.includes('formula1.com') ||
      lowerDomain.includes('skor.id') || lowerDomain.includes('supersoccer.tv') ||
      lowerDomain.includes('espn.com') || lowerDomain.includes('skysports.com') ||
      lowerUrl.includes('/sport') || lowerUrl.includes('/sports') || lowerUrl.includes('/bola') ||
      lowerUrl.includes('/sepakbola') || lowerUrl.includes('/bulutangkis') || lowerUrl.includes('/badminton') ||
      lowerUrl.includes('/motogp') || lowerUrl.includes('/f1') || lowerUrl.includes('/superskor') ||
      lowerTitle.includes('liga 1') || lowerTitle.includes('timnas indonesia') ||
      lowerTitle.includes('sepak bola') || lowerTitle.includes('bulu tangkis') ||
      lowerTitle.includes('motogp') || lowerTitle.includes('formula 1')
    ) {
      return 'sport';
    }

    // 3. Academic & Scientific Research
    if (
      lowerDomain.includes('arxiv.org') || lowerDomain.includes('pubmed') ||
      lowerDomain.includes('ncbi.nlm.nih.gov') || lowerDomain.includes('nature.com') ||
      lowerDomain.includes('science.org') || lowerDomain.includes('sciencedirect.com') ||
      lowerDomain.includes('ieeexplore') || lowerDomain.includes('researchgate') ||
      lowerUrl.includes('/paper/') || lowerUrl.includes('/abs/') || lowerUrl.includes('/journal/')
    ) {
      return 'academic';
    }

    // 4. Developer, Open Source & Code
    if (
      lowerDomain.includes('github.com') || lowerDomain.includes('gitlab.com') ||
      lowerDomain.includes('stackoverflow.com') || lowerDomain.includes('developer.mozilla.org') ||
      lowerDomain.includes('dev.to') || lowerDomain.includes('hashnode.com') ||
      lowerDomain.includes('npmjs.com') || lowerDomain.includes('pypi.org') ||
      lowerDomain.includes('crates.io') || lowerDomain.includes('w3.org') ||
      lowerDomain.includes('python.org') || lowerDomain.includes('nodejs.org') ||
      lowerDomain.includes('rust-lang.org') || lowerDomain.includes('react.dev') ||
      lowerDomain.includes('nextjs.org') || lowerDomain.includes('kotlin') ||
      lowerUrl.includes('/docs/') || lowerUrl.includes('/tutorial/') || lowerUrl.includes('/api/')
    ) {
      return 'developer';
    }

    // 5. News & Journalism
    if (
      lowerDomain.includes('detik.com') || lowerDomain.includes('kompas.com') ||
      lowerDomain.includes('antaranews.com') || lowerDomain.includes('reuters.com') ||
      lowerDomain.includes('apnews.com') || lowerDomain.includes('bbc.com') ||
      lowerDomain.includes('cnn.com') || lowerDomain.includes('nytimes.com') ||
      lowerDomain.includes('tempo.co') || lowerDomain.includes('tribunnews.com') ||
      lowerUrl.includes('/news') || lowerUrl.includes('/berita') || lowerUrl.includes('/terbaru')
    ) {
      return 'news';
    }

    // 6. Knowledge & Encyclopedias
    if (
      lowerDomain.includes('wikipedia.org') || lowerDomain.includes('wikimedia.org') ||
      lowerDomain.includes('wikidata.org') || lowerDomain.includes('britannica.com') ||
      lowerDomain.includes('wikihow.com') || lowerDomain.includes('quora.com')
    ) {
      return 'knowledge';
    }

    // 7. Finance & Crypto
    if (
      lowerDomain.includes('finance.yahoo.com') || lowerDomain.includes('investing.com') ||
      lowerDomain.includes('marketwatch.com') || lowerDomain.includes('tradingview.com') ||
      lowerDomain.includes('coinmarketcap.com') || lowerDomain.includes('coingecko.com') ||
      lowerDomain.includes('binance.com') || lowerDomain.includes('coinbase.com') ||
      lowerDomain.includes('bi.go.id') || lowerDomain.includes('ojk.go.id') ||
      lowerUrl.includes('/market') || lowerUrl.includes('/bursa') || lowerUrl.includes('/saham')
    ) {
      return 'finance';
    }

    // 8. E-Commerce & Retail
    if (
      lowerDomain.includes('shopee') || lowerDomain.includes('tokopedia') ||
      lowerDomain.includes('amazon') || lowerDomain.includes('ebay') ||
      lowerDomain.includes('aliexpress') || lowerDomain.includes('bukalapak') ||
      lowerDomain.includes('blibli') || lowerDomain.includes('lazada')
    ) {
      return 'ecommerce';
    }

    // 9. Entertainment & Gaming
    if (
      lowerDomain.includes('youtube.com') || lowerDomain.includes('netflix.com') ||
      lowerDomain.includes('twitch.tv') || lowerDomain.includes('spotify.com') ||
      lowerDomain.includes('steampowered.com') || lowerDomain.includes('imdb.com') ||
      lowerDomain.includes('rottentomatoes.com') || lowerDomain.includes('ign.com')
    ) {
      return 'entertainment';
    }

    return 'general';
  }

  /**
   * Computes estimated reading time in minutes
   */
  static calculateReadingTime(wordCount = 0) {
    if (!wordCount || wordCount < 50) return 1;
    // Average reading speed: 200 words per minute
    return Math.max(1, Math.ceil(wordCount / 200));
  }
}

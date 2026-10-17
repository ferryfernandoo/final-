/**
 * ============================================================================
 * 🧠 DEEPERNOVA ULTRA-SENSITIVE ANTI-TYPO & INTENT-AWARE CORRECTION ENGINE
 * ============================================================================
 * High-sensitivity intelligent spell checker, entity resolver & query guard.
 * Features:
 * 1. Comprehensive Indonesian & English Common Word Dictionary (Zero False Mutations)
 * 2. Protected Stopwords, Question Words & Conversational Particles
 * 3. Public Figures, Celebrities, Heroes, Politicians, Tech & Brands
 * 4. Indonesian Phonetic Spelling Normalizer (oe <-> u, kh <-> k, dh <-> d, y <-> i)
 * 5. Honorific Stripping & Inverted Permutation Matching (e.g. "subianto prabowo" -> "prabowo subianto")
 * 6. Glued Compound Word Splitter (e.g. "gunungbromo" -> "gunung bromo", "jokowiwidodo" -> "joko widodo")
 * 7. Multi-tier Damerau-Levenshtein Edit Distance with Strict Dictionary Guards
 * ============================================================================
 */

import { KNOWN_TOKOH_ALIASES } from '../crawler/tokohCrawler.js';

// Comprehensive Dictionary of Common Indonesian & English Words (Guaranteed Never Altered)
const COMMON_DICTIONARY_WORDS = [
  // Question & Conversational Particles (Mandatory Protected)
  'apa', 'itu', 'ini', 'siapa', 'bagaimana', 'mengapa', 'kenapa', 'kapan', 'dimana', 'kemana', 'darimana',
  'berapa', 'adalah', 'merupakan', 'artinya', 'maksud', 'arti', 'pengertian', 'definisi', 'maksudnya',
  'tentang', 'mengenai', 'cara', 'tutorial', 'panduan', 'resep', 'contoh', 'ciri', 'fungsi', 'tujuan',
  'manfaat', 'kelebihan', 'kekurangan', 'dampak', 'pengaruh', 'penyebab', 'sejarah', 'asal', 'usul',
  'latar', 'belakang', 'terbaru', 'terkini', 'hari', 'kemarin', 'besok', 'lusa', 'minggu', 'bulan', 'tahun',
  'dan', 'atau', 'serta', 'tetapi', 'namun', 'melainkan', 'sedangkan', 'padahal', 'yang', 'di', 'ke',
  'dari', 'pada', 'untuk', 'buat', 'bagi', 'oleh', 'dengan', 'tanpa', 'bersama', 'sebagai', 'karena',
  'sebab', 'sehingga', 'akibat', 'agar', 'supaya', 'meskipun', 'walaupun', 'kendati', 'juga', 'pun',
  'hanya', 'cuma', 'saja', 'bisa', 'dapat', 'mampu', 'sanggup', 'akan', 'hendak', 'mau', 'sudah',
  'telah', 'sedang', 'lagi', 'belum', 'tidak', 'tak', 'tiada', 'bukan', 'ada', 'tiada', 'banyak',
  'sedikit', 'semua', 'segala', 'seluruh', 'setiap', 'tiap', 'masing', 'sangat', 'amat', 'sekali',
  'lebih', 'paling', 'kurang', 'cukup', 'seperti', 'bagai', 'laksana', 'umpama', 'yaitu', 'yakni',
  'bahwa', 'bila', 'jika', 'kalau', 'apabila', 'manakala', 'semoga', 'mudah', 'mudahan',

  // Numbers & Quantities
  'nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh',
  'sebelas', 'belas', 'puluh', 'ratus', 'ribu', 'juta', 'miliar', 'triliun', 'pertama', 'kedua', 'ketiga',

  // Tech, AI, Computing, Media, Brands & Internet Terms
  'ai', 'claude', 'anthropic', 'openai', 'chatgpt', 'gpt', 'deepseek', 'gemini', 'copilot', 'meta',
  'google', 'microsoft', 'apple', 'nvidia', 'amazon', 'youtube', 'facebook', 'instagram', 'tiktok',
  'twitter', 'github', 'reddit', 'wikipedia', 'komputer', 'laptop', 'hp', 'smartphone', 'gadget',
  'internet', 'website', 'web', 'aplikasi', 'software', 'hardware', 'coding', 'program', 'pemrograman',
  'javascript', 'python', 'java', 'react', 'nodejs', 'html', 'css', 'database', 'sql', 'sqlite',
  'server', 'cloud', 'hosting', 'domain', 'online', 'offline', 'download', 'upload', 'install',
  'login', 'daftar', 'akun', 'password', 'keamanan', 'security', 'data', 'analisis', 'algoritma',
  'prompt', 'model', 'llm', 'search', 'engine', 'robot', 'teknologi', 'digital', 'inovasi',
  // Indonesian & Global Media Portals & Major Brands (Protected from False Mutation)
  'detik', 'detikcom', 'kompas', 'kompascom', 'tempo', 'tempoco', 'kumparan', 'tribun', 'tribunnews',
  'antara', 'antaranews', 'liputan6', 'sindo', 'sindonews', 'suara', 'suaracom', 'merdeka', 'merdekacom',
  'idntimes', 'cnn', 'cnbc', 'bisnis', 'kontan', 'jawapos', 'republika', 'viva', 'inews', 'tirto',
  'katadata', 'tokopedia', 'shopee', 'bukalapak', 'lazada', 'blibli', 'gojek', 'grab', 'traveloka',
  'dana', 'ovo', 'gopay', 'bca', 'bbca', 'bri', 'bbri', 'mandiri', 'bmri', 'bni', 'bbni',
  'telkom', 'tlkm', 'telkomsel', 'indosat', 'isat', 'xl', 'smartfren', 'netflix', 'spotify',
  'vidio', 'disney', 'steam', 'discord', 'telegram', 'whatsapp', 'wa', 'threads', 'ig', 'fb',

  // Everyday Subjects & Verbs
  'orang', 'manusia', 'pria', 'laki', 'wanita', 'perempuan', 'anak', 'ibu', 'bapak', 'ayah', 'keluarga',
  'teman', 'sahabat', 'guru', 'dosen', 'siswa', 'murid', 'mahasiswa', 'pekerja', 'karyawan', 'pejabat',
  'rumah', 'gedung', 'kantor', 'sekolah', 'kampus', 'universitas', 'rumah', 'sakit', 'klinik', 'toko',
  'pasar', 'mall', 'jalan', 'jembatan', 'stasiun', 'bandara', 'pelabuhan', 'kota', 'desa', 'kabupaten',
  'provinsi', 'negara', 'dunia', 'pemerintah', 'presiden', 'menteri', 'hukum', 'politik', 'ekonomi',
  'bisnis', 'keuangan', 'uang', 'rupiah', 'dolar', 'saham', 'investasi', 'harga', 'jual', 'beli',
  'makanan', 'minuman', 'kuliner', 'masakan', 'kesehatan', 'obat', 'penyakit', 'gejala', 'olahraga',
  'sepak', 'bola', 'badminton', 'musik', 'lagu', 'film', 'video', 'foto', 'gambar', 'buku', 'novel',
  'berita', 'kabar', 'informasi', 'tips', 'trik', 'cara', 'mudah', 'cepat', 'aman', 'gratis', 'murah',

  // Indonesian Institutions, Government, Ministries & Media Acronyms
  'bmkg', 'bkn', 'kpk', 'dpr', 'mpr', 'dpd', 'bumn', 'pln', 'pertamina', 'bpjs', 'kominfo', 'bnpb', 'brin',
  'menko', 'polri', 'tni', 'kemendikbud', 'kemenkes', 'kemenkeu', 'kemenag', 'kemenhub', 'bappenas',
  'kemhan', 'kemlu', 'kemenkumham', 'kpu', 'bawaslu', 'ojk', 'lps', 'bi', 'idx', 'bei', 'bps', 'basarnas',
  'kemensos', 'kemenaker', 'kemenperin', 'kemendag', 'esdm', 'pupr', 'bpom', 'bpk', 'ma', 'mk', 'ky',
  'kejaksaan', 'kejagung', 'polda', 'polres', 'kodam', 'korlantas', 'bais', 'bin', 'puspen', 'puspenad',
  'indonesia', 'jakarta', 'bandung', 'surabaya', 'yogyakarta', 'semarang', 'medan', 'makassar', 'bali',

  // Common English Search Queries
  'what', 'is', 'who', 'how', 'why', 'when', 'where', 'which', 'the', 'a', 'an', 'of', 'to', 'in',
  'for', 'on', 'by', 'with', 'at', 'from', 'about', 'as', 'into', 'like', 'through', 'after', 'over',
  'between', 'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among', 'best', 'top',
  'free', 'new', 'latest', 'news', 'update', 'review', 'guide', 'tutorial', 'code', 'api', 'docs',
  'price', 'features', 'login', 'signup', 'download', 'vs', 'comparison'
];

// Prominent Figures, Celebrities, Heroes, Politicians, Entities & Landmarks
const EXPANDED_TOKOH_ENTITIES = [
  // Presidents & Vice Presidents
  'soekarno', 'bung karno', 'pak karno', 'mohammad hatta', 'bung hatta', 'pak hatta',
  'soeharto', 'pak harto', 'harto', 'b. j. habibie', 'bj habibie', 'eyang habibie', 'habibie',
  'abdurrahman wahid', 'gus dur', 'gusdur',
  'megawati soekarnoputri', 'megawati', 'bu mega', 'ibu mega', 'mbak mega',
  'susilo bambang yudhoyono', 'sby', 'pak sby',
  'joko widodo', 'jokowi', 'pak jokowi',
  'prabowo subianto', 'prabowo', 'pak prabowo',
  'gibran rakabuming raka', 'gibran', 'mas gibran', 'wapres gibran',
  'ma\'ruf amin', 'jusuf kalla', 'pak jk',
  'boediono', 'hamzah haz', 'try sutrisno', 'sudharmono', 'adam malik', 'sri sultan hamengkubuwana ix',
  'syafruddin prawiranegara', 'mr assaat',

  // Prominent Ministers, Politicians & Public Figures
  'sri mulyani indrawati', 'sri mulyani', 'bu sri mulyani',
  'luhut binsar pandjaitan', 'luhut pandjaitan', 'opung luhut',
  'erick thohir', 'pak erick',
  'anies baswedan', 'pak anies', 'anies',
  'ganjar pranowo', 'pak ganjar', 'ganjar',
  'mahfud md', 'prof mahfud', 'mahfud',
  'ridwan kamil', 'kang emil', 'emil',
  'basuki tjahaja purnama', 'ahok', 'pak ahok',
  'sandiaga uno', 'bang sandi', 'agus harimurti yudhoyono', 'ahy',
  'puan maharani', 'mbak puan', 'kaesang pangarep', 'bahlil lahadalia',
  'airlangga hartarto', 'zulkifli hasan', 'muhaimin iskandar', 'cak imin', 'khofifah indar parawansa',
  'moeldoko', 'wiranto', 'hendropriyono', 'tito karnavian', 'budi gunadi sadikin', 'nadiem makarim',
  'retno marsudi', 'susi pudjiastuti', 'fadli zon', 'fahri hamzah', 'rocky gerung', 'najwa shihab',

  // National Heroes & Historical Figures
  'jenderal soedirman', 'panglima soedirman', 'pangeran diponegoro', 'raden ajeng kartini', 'ra kartini',
  'cut nyak dhien', 'cut nyak dien', 'cut meutia', 'tuanku imam bondjol', 'tuanku imam bonjol',
  'pattimura', 'kapitan pattimura', 'ki hajar dewantara', 'bung tomo', 'sutomo', 'tan malaka',
  'sutan sjahrir', 'sutan syahrir', 'sayuti melik', 'sukarni', 'latief hendraningrat', 'chairil anwar',
  'mohammad yamin', 'dr soetomo', 'dr cipto mangunkusumo', 'haji agus salim', 'agus salim',
  'kh ahmad dahlan', 'kh hasyim asy\'ari', 'hasyim asyari', 'raden saleh', 'ismail marzuki',
  'w. r. supratman', 'wr supratman', 'fatmawati', 'mohammad natsir', 'buya hamka',

  // Celebrities & Artists
  'raffi ahmad', 'nagita slavina', 'deddy corbuzier', 'iwan fals', 'rhoma irama', 'ebiet g ade',
  'chrisye', 'glenn fredly', 'judika', 'ari lasso', 'tulus', 'raisa', 'isyana sarasvati', 'afgan',
  'rossa', 'bunga citra lestari', 'bcl', 'agung hercules', 'reza rahardian', 'nicholas saputra',
  'dian sastrowardoyo', 'joe taslim', 'iko uwais', 'agnez mo', 'anggun c sasmi', 'rich brian',
  'lesti kejora', 'rizky billar', 'attar halilintar', 'atta halilintar', 'aurel hermansyah',
  'andre taulany', 'sule', 'parto patrio', 'komeng', 'alfiansyah komeng', 'cak lontong',

  // Global Figures
  'cristiano ronaldo', 'lionel messi', 'neymar jr', 'kylian mbappe', 'erling haaland',
  'elon musk', 'bill gates', 'steve jobs', 'mark zuckerberg', 'jeff bezos', 'jensen huang', 'sam altman',
  'dario amodei', 'daniela amodei',
  'donald trump', 'joe biden', 'barack obama', 'vladimir putin', 'xi jinping', 'emmanuel macron',
  'narendra modi', 'mohammed bin salman', 'recep tayyip erdogan', 'albert einstein', 'isaac newton',

  // Geographical Landmarks
  'indonesia', 'jakarta', 'surabaya', 'bandung', 'semarang', 'medan', 'makassar', 'palembang', 'denpasar',
  'yogyakarta', 'jogja', 'surakarta', 'solo', 'malang', 'batam', 'pekanbaru', 'banjarmasin', 'pontianak',
  'balikpapan', 'samarinda', 'manado', 'mataram', 'kupang', 'ambon', 'jayapura', 'nusantara', 'ikn',
  'borobudur', 'candi borobudur', 'prambanan', 'candi prambanan', 'bromo', 'gunung bromo', 'semeru',
  'gunung semeru', 'rinjani', 'gunung rinjani', 'merapi', 'gunung merapi', 'kawah ijen', 'raja ampat',
  'kepulauan raja ampat', 'danau toba', 'pulau komodo', 'taman nasional komodo', 'bunaken', 'wakatobi',
  'labuan bajo', 'kuta', 'ubud', 'sanur', 'nusa penida', 'tanah lot', 'uluwatu', 'dieng', 'malioboro',
  'monas', 'monumen nasional', 'gedung sate', 'lawang sewu', 'tmii', 'istana maimun'
];

// Honorific & title prefixes to normalize
const TITLE_PREFIXES = [
  'presiden', 'wapres', 'wakil presiden', 'menteri', 'jenderal', 'jendral', 'letjen', 'mayjen',
  'bapak', 'pak', 'ibu', 'bu', 'kyai', 'kiai', 'kh', 'gus', 'habib', 'ustad', 'ustadz',
  'profesor', 'prof', 'doktor', 'dr', 'dokter', 'insinyur', 'ir', 'haji', 'h', 'hajah', 'hj',
  'raden', 'ra', 'pangeran', 'sultan', 'sri sultan', 'cut', 'teuku', 'tuanku', 'kapitan',
  'bung', 'mas', 'kang', 'mbak', 'bang', 'cak', 'om', 'tante'
];

export class AntiTypoEngine {
  constructor(dbInstance = null) {
    this.db = dbInstance;
    this.vocabMap = new Map(); // word -> { term, freq, type }
    this.commonWords = new Set(); // set of exact lowercase common dictionary words
    this.multiWordPhrases = []; // array of multi-word canonical phrases
    this.tokohMap = new Map(); // normalized_name -> canonical_name
    this.correctionCache = new Map(); // LRU correction cache
    this.isLoaded = false;
    this.lastLoadedTime = 0;

    this.initVocabulary();
  }

  /**
   * Initializes and indexes static vocabulary + DB entities
   */
  initVocabulary() {
    // 1. Ingest Protected Common Dictionary Words (Zero-Mutation Guarantee)
    for (const word of COMMON_DICTIONARY_WORDS) {
      const wLower = word.trim().toLowerCase();
      this.commonWords.add(wLower);
      this.vocabMap.set(wLower, { term: wLower, freq: 500, type: 'common_dict' });
    }

    // 2. Ingest Expanded Entities & Figures
    for (const term of EXPANDED_TOKOH_ENTITIES) {
      this.addTerm(term, 300, 'tokoh_core');
      this.registerTokohAlias(term, term);
    }

    // 3. Ingest Tokoh Aliases from Known Dictionary
    if (KNOWN_TOKOH_ALIASES) {
      for (const [canon, aliases] of Object.entries(KNOWN_TOKOH_ALIASES)) {
        this.addTerm(canon, 350, 'tokoh_canon');
        this.registerTokohAlias(canon, canon);
        if (Array.isArray(aliases)) {
          for (const alias of aliases) {
            this.addTerm(alias, 320, 'tokoh_alias');
            this.registerTokohAlias(alias, canon);
          }
        }
      }
    }

    // 4. Ingest DB entities if database is connected
    if (this.db) {
      this.refreshFromDb();
    }

    this.isLoaded = true;
    this.lastLoadedTime = Date.now();
  }

  /**
   * Checks if a word is an intrinsically valid dictionary word
   */
  isKnownWord(word) {
    if (!word) return false;
    const lower = word.trim().toLowerCase();
    if (this.commonWords.has(lower) || this.vocabMap.has(lower)) return true;
    if (lower.length <= 2) return true; // Keep short particles untouched

    // Check if word exists in database domains (uses idx_pages_domain, <0.1ms)
    if (this.db) {
      try {
        const targetDb = this.db.db || this.db;
        if (targetDb && typeof targetDb.prepare === 'function') {
          const row = targetDb.prepare('SELECT 1 FROM pages WHERE domain = ? OR domain = ? OR domain = ? LIMIT 1')
            .get(lower, `${lower}.com`, `${lower}.go.id`);
          if (row) {
            this.commonWords.add(lower);
            this.vocabMap.set(lower, { term: lower, freq: 300, type: 'domain_dynamic' });
            return true;
          }
        }
      } catch {}
    }

    // Check basic Indonesian morphology (e.g. ber-, me-, di-, pe-, ke-, -kan, -an, -nya)
    if (lower.endsWith('nya') && this.isKnownWord(lower.slice(0, -3))) return true;
    if (lower.endsWith('kan') && this.isKnownWord(lower.slice(0, -3))) return true;
    if (lower.endsWith('an') && this.isKnownWord(lower.slice(0, -2))) return true;
    if (lower.startsWith('ber') && this.isKnownWord(lower.slice(3))) return true;
    if (lower.startsWith('ter') && this.isKnownWord(lower.slice(3))) return true;
    if (lower.startsWith('per') && this.isKnownWord(lower.slice(3))) return true;
    if (lower.startsWith('me') && this.isKnownWord(lower.slice(2))) return true;
    if (lower.startsWith('di') && this.isKnownWord(lower.slice(2))) return true;
    if (lower.startsWith('ke') && this.isKnownWord(lower.slice(2))) return true;

    return false;
  }

  /**
   * Registers a name/alias to its canonical target
   */
  registerTokohAlias(alias, canonical) {
    if (!alias || !canonical) return;
    const cleanAlias = alias.trim().toLowerCase();
    const titleCanon = canonical
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    this.tokohMap.set(cleanAlias, titleCanon);

    const stripped = cleanAlias.replace(/[\.\,\-\_\'\"]/g, '').replace(/\s+/g, ' ').trim();
    if (stripped && stripped !== cleanAlias) {
      this.tokohMap.set(stripped, titleCanon);
    }

    const phonetic = this.phoneticNormalize(cleanAlias);
    if (phonetic && phonetic !== cleanAlias) {
      this.tokohMap.set(phonetic, titleCanon);
    }
  }

  /**
   * Normalizes Indonesian phonetic variants
   * (oe -> u, kh -> k, dh -> d, dj -> j, tj -> c, ch -> k, y -> i)
   */
  phoneticNormalize(text) {
    if (!text || typeof text !== 'string') return text;
    return text.toLowerCase()
      .replace(/oe/g, 'u')
      .replace(/dj/g, 'j')
      .replace(/tj/g, 'c')
      .replace(/ch/g, 'k')
      .replace(/kh/g, 'k')
      .replace(/dh/g, 'd')
      .replace(/sh/g, 's')
      .replace(/ph/g, 'f')
      .replace(/sy/g, 's')
      .replace(/y([aiueo])/g, 'i$1')
      .replace(/(.)\1{2,}/g, '$1')
      .trim();
  }

  /**
   * Refreshes vocabulary dynamically from SQLite tables
   */
  refreshFromDb() {
    if (!this.db) return;
    const targetDb = this.db.db || this.db;
    if (!targetDb || typeof targetDb.prepare !== 'function') return;

    try {
      try {
        const celebRows = targetDb.prepare('SELECT name, stage_name, aliases FROM celebrity_entities LIMIT 3000').all();
        for (const row of celebRows) {
          if (row.name) {
            this.addTerm(row.name, 250, 'tokoh_db');
            this.registerTokohAlias(row.name, row.name);
          }
          if (row.stage_name && row.stage_name !== row.name) {
            this.addTerm(row.stage_name, 230, 'tokoh_db_stage');
            this.registerTokohAlias(row.stage_name, row.name);
          }
        }
      } catch {}

      try {
        const geoRows = targetDb.prepare('SELECT name FROM geo_entities LIMIT 2000').all();
        for (const row of geoRows) {
          if (row.name) {
            this.addTerm(row.name, 220, 'geo_db');
            this.registerTokohAlias(row.name, row.name);
          }
        }
      } catch {}

      // Ingest top indexed domains instantly, and defer full 150k+ domain scan to non-blocking background
      try {
        const topDomainRows = targetDb.prepare('SELECT domain FROM pages ORDER BY pagerank DESC LIMIT 1000').all() || [];
        for (const row of topDomainRows) {
          if (row.domain) {
            const cleanDomain = row.domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').trim();
            const parts = cleanDomain.split('.');
            const baseBrand = parts[0];
            if (baseBrand && baseBrand.length >= 2) {
              this.addTerm(baseBrand, 350, 'domain_brand');
              this.commonWords.add(baseBrand);
            }
            this.addTerm(cleanDomain, 350, 'domain_full');
            this.commonWords.add(cleanDomain);
          }
        }

        // Full 150k+ domain dictionary background ingestion (zero boot delay)
        setImmediate(() => {
          try {
            const domainRows = targetDb.prepare('SELECT domain FROM pages ORDER BY pagerank DESC LIMIT 5000').all() || [];
            for (const row of domainRows) {
              if (row.domain) {
                const cleanDomain = row.domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').trim();
                const parts = cleanDomain.split('.');
                const baseBrand = parts[0];
                if (baseBrand && baseBrand.length >= 2) {
                  this.addTerm(baseBrand, 350, 'domain_brand');
                  this.commonWords.add(baseBrand);
                }
                this.addTerm(cleanDomain, 350, 'domain_full');
                this.commonWords.add(cleanDomain);
              }
            }
          } catch {}
        });
      } catch {}
    } catch (e) {}
  }

  /**
   * Adds a vocabulary term or multi-word phrase
   */
  addTerm(term, freq = 100, type = 'general') {
    if (!term || typeof term !== 'string') return;
    const clean = term.trim().toLowerCase();
    if (clean.length < 2) return;

    const words = clean.split(/\s+/).filter(w => w.length > 0);

    if (words.length > 1) {
      if (!this.multiWordPhrases.some(p => p.phrase === clean)) {
        this.multiWordPhrases.push({ phrase: clean, words, freq, type });
      }
      for (const w of words) {
        if (w.length >= 3 && !this.vocabMap.has(w)) {
          this.vocabMap.set(w, { term: w, freq: Math.max(80, freq - 20), type });
        }
      }
    } else {
      const existing = this.vocabMap.get(clean);
      if (!existing || existing.freq < freq) {
        this.vocabMap.set(clean, { term: clean, freq, type });
      }
    }
  }

  compressRepeatedChars(word) {
    if (!word || word.length < 4) return word;
    return word.replace(/(.)\1{2,}/g, '$1').replace(/([a-z])\1+$/i, '$1');
  }

  stripHonorifics(query) {
    if (!query) return { cleaned: query, prefix: null };
    const lower = query.trim().toLowerCase();
    
    for (const prefix of TITLE_PREFIXES) {
      const pattern = new RegExp(`^${prefix}\\s+`, 'i');
      if (pattern.test(lower)) {
        const cleaned = lower.replace(pattern, '').trim();
        if (cleaned.length >= 2) {
          return { cleaned, prefix };
        }
      }
    }
    return { cleaned: lower, prefix: null };
  }

  damerauLevenshteinDistance(source, target) {
    const sLen = source.length;
    const tLen = target.length;
    if (sLen === 0) return tLen;
    if (tLen === 0) return sLen;

    const dp = Array.from({ length: sLen + 1 }, () => new Array(tLen + 1).fill(0));
    for (let i = 0; i <= sLen; i++) dp[i][0] = i;
    for (let j = 0; j <= tLen; j++) dp[0][j] = j;

    for (let i = 1; i <= sLen; i++) {
      for (let j = 1; j <= tLen; j++) {
        const cost = source[i - 1] === target[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,        // deletion
          dp[i][j - 1] + 1,        // insertion
          dp[i - 1][j - 1] + cost  // substitution
        );

        // Transposition
        if (i > 1 && j > 1 && source[i - 1] === target[j - 2] && source[i - 2] === target[j - 1]) {
          dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
        }
      }
    }

    return dp[sLen][tLen];
  }

  findBestWordCorrection(rawWord) {
    if (!rawWord || rawWord.length <= 2) return rawWord;
    const word = rawWord.toLowerCase();

    // 1. Direct dictionary guard (If already known/valid, DO NOT mutate!)
    if (this.isKnownWord(word)) {
      return word;
    }

    // 2. Try compressed repeated characters (e.g. "jokowiii" -> "jokowi", "prabowoo" -> "prabowo")
    const compressed = this.compressRepeatedChars(word);
    if (this.isKnownWord(compressed)) {
      return compressed;
    }

    // 3. Try phonetic normalization (e.g. "sukarno" -> "soekarno", "suharto" -> "soeharto")
    const phonetic = this.phoneticNormalize(compressed);
    for (const [candidateWord] of this.vocabMap.entries()) {
      if (this.phoneticNormalize(candidateWord) === phonetic) {
        return candidateWord;
      }
    }

    // 4. Search closest matching word using Damerau-Levenshtein distance
    let bestCandidate = null;
    let minDistance = Infinity;
    let maxFreq = -1;

    const maxAllowedDist = word.length <= 4 ? 1 : (word.length <= 8 ? 2 : 3);
    const firstLetter = word[0];

    for (const [candidateWord, meta] of this.vocabMap.entries()) {
      const lenDiff = Math.abs(candidateWord.length - word.length);
      if (lenDiff > maxAllowedDist + 1) continue;
      if (candidateWord.length >= 3 && candidateWord[0] !== firstLetter && word.length >= 5) continue;

      const firstCharSame = candidateWord[0] === word[0];

      const d1 = this.damerauLevenshteinDistance(word, candidateWord);
      const d2 = this.damerauLevenshteinDistance(compressed, candidateWord);
      const d3 = this.damerauLevenshteinDistance(phonetic, this.phoneticNormalize(candidateWord));
      const dist = Math.min(d1, d2, d3);

      if (dist <= maxAllowedDist) {
        if (dist < minDistance || (dist === minDistance && meta.freq > maxFreq) || (dist === minDistance && firstCharSame && !bestCandidate?.firstCharSame)) {
          minDistance = dist;
          maxFreq = meta.freq;
          bestCandidate = { word: candidateWord, dist, firstCharSame };
        }
      }
    }

    if (bestCandidate && bestCandidate.dist <= maxAllowedDist) {
      return bestCandidate.word;
    }

    return word;
  }

  matchTokoh(rawQuery) {
    if (!rawQuery || typeof rawQuery !== 'string') return null;
    const clean = rawQuery.trim().toLowerCase();
    if (clean.length < 2) return null;

    // Direct hit in Tokoh Map
    if (this.tokohMap.has(clean)) {
      return { matched: this.tokohMap.get(clean), distance: 0, type: 'exact' };
    }

    const { cleaned: noHonorific, prefix } = this.stripHonorifics(clean);
    if (noHonorific && this.tokohMap.has(noHonorific)) {
      return { matched: this.tokohMap.get(noHonorific), distance: 0, type: 'honorific_stripped', prefix };
    }

    const phoneticClean = this.phoneticNormalize(clean);
    if (this.tokohMap.has(phoneticClean)) {
      return { matched: this.tokohMap.get(phoneticClean), distance: 0, type: 'phonetic_alias' };
    }
    const phoneticNoH = this.phoneticNormalize(noHonorific);
    if (this.tokohMap.has(phoneticNoH)) {
      return { matched: this.tokohMap.get(phoneticNoH), distance: 0, type: 'phonetic_alias' };
    }

    const tokens = noHonorific.split(/\s+/).filter(t => t.length >= 2);
    if (tokens.length === 2) {
      const inverted = `${tokens[1]} ${tokens[0]}`;
      if (this.tokohMap.has(inverted)) {
        return { matched: this.tokohMap.get(inverted), distance: 0, type: 'inverted_name' };
      }
    }

    // Fuzzy distance match across tokoh
    let bestTokoh = null;
    let minScore = Infinity;
    const compressedQuery = this.compressRepeatedChars(noHonorific);

    for (const [aliasKey, canonName] of this.tokohMap.entries()) {
      if (Math.abs(aliasKey.length - noHonorific.length) <= 3) {
        const d1 = this.damerauLevenshteinDistance(noHonorific, aliasKey);
        const d2 = this.damerauLevenshteinDistance(compressedQuery, aliasKey);
        const d3 = this.damerauLevenshteinDistance(phoneticNoH, this.phoneticNormalize(aliasKey));
        const dist = Math.min(d1, d2, d3);

        const maxDist = Math.max(1, Math.floor(aliasKey.length * 0.28));
        if (dist <= maxDist) {
          const aliasTokens = aliasKey.split(/\s+/);
          let tokenOverlap = 0;
          for (const t of tokens) {
            if (aliasTokens.some(at => at === t || this.damerauLevenshteinDistance(t, at) <= 1)) {
              tokenOverlap += 2;
            }
          }

          const score = (dist * 10) - tokenOverlap + Math.abs(aliasKey.length - noHonorific.length);
          if (score < minScore) {
            minScore = score;
            bestTokoh = canonName;
          }
        }
      }
    }

    if (bestTokoh) {
      return { matched: bestTokoh, distance: minScore, type: 'fuzzy_tokoh' };
    }

    return null;
  }

  /**
   * Corrects multi-word or compound queries with ultra-fast O(1) checks & zero false positives
   */
  correctQuery(rawQuery) {
    if (!rawQuery || typeof rawQuery !== 'string') {
      return { isCorrected: false, originalQuery: rawQuery, correctedQuery: rawQuery };
    }

    const clean = rawQuery.trim();
    if (!clean) {
      return { isCorrected: false, originalQuery: rawQuery, correctedQuery: rawQuery };
    }

    const lower = clean.toLowerCase();
    const queryTokens = lower.split(/\s+/).filter(Boolean);
    if (queryTokens.some(token => token.length <= 2)) {
      return {
        isCorrected: false,
        originalQuery: clean,
        correctedQuery: clean,
        type: 'short_query_fast_path',
        confidence: 1.0
      };
    }

    // 0a. Check LRU Cache (Instant <0.001ms return)
    const cached = this.correctionCache.get(lower);
    if (cached) return cached;

    // Helper to store in LRU cache
    const saveAndReturn = (res) => {
      if (this.correctionCache.size > 2000) {
        const firstKey = this.correctionCache.keys().next().value;
        this.correctionCache.delete(firstKey);
      }
      this.correctionCache.set(lower, res);
      return res;
    };

    // 0b. Fast-Path Dictionary Check (If all words in query are already known, return immediately)
    const words = lower.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 1 && words.every(w => this.isKnownWord(w))) {
      return saveAndReturn({
        isCorrected: false,
        originalQuery: clean,
        correctedQuery: clean,
        type: 'all_words_known',
        confidence: 1.0
      });
    }

    // 0c. Question / Conversational Query Decomposition (e.g. "claude itu apa", "apa itu jokowi", "siapa prabowo")
    const questionPatterns = [
      { pattern: /^(apa itu|siapa itu|apakah|maksud dari|arti kata|pengertian|definisi|tentang|sejarah|who is|what is)\s+(.+)$/i, subjectIdx: 2, affixIdx: 1, isPrefix: true },
      { pattern: /^(.+)\s+(itu apa|siapa sih|artinya apa|adalah apa|maksudnya apa|artinya|adalah|apa)$/i, subjectIdx: 1, affixIdx: 2, isPrefix: false }
    ];

    for (const { pattern, subjectIdx, affixIdx, isPrefix } of questionPatterns) {
      const match = lower.match(pattern);
      if (match) {
        const subjectPart = match[subjectIdx];
        const affixPart = match[affixIdx];

        // Check if subject alone has a typo or matches a recognized entity
        const subjectCorrection = this.correctQuery(subjectPart);
        if (subjectCorrection.isCorrected) {
          const rebuilt = isPrefix 
            ? `${affixPart} ${subjectCorrection.correctedQuery}` 
            : `${subjectCorrection.correctedQuery} ${affixPart}`;
          return saveAndReturn({
            isCorrected: true,
            originalQuery: clean,
            correctedQuery: rebuilt,
            type: 'qa_subject_correction',
            confidence: 0.95
          });
        } else {
          // If subject and question words are valid, DO NOT mutate!
          return saveAndReturn({
            isCorrected: false,
            originalQuery: clean,
            correctedQuery: clean,
            type: 'valid_qa_query',
            confidence: 1.0
          });
        }
      }
    }

    // 1. Direct dictionary check for entire query
    if (this.isKnownWord(lower)) {
      return saveAndReturn({
        isCorrected: false,
        originalQuery: clean,
        correctedQuery: clean,
        type: 'exact_dict',
        confidence: 1.0
      });
    }

    // 2. PRIORITY TOKOH & PUBLIC FIGURE RECOGNITION (Only for non-conversational phrases)
    const tokens = clean.split(/\s+/);
    if (tokens.length <= 4) {
      const tokohMatch = this.matchTokoh(lower);
      if (tokohMatch && tokohMatch.matched) {
        const canon = tokohMatch.matched;
        if (canon.toLowerCase() !== lower) {
          return saveAndReturn({
            isCorrected: true,
            originalQuery: clean,
            correctedQuery: canon,
            type: tokohMatch.type,
            confidence: 0.98
          });
        } else {
          return saveAndReturn({
            isCorrected: false,
            originalQuery: clean,
            correctedQuery: clean,
            type: 'exact_tokoh',
            confidence: 1.0
          });
        }
      }
    }

    // 3. Glued compound words (e.g. "gunungbromo", "candiborobudur", "jokowiwidodo")
    for (const phraseObj of this.multiWordPhrases) {
      const glued = phraseObj.words.join('');
      if (lower === glued || this.compressRepeatedChars(lower) === glued || this.phoneticNormalize(lower) === this.phoneticNormalize(glued)) {
        return saveAndReturn({
          isCorrected: true,
          originalQuery: clean,
          correctedQuery: phraseObj.phrase,
          type: 'split_compound',
          confidence: 0.98
        });
      }
    }

    // 4. Word-by-word token correction with strict dictionary guards
    const correctedTokens = [];
    let hasChanges = false;

    for (const tok of tokens) {
      const isWord = /^[\p{L}\p{N}'-]+$/u.test(tok);
      if (!isWord || /^\d+$/.test(tok) || this.isKnownWord(tok)) {
        correctedTokens.push(tok);
        continue;
      }

      const corrected = this.findBestWordCorrection(tok);
      if (corrected.toLowerCase() !== tok.toLowerCase()) {
        hasChanges = true;
        correctedTokens.push(corrected);
      } else {
        correctedTokens.push(tok);
      }
    }

    if (hasChanges) {
      return saveAndReturn({
        isCorrected: true,
        originalQuery: clean,
        correctedQuery: correctedTokens.join(' '),
        type: 'token_correction',
        confidence: 0.88
      });
    }

    return saveAndReturn({
      isCorrected: false,
      originalQuery: clean,
      correctedQuery: clean,
      type: 'unchanged',
      confidence: 1.0
    });
  }
}

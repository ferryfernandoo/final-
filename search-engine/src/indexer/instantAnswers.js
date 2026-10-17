/**
 * ============================================================================
 * 🧠 DEEPERNOVA INSTANT ANSWERS & KNOWLEDGE GRAPH ENGINE
 * ============================================================================
 * Generates instantaneous, high-precision knowledge cards, live currency converters,
 * world maps, coordinates, scenic photo showcases, and deep geographical entities.
 * ============================================================================
 */

import { CurrencyEngine } from './currencyEngine.js';
import { MarketDataEngine } from './marketDataEngine.js';

class InstantAnswersLRUCache {
  constructor(maxSize = 10000, ttlMs = 15 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }
  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() - item.time > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.data;
  }
  set(key, data) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { data, time: Date.now() });
  }
  clear() {
    this.cache.clear();
  }
}

const instantAnswersCache = new InstantAnswersLRUCache(12000, 15 * 60 * 1000);


// Comprehensive Global & Indonesian Knowledge Entities
const KNOWLEDGE_GRAPH_ENTITIES = {
  // === ECOSYSTEM PRIORITY ===
  'deepernova': {
    title: 'DeeperNova',
    subtitle: 'Next-Generation Artificial Intelligence & High-Velocity Search Ecosystem',
    category: 'Technology & AI Ecosystem',
    description: 'DeeperNova adalah platform dan ekosistem kecerdasan buatan serta teknologi penelusuran berkecepatan tinggi yang dirancang untuk menyediakan pemrosesan data mendalam, analisis instan, dan pengindeksan web global berskala tinggi.',
    attributes: [
      { label: 'Tipe', value: 'AI & Web Intelligence Platform' },
      { label: 'Fokus', value: 'Autonomous Web Indexing, Neural Search, Deep Analytics' },
      { label: 'Situs Resmi', value: 'https://deepernova.com' },
      { label: 'Status', value: 'Active / High Authority' }
    ],
    verified: true
  },

  // === AI & TECH TITANS ===
  'deepseek': {
    title: 'DeepSeek',
    subtitle: 'Advanced Open-Source Artificial Intelligence Research Lab',
    category: 'Artificial Intelligence Company',
    description: 'DeepSeek adalah laboratorium riset kecerdasan buatan yang memelopori model bahasa besar sumber terbuka (open-source LLMs) berefisiensi tinggi seperti DeepSeek-V3 dan DeepSeek-R1 yang berbasiskan Mixture-of-Experts (MoE).',
    attributes: [
      { label: 'Model Terkenal', value: 'DeepSeek-R1, DeepSeek-V3, DeepSeek-Coder' },
      { label: 'Arsitektur', value: 'Multi-head Latent Attention (MLA), DeepSeekMoE' },
      { label: 'Situs Resmi', value: 'https://deepseek.com' },
      { label: 'Lisensi', value: 'Open Weights (MIT Licensed)' }
    ],
    verified: true
  },
  'openai': {
    title: 'OpenAI',
    subtitle: 'Artificial Intelligence Research & Deployment Organization',
    category: 'AI Research Lab',
    description: 'OpenAI adalah laboratorium riset kecerdasan buatan asal San Francisco yang menciptakan ChatGPT, GPT-4o, DALL-E, dan Sora, berfokus pada pengembangan Artificial General Intelligence (AGI) yang aman.',
    attributes: [
      { label: 'Didirikan', value: 'Desember 2015' },
      { label: 'CEO', value: 'Sam Altman' },
      { label: 'Produk Utama', value: 'ChatGPT, GPT-4o, o1, DALL-E 3, Sora' },
      { label: 'Situs Resmi', value: 'https://openai.com' }
    ],
    verified: true
  },
  'anthropic': {
    title: 'Anthropic',
    subtitle: 'AI Safety and Frontier Foundation Model Company',
    category: 'AI Research Company',
    description: 'Anthropic adalah perusahaan keselamatan dan riset AI yang mengembangkan model bahasa Claude 3.5 Sonnet dan Claude 3 Opus menggunakan Constitutional AI.',
    attributes: [
      { label: 'Didirikan', value: '2021 oleh Dario Amodei & Daniela Amodei' },
      { label: 'Model Terkenal', value: 'Claude 3.5 Sonnet, Claude 3 Opus, Claude 3.5 Haiku' },
      { label: 'Situs Resmi', value: 'https://www.anthropic.com' }
    ],
    verified: true
  },
  'claude': {
    title: 'Claude',
    subtitle: 'Next-Generation AI Assistant & Frontier Model by Anthropic',
    category: 'Artificial Intelligence Assistant',
    description: 'Claude adalah asisten kecerdasan buatan terdepan yang dikembangkan oleh Anthropic. Claude terkenal dengan kemampuan penalaran tingkat lanjut, pemahaman kode pemrograman, penulisan kreatif, serta arsitektur Constitutional AI yang aman dan andal.',
    attributes: [
      { label: 'Pengembang', value: 'Anthropic' },
      { label: 'Model Terkenal', value: 'Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus' },
      { label: 'Situs Resmi', value: 'https://claude.ai' },
      { label: 'Fokus', value: 'Coding, Reasoning, Long Context Window (200k+ tokens)' }
    ],
    verified: true
  },
  'claude ai': {
    title: 'Claude AI',
    subtitle: 'Next-Generation AI Assistant by Anthropic',
    category: 'Artificial Intelligence Assistant',
    description: 'Claude AI adalah platform dan model AI generatif buatan Anthropic yang dirancang untuk analisis data mendalam, pemrograman, penulisan dokumen, dan pemecahan masalah rumit.',
    attributes: [
      { label: 'Pengembang', value: 'Anthropic' },
      { label: 'Model', value: 'Claude 3.5 Sonnet / Haiku / Opus' },
      { label: 'Situs Resmi', value: 'https://claude.ai' }
    ],
    verified: true
  },
  'google': {
    title: 'Google',
    subtitle: 'Multinational Technology Conglomerate & Alphabet Subsidiary',
    category: 'Technology Company',
    description: 'Google adalah perusahaan teknologi global yang berspesialisasi dalam layanan internet, mesin pencari web, periklanan daring, komputasi awan, sistem operasi Android, dan AI (Google DeepMind & Gemini).',
    attributes: [
      { label: 'Pendiri', value: 'Larry Page & Sergey Brin (1998)' },
      { label: 'Induk Perusahaan', value: 'Alphabet Inc.' },
      { label: 'CEO', value: 'Sundar Pichai' },
      { label: 'Produk Utama', value: 'Google Search, Android, YouTube, Gemini, Chrome' }
    ],
    verified: true
  },

  // === COMPUTER SCIENCE & SEARCH ENGINES ===
  'pagerank': {
    title: 'PageRank Algorithm',
    subtitle: 'Algoritma Analisis Tautan Graf untuk Pengurutan Halaman Web',
    category: 'Computer Science & Information Retrieval',
    description: 'PageRank adalah algoritma matematika yang dikembangkan oleh Larry Page dan Sergey Brin untuk mengukur kepentingan relatif sebuah dokumen dalam kumpulan hiperteks berdasarkan struktur graf tautan (inbound links).',
    attributes: [
      { label: 'Penemu', value: 'Larry Page & Sergey Brin (1996)' },
      { label: 'Damping Factor', value: 'Biasanya d = 0.85' },
      { label: 'Konsep Inti', value: 'Random Surfer Model & Markov Chain' },
      { label: 'Aplikasi', value: 'Web Search Ranking, Social Network Graph Analysis' }
    ],
    verified: true
  },
  'bm25': {
    title: 'Okapi BM25',
    subtitle: 'Ranking Function for Full-Text Information Retrieval',
    category: 'Information Retrieval Algorithm',
    description: 'Okapi BM25 (Best Matching 25) adalah fungsi peringkat pencarian probabilistik berbasis Term Frequency (TF) dan Inverse Document Frequency (IDF) yang memperhitungkan saturasi frekuensi kata dan panjang dokumen.',
    attributes: [
      { label: 'Pengembang', value: 'Stephen E. Robertson & Karen Spärck Jones' },
      { label: 'Parameter Utama', value: 'k1 (Term saturation, ~1.2), b (Length normalization, ~0.75)' },
      { label: 'Penggunaan', value: 'Elasticsearch, SQLite FTS5, Lucene, Search Engines' }
    ],
    verified: true
  },
  'artificial intelligence': {
    title: 'Kecerdasan Buatan (Artificial Intelligence)',
    subtitle: 'Simulasi Kecerdasan Manusia oleh Sistem Komputer',
    category: 'Computer Science Discipline',
    description: 'Kecerdasan Buatan (AI) adalah cabang ilmu komputer yang berfokus pada penciptaan sistem cerdas yang mampu melakukan tugas yang biasanya memerlukan kecerdasan manusia, seperti penalaran, pemahaman bahasa, visi komputer, dan pemecahan masalah.',
    attributes: [
      { label: 'Sub-bidang', value: 'Machine Learning, Deep Learning, NLP, Computer Vision' },
      { label: 'Bapak AI', value: 'Alan Turing, John McCarthy, Marvin Minsky' },
      { label: 'Aplikasi Modern', value: 'LLM, Autonomous Vehicles, Robotics, Medical Diagnosis' }
    ],
    verified: true
  },

  // === PROMINENT PRESIDENTS & PUBLIC FIGURES ===
  'prabowo': {
    title: 'Prabowo Subianto',
    subtitle: 'Presiden Republik Indonesia ke-8',
    category: 'Negarawan & Pemimpin Nasional',
    description: 'Jenderal TNI (Purn.) H. Prabowo Subianto Djojohadikusumo adalah Presiden Republik Indonesia ke-8 yang menjabat sejak 20 Oktober 2024. Sebelumnya menjabat sebagai Menteri Pertahanan Republik Indonesia (2019–2024) dan Ketua Umum Partai Gerindra.',
    attributes: [
      { label: 'Jabatan', value: 'Presiden Republik Indonesia' },
      { label: 'Lahir', value: '17 Oktober 1951, Jakarta' },
      { label: 'Partai Politik', value: 'Gerindra' },
      { label: 'Wakil Presiden', value: 'Gibran Rakabuming Raka' }
    ],
    verified: true
  },
  'prabowo subianto': {
    title: 'Prabowo Subianto',
    subtitle: 'Presiden Republik Indonesia ke-8',
    category: 'Negarawan & Pemimpin Nasional',
    description: 'Jenderal TNI (Purn.) H. Prabowo Subianto Djojohadikusumo adalah Presiden Republik Indonesia ke-8 yang menjabat sejak 20 Oktober 2024. Sebelumnya menjabat sebagai Menteri Pertahanan Republik Indonesia (2019–2024) dan Ketua Umum Partai Gerindra.',
    attributes: [
      { label: 'Jabatan', value: 'Presiden Republik Indonesia' },
      { label: 'Lahir', value: '17 Oktober 1951, Jakarta' },
      { label: 'Wakil Presiden', value: 'Gibran Rakabuming Raka' }
    ],
    verified: true
  },
  'jokowi': {
    title: 'Joko Widodo (Jokowi)',
    subtitle: 'Presiden Republik Indonesia ke-7 (2014–2024)',
    category: 'Negarawan & Pemimpin Nasional',
    description: 'Ir. H. Joko Widodo adalah Presiden ke-7 Republik Indonesia yang menjabat selama dua periode dari 2014 hingga 2024. Terkenal dengan pembangunan infrastruktur masif nasional dan pemindahan Ibu Kota Negara ke IKN Nusantara.',
    attributes: [
      { label: 'Masa Jabatan', value: '20 Oktober 2014 – 20 Oktober 2024' },
      { label: 'Lahir', value: '21 Juni 1961, Surakarta' },
      { label: 'Kebijakan Utama', value: 'Infrastruktur Tol Trans-Jawa, Kereta Cepat Whoosh, Hilirisasi Nikel, IKN' }
    ],
    verified: true
  },
  'joko widodo': {
    title: 'Joko Widodo (Jokowi)',
    subtitle: 'Presiden Republik Indonesia ke-7 (2014–2024)',
    category: 'Negarawan & Pemimpin Nasional',
    description: 'Ir. H. Joko Widodo adalah Presiden ke-7 Republik Indonesia yang menjabat selama dua periode dari 2014 hingga 2024. Terkenal dengan pembangunan infrastruktur masif nasional dan pemindahan Ibu Kota Negara ke IKN Nusantara.',
    attributes: [
      { label: 'Masa Jabatan', value: '20 Oktober 2014 – 20 Oktober 2024' },
      { label: 'Lahir', value: '21 Juni 1961, Surakarta' }
    ],
    verified: true
  },
  'soekarno': {
    title: 'Ir. Soekarno (Bung Karno)',
    subtitle: 'Proklamator Kemerdekaan & Presiden Pertama Republik Indonesia',
    category: 'Pahlawan Nasional & Bapak Bangsa',
    description: 'Dr. (H.C.) Ir. H. Soekarno adalah Presiden pertama Republik Indonesia yang menjabat pada kurun 1945–1967. Bersama Mohammad Hatta, beliau memproklamasikan Kemerdekaan Indonesia pada 17 Agustus 1945 dan menggagas Pancasila sebagai dasar negara.',
    attributes: [
      { label: 'Gelar', value: 'Bapak Proklamator & Pahlawan Nasional' },
      { label: 'Lahir', value: '6 Juni 1901, Surabaya' },
      { label: 'Wafat', value: '21 Juni 1970, Jakarta (Makam di Blitar)' },
      { label: 'Gagasan Utama', value: 'Pancasila, Trisakti, Gerakan Non-Blok (Konferensi Asia-Afrika 1955)' }
    ],
    verified: true
  },
  'habibie': {
    title: 'B. J. Habibie',
    subtitle: 'Presiden Republik Indonesia ke-3 & Bapak Teknologi Indonesia',
    category: 'Pahlawan Nasional & Ilmuwan Dunia',
    description: 'Prof. Dr.-Ing. Ir. H. Bacharuddin Jusuf Habibie, FREng adalah Presiden ke-3 Republik Indonesia dan ilmuwan kedirgantaraan kelas dunia pencipta Pesawat N-250 Gatotkaca dan penemu Teori Keretakan Sayap Pesawat (Crack Propagation Theory / Habibie Factor).',
    attributes: [
      { label: 'Gelar', value: 'Bapak Teknologi Indonesia' },
      { label: 'Lahir', value: '25 Juni 1936, Parepare' },
      { label: 'Karya Terkenal', value: 'Pesawat N250 Gatotkaca, Rumus Habibie (Aeronautika)' }
    ],
    verified: true
  },
  'elon musk': {
    title: 'Elon Musk',
    subtitle: 'Tech Entrepreneur, CEO of Tesla, SpaceX & xAI',
    category: 'Business & Technology Leader',
    description: 'Elon Reeve Musk adalah pengusaha dan insinyur teknologi global, pendiri dan CEO SpaceX, arsitek produk Tesla Inc., pemilik X (Twitter), pendiri Neuralink, The Boring Company, dan xAI (Grok).',
    attributes: [
      { label: 'Perusahaan Utama', value: 'Tesla, SpaceX, xAI, Neuralink, Starlink, X' },
      { label: 'Lahir', value: '28 Juni 1971, Pretoria, Afrika Selatan' },
      { label: 'Fokus', value: 'Space Exploration, Electric Vehicles, Artificial Intelligence, Neural Interfaces' }
    ],
    verified: true
  },
  'sam altman': {
    title: 'Sam Altman',
    subtitle: 'CEO & Co-founder of OpenAI',
    category: 'Artificial Intelligence Leader',
    description: 'Samuel Harris Altman adalah pengusaha dan investor teknologi asal Amerika Serikat yang menjabat sebagai CEO OpenAI, mantan presiden inkubator startup Y Combinator, dan salah satu tokoh kunci era generative AI dunia.',
    attributes: [
      { label: 'Jabatan', value: 'CEO OpenAI' },
      { label: 'Produk Terkenal', value: 'ChatGPT, GPT-4o, OpenAI o1, Sora' },
      { label: 'Lahir', value: '22 April 1985, Chicago' }
    ],
    verified: true
  }
};

// ============================================================================
// 🗺️ COMPREHENSIVE GLOBAL & INDONESIAN GEOGRAPHICAL DATABASE WITH PHOTO GALLERIES
// ============================================================================
const GEO_LOCATIONS = {
  // === COUNTRIES OF THE WORLD ===
  'indonesia': {
    name: 'Republik Indonesia',
    shortName: 'Indonesia',
    type: 'country',
    category: 'Negara Berdaulat di Asia Tenggara',
    subtitle: 'Negara Kepulauan Terbesar di Dunia (Nusantara)',
    flag: '🇮🇩',
    lat: -0.7893,
    lng: 113.9213,
    zoom: 5,
    description: 'Indonesia adalah negara kepulauan terbesar di dunia yang membentang di garis khatulistiwa antara benua Asia dan Australia. Memiliki lebih dari 17.500 pulau dengan keindahan alam tropis tak tertandingi dan semboyan nasional Bhinneka Tunggal Ika.',
    capital: 'Jakarta (IKN Nusantara sebagai Ibu Kota Masa Depan)',
    population: '278,69 Juta Jiwa',
    area: '1.904.569 km²',
    currency: 'Rupiah (IDR / Rp)',
    timezone: 'WIB (UTC+7), WITA (UTC+8), WIT (UTC+9)',
    language: 'Bahasa Indonesia',
    phoneCode: '+62',
    hierarchy: 'Dunia > Asia > Asia Tenggara > Indonesia',
    photos: [
      { title: 'Candi Borobudur', location: 'Magelang, Jawa Tengah', url: 'https://images.unsplash.com/photo-1596405835955-465de5c3df77?w=800&auto=format&fit=crop&q=80', tag: 'Candi Buddha Terbesar di Dunia' },
      { title: 'Raja Ampat', location: 'Papua Barat Daya', url: 'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=800&auto=format&fit=crop&q=80', tag: 'Surga Bahari & Karang Dunia' },
      { title: 'Gunung Bromo', location: 'Jawa Timur', url: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?w=800&auto=format&fit=crop&q=80', tag: 'Lautan Pasir & Kaldera Megah' },
      { title: 'Nusa Penida', location: 'Bali', url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80', tag: 'Tebing Ikonik Pulau Dewata' }
    ]
  },
  'jepang': {
    name: 'Jepang (Japan)',
    shortName: 'Jepang',
    type: 'country',
    category: 'Negara Maju di Asia Timur',
    subtitle: 'Negeri Matahari Terbit (Nippon / Nihon)',
    flag: '🇯🇵',
    lat: 36.2048,
    lng: 138.2529,
    zoom: 5,
    description: 'Jepang adalah negara kepulauan di Asia Timur yang terkenal dengan perpaduan sempurna antara kemajuan teknologi futuristik dan pelestarian kebudayaan kuno bernilai estetika tinggi.',
    capital: 'Tokyo',
    population: '125,1 Juta Jiwa',
    area: '377.975 km²',
    currency: 'Yen Jepang (JPY / ¥)',
    timezone: 'JST (UTC+9)',
    language: 'Bahasa Jepang',
    phoneCode: '+81',
    hierarchy: 'Dunia > Asia > Asia Timur > Jepang',
    photos: [
      { title: 'Gunung Fuji & Bunga Sakura', location: 'Gunung Fuji', url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80', tag: 'Ikon Sakral Jepang' },
      { title: 'Fushimi Inari Taisha', location: 'Kyoto', url: 'https://images.unsplash.com/photo-1493780474015-ba834fd0ce2f?w=800&auto=format&fit=crop&q=80', tag: 'Gerbang Ribuan Torii Merah' },
      { title: 'Tokyo Tower & Skyline', location: 'Tokyo', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80', tag: 'Metropolis Modern Jepang' }
    ]
  },
  'amerika serikat': {
    name: 'Amerika Serikat (United States of America)',
    shortName: 'Amerika Serikat',
    type: 'country',
    category: 'Negara Federasi di Amerika Utara',
    subtitle: 'Kekuatan Ekonomi & Inovasi Teknologi Global',
    flag: '🇺🇸',
    lat: 37.0902,
    lng: -95.7129,
    zoom: 4,
    description: 'Amerika Serikat adalah republik federal yang terdiri dari 50 negara bagian, distrik federal, dan wilayah persemakmuran. Menjadi pusat inovasi teknologi global (Silicon Valley) dan taman nasional alam megah.',
    capital: 'Washington, D.C.',
    population: '335,8 Juta Jiwa',
    area: '9.833.520 km²',
    currency: 'US Dollar (USD / $)',
    timezone: 'UTC-5 hingga UTC-10',
    language: 'Bahasa Inggris',
    phoneCode: '+1',
    hierarchy: 'Dunia > Benua Amerika > Amerika Utara > Amerika Serikat',
    photos: [
      { title: 'Grand Canyon', location: 'Arizona', url: 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=800&auto=format&fit=crop&q=80', tag: 'Keajaiban Ngarai Alami Dunia' },
      { title: 'Patung Liberty & New York', location: 'New York City', url: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=800&auto=format&fit=crop&q=80', tag: 'Simbol Kebebasan Global' },
      { title: 'Golden Gate Bridge', location: 'San Francisco', url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&auto=format&fit=crop&q=80', tag: 'Jembatan Gantung Ikonik Pasifik' }
    ]
  },
  'inggris': {
    name: 'Britania Raya (United Kingdom)',
    shortName: 'Inggris',
    type: 'country',
    category: 'Negara Berdaulat di Eropa Barat Laut',
    subtitle: 'Pusat Keuangan Global & Sejarah Kerajaan',
    flag: '🇬🇧',
    lat: 55.3781,
    lng: -3.4360,
    zoom: 5,
    description: 'Britania Raya adalah negara kepulauan di Eropa Barat yang terdiri dari Inggris, Skotlandia, Wales, dan Irlandia Utara, dikenal dengan warisan kerajaan, sastra abadi, dan arsitektur gothic megah.',
    capital: 'London',
    population: '67,8 Juta Jiwa',
    area: '242.495 km²',
    currency: 'Pound Sterling (GBP / £)',
    timezone: 'GMT / BST (UTC+0 / UTC+1)',
    language: 'Bahasa Inggris',
    phoneCode: '+44',
    hierarchy: 'Dunia > Eropa > Eropa Barat > Britania Raya',
    photos: [
      { title: 'Big Ben & Istana Westminster', location: 'London', url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=80', tag: 'Menara Jam Ikonik London' },
      { title: 'Tower Bridge', location: 'Sungai Thames, London', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80', tag: 'Jembatan Abad ke-19' }
    ]
  },
  'jerman': {
    name: 'Republik Federal Jerman (Germany)',
    shortName: 'Jerman',
    type: 'country',
    category: 'Kekuatan Ekonomi Utama di Eropa',
    subtitle: 'Pusat Manufaktur, Sains & Kastil Negeri Dongeng',
    flag: '🇩🇪',
    lat: 51.1657,
    lng: 10.4515,
    zoom: 5,
    description: 'Jerman adalah negara dengan perekonomian terbesar di Uni Eropa, menjadi pelopor industri rekayasa otomotif kelas dunia, riset sains partikel, dan kastil-kastil bersejarah di pegunungan Alpen.',
    capital: 'Berlin',
    population: '84,4 Juta Jiwa',
    area: '357.022 km²',
    currency: 'Euro (EUR / €)',
    timezone: 'CET (UTC+1) / CEST (UTC+2)',
    language: 'Bahasa Jerman',
    phoneCode: '+49',
    hierarchy: 'Dunia > Eropa > Eropa Tengah > Jerman',
    photos: [
      { title: 'Kastil Neuschwanstein', location: 'Bavaria', url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&auto=format&fit=crop&q=80', tag: 'Kastil Negeri Dongeng' },
      { title: 'Gerbang Brandenburg', location: 'Berlin', url: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&auto=format&fit=crop&q=80', tag: 'Monumen Persatuan Jerman' }
    ]
  },
  'arab saudi': {
    name: 'Kerajaan Arab Saudi (Saudi Arabia)',
    shortName: 'Arab Saudi',
    type: 'country',
    category: 'Negara Monarki di Timur Tengah',
    subtitle: 'Tanah Suci Dua Masjid (Makkah & Madinah)',
    flag: '🇸🇦',
    lat: 23.8859,
    lng: 45.0792,
    zoom: 5,
    description: 'Arab Saudi adalah negara terbesar di Jazirah Arab yang merupakan tempat berdirinya dua kota suci umat Islam, Makkah Al-Mukarramah dan Madinah Al-Munawwarah, serta lanskap gurun pasir megah Al-Ula.',
    capital: 'Riyadh',
    population: '36,4 Juta Jiwa',
    area: '2.149.690 km²',
    currency: 'Riyal Arab Saudi (SAR / ﷼)',
    timezone: 'AST (UTC+3)',
    language: 'Bahasa Arab',
    phoneCode: '+966',
    hierarchy: 'Dunia > Asia > Timur Tengah > Arab Saudi',
    photos: [
      { title: 'Masjidil Haram & Ka\'bah', location: 'Makkah Al-Mukarramah', url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&auto=format&fit=crop&q=80', tag: 'Kiblat Umat Islam Sedunia' },
      { title: 'Masjid Nabawi', location: 'Madinah Al-Munawwarah', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80', tag: 'Masjid Suci Nabawi' }
    ]
  },
  'singapura': {
    name: 'Republik Singapura (Singapore)',
    shortName: 'Singapura',
    type: 'country',
    category: 'Negara Kota & Pusat Maritim Finansial Asia',
    subtitle: 'Global Financial & Smart Green City Hub',
    flag: '🇸🇬',
    lat: 1.3521,
    lng: 103.8198,
    zoom: 11,
    description: 'Singapura adalah negara pulau di lepas ujung selatan Semenanjung Malaya yang berkembang menjadi kota taman hijau futuristik dengan arsitektur modern kelas dunia.',
    capital: 'Singapura',
    population: '5,9 Juta Jiwa',
    area: '734,3 km²',
    currency: 'Singapore Dollar (SGD / S$)',
    timezone: 'SGT (UTC+8)',
    language: 'Bahasa Melayu, Inggris, Mandarin, Tamil',
    phoneCode: '+65',
    hierarchy: 'Dunia > Asia > Asia Tenggara > Singapura',
    photos: [
      { title: 'Marina Bay Sands & Supertree', location: 'Marina Bay', url: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&auto=format&fit=crop&q=80', tag: 'Taman Futuristik Gardens by the Bay' },
      { title: 'Merlion Park', location: 'Downtown Core', url: 'https://images.unsplash.com/photo-1506351421178-63b52a2d2562?w=800&auto=format&fit=crop&q=80', tag: 'Ikon Patung Singa Singapura' }
    ]
  },
  'malaysia': {
    name: 'Federasi Malaysia',
    shortName: 'Malaysia',
    type: 'country',
    category: 'Negara Monarki Konstitusional di Asia Tenggara',
    subtitle: 'Jantung Pariwisata & Menara Kembar Petronas',
    flag: '🇲🇾',
    lat: 4.2105,
    lng: 101.9758,
    zoom: 6,
    description: 'Malaysia adalah negara federal di Asia Tenggara yang memadukan keindahan alam hutan hujan purba tropis dengan kemegahan menara pencakar langit.',
    capital: 'Kuala Lumpur',
    population: '33,9 Juta Jiwa',
    area: '330.803 km²',
    currency: 'Ringgit Malaysia (MYR / RM)',
    timezone: 'MYT (UTC+8)',
    language: 'Bahasa Melayu',
    phoneCode: '+60',
    hierarchy: 'Dunia > Asia > Asia Tenggara > Malaysia',
    photos: [
      { title: 'Petronas Twin Towers', location: 'Kuala Lumpur', url: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&auto=format&fit=crop&q=80', tag: 'Menara Kembar Tertinggi di Dunia' },
      { title: 'Batu Caves', location: 'Selangor', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80', tag: 'Kuil Gua & Patung Emas Murugan' }
    ]
  },
  'korea selatan': {
    name: 'Republik Korea (South Korea)',
    shortName: 'Korea Selatan',
    type: 'country',
    category: 'Negara Maju di Asia Timur',
    subtitle: 'Pusat Budaya K-Wave & Istana Bersejarah',
    flag: '🇰🇷',
    lat: 35.9078,
    lng: 127.7669,
    zoom: 6,
    description: 'Korea Selatan adalah negara maju di Asia Timur dengan perpaduan istana Dinasti Joseon yang megah dan lanskap kota modern berteknologi tinggi.',
    capital: 'Seoul',
    population: '51,7 Juta Jiwa',
    area: '100.410 km²',
    currency: 'Won Korea Selatan (KRW / ₩)',
    timezone: 'KST (UTC+9)',
    language: 'Bahasa Korea',
    phoneCode: '+82',
    hierarchy: 'Dunia > Asia > Asia Timur > Korea Selatan',
    photos: [
      { title: 'Istana Gyeongbokgung', location: 'Seoul', url: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800&auto=format&fit=crop&q=80', tag: 'Istana Utama Dinasti Joseon' },
      { title: 'N Seoul Tower', location: 'Gunung Namsan, Seoul', url: 'https://images.unsplash.com/photo-1546874177-9e664107314e?w=800&auto=format&fit=crop&q=80', tag: 'Pemandangan Panorama Kota Seoul' }
    ]
  },
  'tiongkok': {
    name: 'Republik Rakyat Tiongkok (China)',
    shortName: 'Tiongkok',
    type: 'country',
    category: 'Kekuatan Ekonomi & Manufaktur Raksasa Asia',
    subtitle: 'Pusat Peradaban Kuno & Tembok Raksasa Dunia',
    flag: '🇨🇳',
    lat: 35.8617,
    lng: 104.1954,
    zoom: 4,
    description: 'Tiongkok adalah negara terpadat kedua di dunia dengan warisan cagar budaya ribuan tahun yang memukau dan keajaiban arsitektur dunia.',
    capital: 'Beijing',
    population: '1,41 Miliar Jiwa',
    area: '9.596.961 km²',
    currency: 'Yuan / Renminbi (CNY / ¥)',
    timezone: 'CST (UTC+8)',
    language: 'Bahasa Mandarin Standar',
    phoneCode: '+86',
    hierarchy: 'Dunia > Asia > Asia Timur > Tiongkok',
    photos: [
      { title: 'Tembok Besar Tiongkok', location: 'Beijing & Tiongkok Utara', url: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop&q=80', tag: 'Keajaiban Arsitektur Dunia' },
      { title: 'Kota Terlarang (Forbidden City)', location: 'Beijing', url: 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&auto=format&fit=crop&q=80', tag: 'Istana Kekaisaran Ming & Qing' }
    ]
  },
  'australia': {
    name: 'Persemakmuran Australia (Australia)',
    shortName: 'Australia',
    type: 'country',
    category: 'Negara Benua di Belahan Bumi Selatan',
    subtitle: 'Benua Hijau & Keajaiban Terumbu Karang Dunia',
    flag: '🇦🇺',
    lat: -25.2744,
    lng: 133.7751,
    zoom: 4,
    description: 'Australia adalah negara benua terbesar di Oseania yang kaya akan pesona pelabuhan Sydney berkelas dunia dan terumbu karang laut tropis terlengkap.',
    capital: 'Canberra',
    population: '26,6 Juta Jiwa',
    area: '7.692.024 km²',
    currency: 'Australian Dollar (AUD / A$)',
    timezone: 'AEST / ACST / AWST (UTC+8 hingga UTC+10.5)',
    language: 'Bahasa Inggris',
    phoneCode: '+61',
    hierarchy: 'Dunia > Oseania > Australia',
    photos: [
      { title: 'Sydney Opera House', location: 'Sydney Harbour', url: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&auto=format&fit=crop&q=80', tag: 'Mahakarya Seni Arsitektur Abad ke-20' },
      { title: 'Great Barrier Reef', location: 'Queensland', url: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=800&auto=format&fit=crop&q=80', tag: 'Terumbu Karang Terbesar di Dunia' }
    ]
  },

  // === INDONESIAN PROVINCES & MAJOR REGIONS ===
  'jawa tengah': {
    name: 'Provinsi Jawa Tengah',
    shortName: 'Jawa Tengah',
    type: 'province',
    category: 'Provinsi di Pulau Jawa, Indonesia',
    subtitle: 'Jantung Budaya Jawa & Candi Borobudur',
    flag: '📍',
    lat: -7.150975,
    lng: 110.140259,
    zoom: 8,
    description: 'Jawa Tengah adalah provinsi di bagian tengah Pulau Jawa yang kaya akan cagar budaya warisan dunia, dataran tinggi Dieng yang sejuk, serta pesisir pantai selatan yang eksotis.',
    capital: 'Kota Semarang',
    population: '37,2 Juta Jiwa',
    area: '32.800 km²',
    currency: 'Rupiah (IDR / Rp)',
    timezone: 'WIB (UTC+7)',
    language: 'Bahasa Indonesia, Bahasa Jawa',
    hierarchy: 'Indonesia > Pulau Jawa > Provinsi Jawa Tengah',
    photos: [
      { title: 'Candi Borobudur', location: 'Magelang', url: 'https://images.unsplash.com/photo-1596405835955-465de5c3df77?w=800&auto=format&fit=crop&q=80', tag: 'Warisan Budaya Dunia UNESCO' },
      { title: 'Dataran Tinggi Dieng', location: 'Wonosobo & Banjarnegara', url: 'https://images.unsplash.com/photo-1571863533956-01c88e79957e?w=800&auto=format&fit=crop&q=80', tag: 'Negeri di Atas Awan' }
    ]
  },
  'dki jakarta': {
    name: 'DKI Jakarta (Daerah Khusus Ibukota Jakarta)',
    shortName: 'Jakarta',
    type: 'province',
    category: 'Ibu Kota & Pusat Bisnis Indonesia',
    subtitle: 'Metropolis Terbesar di Asia Tenggara (Jabodetabek)',
    flag: '📍',
    lat: -6.2088,
    lng: 106.8456,
    zoom: 11,
    description: 'Jakarta adalah pusat perekonomian, perbankan, kebudayaan metropolitan, dan monumen nasional bersejarah kemerdekaan Indonesia.',
    capital: 'Jakarta Pusat',
    population: '10,67 Juta Jiwa (Jabodetabek >32 Juta)',
    area: '661,5 km²',
    currency: 'Rupiah (IDR / Rp)',
    timezone: 'WIB (UTC+7)',
    language: 'Bahasa Indonesia, Bahasa Betawi',
    hierarchy: 'Indonesia > Pulau Jawa > DKI Jakarta',
    photos: [
      { title: 'Monumen Nasional (Monas)', location: 'Jakarta Pusat', url: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=800&auto=format&fit=crop&q=80', tag: 'Simbol Perjuangan Kemerdekaan RI' },
      { title: 'Bundaran HI & Skyline Jakarta', location: 'Sudirman - Thamrin', url: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=800&auto=format&fit=crop&q=80', tag: 'Jantung Metropolis Keuangan Indonesia' }
    ]
  },
  'bali': {
    name: 'Provinsi Bali',
    shortName: 'Bali',
    type: 'province',
    category: 'Pusat Pariwisata Internasional Indonesia',
    subtitle: 'Pulau Dewata (Island of the Gods)',
    flag: '📍',
    lat: -8.4095,
    lng: 115.1889,
    zoom: 9,
    description: 'Bali adalah pulau pariwisata kelas dunia yang terkenal dengan panorama pantai eksotis, pura megah, tarian tradisional, seni lukis, dan keramahtamahan warganya.',
    capital: 'Kota Denpasar',
    population: '4,43 Juta Jiwa',
    area: '5.780 km²',
    currency: 'Rupiah (IDR / Rp)',
    timezone: 'WITA (UTC+8)',
    language: 'Bahasa Indonesia, Bahasa Bali',
    hierarchy: 'Indonesia > Kepulauan Nusa Tenggara > Provinsi Bali',
    photos: [
      { title: 'Pura Ulun Danu Beratan', location: 'Bedugul, Tabanan', url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop&q=80', tag: 'Pura Terapung Ikonik Danau Beratan' },
      { title: 'Pantai Kelingking', location: 'Nusa Penida', url: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&auto=format&fit=crop&q=80', tag: 'Tebing Dinosaurus Samudra Biru' }
    ]
  },

  // === REGENCIES, CITIES & DISTRICTS (KABUPATEN / KOTA / KECAMATAN) ===
  'kebumen': {
    name: 'Kabupaten Kebumen',
    shortName: 'Kebumen',
    type: 'regency',
    category: 'Kabupaten di Provinsi Jawa Tengah, Indonesia',
    subtitle: 'Kota Beriman, Geopark Karangsambung-Karangbolong & Tanah Kelahiran DeeperNova',
    flag: '📍',
    lat: -7.6699,
    lng: 109.6522,
    zoom: 11,
    description: 'Kabupaten Kebumen adalah kabupaten pesisir selatan Jawa Tengah dengan panorama tebing karang laut samudera yang spektakuler, Geopark Karangsambung (laboratorium alam geologi tertua di Jawa), serta pusat inovasi teknologi DeeperNova.',
    capital: 'Kota Kebumen',
    population: '1.376.825 Jiwa',
    area: '1.281,11 km²',
    currency: 'Rupiah (IDR / Rp)',
    timezone: 'WIB (UTC+7)',
    language: 'Bahasa Indonesia, Bahasa Jawa (Banyumasan / Bandek)',
    phoneCode: '0287',
    hierarchy: 'Indonesia > Jawa Tengah > Kabupaten Kebumen',
    districts: '26 Kecamatan: Kebumen, Gombong, Karanganyar, Prembun, Kutowinangun, Ayah, Puring, Petanahan, Alian, Pejagoan, Klirong, Mirit, Ambal, Buluspesantren, Sempor, Rowokele, Buayan, Sadang, Karanggayam, Sruweng, Adimulyo, Kuwarasan, Poncowarno, Padureso, Bonorowo, Karangsambung',
    photos: [
      { title: 'Pantai Menganti', location: 'Kecamatan Ayah, Kebumen', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80', tag: 'New Zealand van Java • Tebing Samudra' },
      { title: 'Geopark Karangsambung', location: 'Karangsambung, Kebumen', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80', tag: 'Laboratorium Geologi Lantai Samudra Purba' },
      { title: 'Gua Jatijajar & Pantai Surumanis', location: 'Ayah & Buayan, Kebumen', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', tag: 'Keajaiban Karst Pesisir Selatan' }
    ]
  },
  'nusantara': {
    name: 'Ibu Kota Nusantara (IKN)',
    shortName: 'IKN Nusantara',
    type: 'city',
    category: 'Ibu Kota Masa Depan Republik Indonesia',
    subtitle: 'Kota Cerdas Berkelanjutan di Jantung Khatulistiwa (Smart Forest City)',
    flag: '🇮🇩',
    lat: -0.9744,
    lng: 116.7089,
    zoom: 11,
    description: 'Ibu Kota Nusantara (IKN) adalah ibu kota masa depan Indonesia yang dibangun dengan konsep kota cerdas, inklusif, dan ramah lingkungan berenergi 100% terbarukan di Kalimantan Timur.',
    capital: 'Kawasan Inti Pusat Pemerintahan (KIPP)',
    population: 'Tahap Pengembangan Bertahap',
    area: '256.142 Hektar',
    currency: 'Rupiah (IDR / Rp)',
    timezone: 'WITA (UTC+8)',
    language: 'Bahasa Indonesia',
    hierarchy: 'Indonesia > Kalimantan Timur > Otorita IKN Nusantara',
    photos: [
      { title: 'Istana Garuda IKN', location: 'KIPP IKN, Penajam Paser Utara', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=80', tag: 'Pusat Kepresidenan Cerdas Nusantara' },
      { title: 'Hutan Hujan Tropis Borneo', location: 'Kalimantan Timur', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80', tag: 'Konsep Smart Forest City' }
    ]
  }
};

// Geography Aliases
const GEO_ALIASES = {
  'ri': 'indonesia',
  'nkri': 'indonesia',
  'republic of indonesia': 'indonesia',
  'peta indonesia': 'indonesia',
  'koordinat indonesia': 'indonesia',
  'lokasi indonesia': 'indonesia',
  'negara indonesia': 'indonesia',
  'japan': 'jepang',
  'peta jepang': 'jepang',
  'united states': 'amerika serikat',
  'usa': 'amerika serikat',
  'us': 'amerika serikat',
  'united kingdom': 'inggris',
  'uk': 'inggris',
  'great britain': 'inggris',
  'england': 'inggris',
  'germany': 'jerman',
  'saudi arabia': 'arab saudi',
  'saudi': 'arab saudi',
  'singapore': 'singapura',
  'china': 'tiongkok',
  'prc': 'tiongkok',
  'korea': 'korea selatan',
  'south korea': 'korea selatan',
  'jateng': 'jawa tengah',
  'peta jawa tengah': 'jawa tengah',
  'jakarta': 'dki jakarta',
  'peta jakarta': 'dki jakarta',
  'kabupaten kebumen': 'kebumen',
  'peta kebumen': 'kebumen',
  'koordinat kebumen': 'kebumen',
  'lokasi kebumen': 'kebumen',
  'kota kebumen': 'kebumen',
  'gombong': 'kebumen',
  'karangsambung': 'kebumen',
  'ikn': 'nusantara',
  'ibu kota nusantara': 'nusantara'
};

// ============================================================================
// 💱 COMPREHENSIVE CURRENCY EXCHANGE RATE DATABASE
// ============================================================================
const CURRENCY_DATABASE = {
  'usd': { name: 'US Dollar', symbol: '$', toUSD: 1.0, flag: '🇺🇸', country: 'Amerika Serikat' },
  'idr': { name: 'Rupiah Indonesia', symbol: 'Rp', toUSD: 1 / 16250, flag: '🇮🇩', country: 'Indonesia' },
  'eur': { name: 'Euro', symbol: '€', toUSD: 1.085, flag: '🇪🇺', country: 'Uni Eropa' },
  'gbp': { name: 'British Pound', symbol: '£', toUSD: 1.295, flag: '🇬🇧', country: 'Inggris' },
  'jpy': { name: 'Japanese Yen', symbol: '¥', toUSD: 1 / 155.2, flag: '🇯🇵', country: 'Jepang' },
  'sgd': { name: 'Singapore Dollar', symbol: 'S$', toUSD: 1 / 1.345, flag: '🇸🇬', country: 'Singapura' },
  'myr': { name: 'Malaysian Ringgit', symbol: 'RM', toUSD: 1 / 4.42, flag: '🇲🇾', country: 'Malaysia' },
  'aud': { name: 'Australian Dollar', symbol: 'A$', toUSD: 0.655, flag: '🇦🇺', country: 'Australia' },
  'cny': { name: 'Chinese Yuan', symbol: '¥', toUSD: 1 / 7.24, flag: '🇨🇳', country: 'Tiongkok' },
  'sar': { name: 'Saudi Riyal', symbol: '﷼', toUSD: 1 / 3.75, flag: '🇸🇦', country: 'Arab Saudi' },
  'aed': { name: 'UAE Dirham', symbol: 'د.إ', toUSD: 1 / 3.6725, flag: '🇦🇪', country: 'Uni Emirat Arab' },
  'krw': { name: 'South Korean Won', symbol: '₩', toUSD: 1 / 1380, flag: '🇰🇷', country: 'Korea Selatan' },
  'thb': { name: 'Thai Baht', symbol: '฿', toUSD: 1 / 36.5, flag: '🇹🇭', country: 'Thailand' },
  'chf': { name: 'Swiss Franc', symbol: 'CHF', toUSD: 1.12, flag: '🇨🇭', country: 'Swiss' },
  'cad': { name: 'Canadian Dollar', symbol: 'C$', toUSD: 0.73, flag: '🇨🇦', country: 'Kanada' },
  'inr': { name: 'Indian Rupee', symbol: '₹', toUSD: 1 / 83.5, flag: '🇮🇳', country: 'India' },
  'btc': { name: 'Bitcoin', symbol: '₿', toUSD: 92450.0, flag: '🪙', country: 'Cryptocurrency' },
  'eth': { name: 'Ethereum', symbol: 'Ξ', toUSD: 3450.0, flag: '🪙', country: 'Cryptocurrency' },
  'sol': { name: 'Solana', symbol: 'SOL', toUSD: 185.0, flag: '🪙', country: 'Cryptocurrency' }
};

const CURRENCY_ALIASES = {
  'dollar': 'usd',
  'dolar': 'usd',
  'us dollar': 'usd',
  'rupiah': 'idr',
  'rp': 'idr',
  'euro': 'eur',
  'pound': 'gbp',
  'yen': 'jpy',
  'ringgit': 'myr',
  'sing dollar': 'sgd',
  'riyal': 'sar',
  'won': 'krw',
  'baht': 'thb',
  'bitcoin': 'btc',
  'ethereum': 'eth',
  'solana': 'sol'
};

// Aliases mapping for instant lookup
const ENTITY_ALIASES = {
  'deepseek r1': 'deepseek',
  'deepseek v3': 'deepseek',
  'chatgpt': 'openai',
  'gpt4': 'openai',
  'claude': 'anthropic',
  'claude 3.5': 'anthropic',
  'alphabet': 'google',
  'google inc': 'google',
  'ai': 'artificial intelligence',
  'kecerdasan buatan': 'artificial intelligence',
  'page rank': 'pagerank',
  'okapi bm25': 'bm25'
};

// Strict Non-Geo Terms Blacklist (never trigger geo lookup for tech, general queries, software, media)
const NON_GEO_KEYWORDS = new Set([
  'web', 'website', 'internet', 'teknologi', 'technology', 'komputer', 'computer', 'software', 'hardware',
  'jaringan', 'network', 'cloud', 'server', 'data', 'database', 'google', 'youtube', 'facebook', 'instagram',
  'tiktok', 'twitter', 'x', 'x.com', 'deepseek', 'openai', 'chatgpt', 'ai', 'claude', 'anthropic', 'meta',
  'apple', 'microsoft', 'python', 'javascript', 'js', 'node', 'nodejs', 'react', 'reactjs', 'vue', 'angular',
  'html', 'css', 'php', 'java', 'c++', 'c#', 'rust', 'golang', 'sql', 'mysql', 'postgresql', 'sqlite', 'mongodb',
  'github', 'gitlab', 'npm', 'pip', 'docker', 'linux', 'windows', 'android', 'ios',
  'tutorial', 'cara', 'resep', 'download', 'unduh', 'film', 'movie', 'video', 'mp3', 'lagu',
  'lirik', 'chord', 'kunci', 'game', 'gaming', 'shopee', 'tokopedia', 'lazada', 'blibli', 'bukalapak',
  'harga', 'beli', 'jual', 'kalkulator', 'kurs', 'convert', 'pengertian', 'arti', 'definisi', 'rumus',
  'soal', 'jawaban', 'berita', 'news', 'login', 'daftar', 'register', 'portal', 'api', 'http', 'https',
  'pagerank', 'bm25', 'seo', 'deepernova', 'nexus', 'search', 'engine', 'crawler', 'online'
]);

// Explicit Geo Intent Keywords
const GEO_PREFIX_REGEX = /^(peta|map|maps|lokasi|location|koordinat|coordinates|dimana|where is|letak|wilayah|daerah|negara|country|provinsi|province|kabupaten|kota|city|kecamatan|subdistrict|district|desa|village|kelurahan|wisata|pantai|gunung|pulau|island|danau|lake|candi|landmark)\s+/i;

// Comprehensive World Countries & Major Places Set (for direct country name queries like "argentina", "swiss", "mesir")
const WORLD_NATIONS_AND_PLACES = new Set([
  'indonesia', 'jepang', 'japan', 'amerika serikat', 'usa', 'united states', 'inggris', 'uk', 'united kingdom',
  'jerman', 'germany', 'prancis', 'france', 'italia', 'italy', 'spanyol', 'spain', 'portugal', 'belanda', 'netherlands',
  'belgia', 'belgium', 'swiss', 'switzerland', 'austria', 'swedia', 'sweden', 'norwegia', 'norway', 'finlandia', 'finland',
  'denmark', 'islandia', 'iceland', 'irlandia', 'ireland', 'polandia', 'poland', 'ceko', 'czech', 'hungaria', 'hungary',
  'yunani', 'greece', 'turki', 'turkey', 'rusia', 'russia', 'ukraina', 'ukraine', 'arab saudi', 'saudi arabia',
  'uni emirat arab', 'uae', 'qatar', 'kuwait', 'oman', 'yordania', 'jordan', 'lebanon', 'palestina', 'palestine',
  'mesir', 'egypt', 'maroko', 'morocco', 'aljazair', 'algeria', 'tunisia', 'afrika selatan', 'south africa', 'nigeria',
  'kenya', 'madagaskar', 'madagascar', 'etiopia', 'ethiopia', 'ghana', 'senegal', 'tiongkok', 'china', 'korea selatan',
  'south korea', 'korea utara', 'north korea', 'india', 'pakistan', 'bangladesh', 'sri lanka', 'singapura', 'singapore',
  'malaysia', 'thailand', 'vietnam', 'filipina', 'philippines', 'australia', 'selandia baru', 'new zealand',
  'kanada', 'canada', 'meksiko', 'mexico', 'brasil', 'brazil', 'argentina', 'chile', 'kolombia', 'colombia', 'peru',
  'jawa tengah', 'jawa barat', 'jawa timur', 'dki jakarta', 'jakarta', 'di yogyakarta', 'yogyakarta', 'jogja',
  'banten', 'bali', 'sumatera utara', 'sumatera barat', 'sumatera selatan', 'aceh', 'riau', 'lampung',
  'kalimantan timur', 'kalimantan barat', 'kalimantan selatan', 'kalimantan tengah', 'sulawesi selatan', 'sulawesi utara',
  'papua', 'papua barat', 'nusa tenggara barat', 'nusa tenggara timur', 'maluku',
  'kebumen', 'surabaya', 'bandung', 'semarang', 'medan', 'makassar', 'denpasar', 'palembang', 'malang', 'solo', 'surakarta',
  'banyumas', 'purwokerto', 'cilacap', 'purworejo', 'magelang', 'yogyakarta', 'nusantara', 'ikn', 'tokyo', 'makkah', 'madinah',
  'london', 'paris', 'berlin', 'rome', 'roma', 'madrid', 'amsterdam', 'new york', 'washington', 'los angeles', 'beijing', 'seoul'
]);

export class InstantAnswersEngine {
  /**
   * Evaluates if a query has genuine geographical intent before showing maps
   */
  static isGeoIntent(query) {
    if (!query || typeof query !== 'string') return false;
    const clean = query.trim().toLowerCase();

    // 1. If it's a known non-geo keyword without explicit geo prefix, reject immediately
    if (NON_GEO_KEYWORDS.has(clean)) {
      return false;
    }

    // 2. If it has explicit geo prefix like "peta indonesia", "lokasi kebumen", "kecamatan karanganyar", etc.
    if (GEO_PREFIX_REGEX.test(clean)) {
      return true;
    }

    // 3. If it's in known preloaded locations or world nations list
    if (GEO_LOCATIONS[clean] || GEO_ALIASES[clean] || WORLD_NATIONS_AND_PLACES.has(clean)) {
      return true;
    }

    // 4. Check if query contains explicit geo words (e.g. "kecamatan ...", "kabupaten ...", "pantai ...")
    const words = clean.split(/\s+/);
    const geoWords = ['peta', 'map', 'lokasi', 'koordinat', 'negara', 'provinsi', 'kabupaten', 'kota', 'kecamatan', 'desa', 'kelurahan', 'pantai', 'gunung', 'pulau', 'danau', 'candi', 'wisata'];
    if (words.some(w => geoWords.includes(w))) {
      return true;
    }

    return false;
  }

  /**
   * Main synchronous entry point to detect and evaluate instant answer queries
   */
  static getInstantAnswer(rawQuery, db = null) {
    if (!rawQuery || typeof rawQuery !== 'string') return null;
    const query = rawQuery.trim().toLowerCase();

    // Check high-speed in-memory LRU cache (<0.005ms)
    const cached = instantAnswersCache.get(query);
    if (cached !== undefined) {
      return cached;
    }

    const computeAnswer = () => {
      // 1. Check Currency Converter & Exchange Comparison FIRST (e.g. "100 usd to idr", "kurs dollar")
      const currencyResult = this.evaluateCurrencyConverter(query);
      if (currencyResult) {
        return currencyResult;
      }

      // 1b. Check Real-Time Financial Equities & Crypto Market (e.g. "saham bbca", "harga btc", "saham nvda")
      const marketResult = MarketDataEngine.evaluate(rawQuery);
      if (marketResult) {
        return marketResult;
      }

      // 2. Check Mathematical Calculation
      const mathResult = this.evaluateMath(query);
      if (mathResult) {
        return {
          type: 'calculator',
          title: 'Kalkulator Cepat',
          query: rawQuery,
          result: mathResult.result,
          expression: mathResult.expression,
          formatted: `${mathResult.expression} = ${mathResult.result}`
        };
      }

      // 3. Check Unit Conversions (Distance, Mass, Temp)
      const conversionResult = this.evaluateConversion(query);
      if (conversionResult) {
        return {
          type: 'conversion',
          title: 'Konversi Satuan Terverifikasi',
          query: rawQuery,
          fromValue: conversionResult.fromValue,
          fromUnit: conversionResult.fromUnit,
          toValue: conversionResult.toValue,
          toUnit: conversionResult.toUnit,
          result: `${conversionResult.fromValue} ${conversionResult.fromUnit} = ${conversionResult.toValue} ${conversionResult.toUnit}`
        };
      }

      // 4. Check Knowledge Graph Entity Lookup (tech titans, algorithms, concepts)
      const entityResult = this.evaluateEntity(query);
      if (entityResult) {
        return {
          type: 'knowledge_card',
          ...entityResult
        };
      }

      // 4b. Check Cached Celebrity & Artist Entities (SQLite cache)
      if (db && typeof db.getCelebrityEntity === 'function') {
        const cachedCeleb = db.getCelebrityEntity(query);
        if (cachedCeleb) return cachedCeleb;
      }

      // 5. Check Database-Crawled Geo Entities (SQLite cache) FIRST
      if (db && typeof db.getGeoEntity === 'function') {
        const cleaned = query
          .replace(/^(peta|map|lokasi|koordinat|dimana|letak|provinsi|kabupaten|kota|negara|profil|wisata|keindahan|kecamatan|desa)\s+/i, '')
          .replace(/[?]/g, '')
          .trim();
        const cachedGeo = db.getGeoEntity(cleaned) || db.getGeoEntity(query);
        if (cachedGeo) return cachedGeo;
      }

      // 5b. Check Preloaded Geographical Location (ONLY IF GENUINE GEO INTENT)
      if (this.isGeoIntent(query)) {
        const geoResult = this.evaluateGeoLocation(query);
        if (geoResult) {
          return geoResult;
        }
      }

      return null;
    };

    const result = computeAnswer();
    instantAnswersCache.set(query, result);
    return result;
  }

  /**
   * Autonomous Asynchronous entry point: Real-time autonomous web crawler for undiscovered places,
   * coordinates, celebrities, famous artists, boundaries, photos, and live global knowledge.
   */
  static async getInstantAnswerAsync(rawQuery, db = null) {
    if (!rawQuery || typeof rawQuery !== 'string') return null;
    const query = rawQuery.trim().toLowerCase();

    // 1. Check synchronous fast cache & in-memory dictionary first
    const syncResult = this.getInstantAnswer(rawQuery, db);
    if (syncResult) return syncResult;

    // 2. Trigger Autonomous Real-Time Geo Discovery & Crawler (ONLY IF GENUINE GEO INTENT)
    if (this.isGeoIntent(query)) {
      const autonomousGeo = await this.fetchAutonomousGeoData(query, db);
      if (autonomousGeo) {
        return autonomousGeo;
      }
    }

    // 3. Trigger Autonomous Real-Time Celebrity & Famous Artist Discovery Crawler
    const autonomousCeleb = await this.fetchAutonomousCelebrityData(rawQuery, db);
    if (autonomousCeleb) {
      return autonomousCeleb;
    }

    return null;
  }

  /**
   * Autonomous crawler that dynamically discovers famous celebrities, artists, actors, musicians, and public figures
   */
  static async fetchAutonomousCelebrityData(rawQuery, db = null) {
    if (!rawQuery || typeof rawQuery !== 'string') return null;
    const query = rawQuery.trim().toLowerCase();

    // Skip if query is too short, numbers, or standard non-entity generic keywords
    if (query.length < 3 || /^\d+$/.test(query) || NON_GEO_KEYWORDS.has(query)) return null;

    const cleaned = rawQuery
      .replace(/^(biografi|biodata|profil|foto|siapa|who is|tentang|tentang tokoh|tokoh|artis|penyanyi|aktor|aktris)\s+/i, '')
      .replace(/[?]/g, '')
      .trim();

    if (!cleaned || cleaned.length < 3) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      // 1. Try Indonesian Wikipedia Summary first
      const idUrl = `https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleaned.replace(/\s+/g, '_'))}`;
      let res = await fetch(idUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'DeeperNova-Celebrity-Crawler/2.0 (admin@deepernova.com)' }
      }).catch(() => null);

      let data = null;
      let lang = 'id';
      if (res && res.ok) {
        data = await res.json().catch(() => null);
      }

      // 2. If Indonesian not found or missing thumbnail/bio, fallback to English Wikipedia
      if (!data || data.type === 'disambiguation' || !data.extract || (!data.thumbnail && !data.description)) {
        const enUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleaned.replace(/\s+/g, '_'))}`;
        const enRes = await fetch(enUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'DeeperNova-Celebrity-Crawler/2.0 (admin@deepernova.com)' }
        }).catch(() => null);

        if (enRes && enRes.ok) {
          const enData = await enRes.json().catch(() => null);
          if (enData && enData.extract && enData.type === 'standard') {
            data = enData;
            lang = 'en';
          }
        }
      }

      clearTimeout(timeout);

      if (!data || !data.title || !data.extract || data.type === 'disambiguation') return null;

      const desc = (data.description || '').toLowerCase();
      const extract = (data.extract || '').toLowerCase();

      // Person & Public Figure Verification Indicators
      const PERSON_KEYWORDS = [
        'aktor', 'aktris', 'penyanyi', 'musisi', 'sutradara', 'seniman', 'tokoh', 'sosok',
        'presiden', 'politikus', 'politisi', 'pemain', 'atlet', 'pahlawan', 'ilmuwan', 'filsuf',
        'penulis', 'pencipta', 'komposer', 'produser', 'model', 'presenter', 'komedian',
        'pebisnis', 'pengusaha', 'gubernur', 'menteri', 'raja', 'sultan', 'perdana menteri',
        'jenderal', 'panglima', 'tni', 'polri', 'letjen', 'mayjen', 'kolonel', 'militer',
        'ulama', 'kiai', 'kyai', 'habib', 'ustad', 'ustadz', 'pejabat', 'ketua', 'wali kota', 'bupati',
        'negarawan', 'aktivis', 'kelahiran', 'meninggal', 'alumni', 'lulusan',
        'actor', 'actress', 'singer', 'musician', 'songwriter', 'director', 'artist',
        'politician', 'president', 'scientist', 'footballer', 'player', 'athlete',
        'producer', 'celebrity', 'entertainer', 'comedian', 'businessman', 'entrepreneur',
        'founder', 'ceo', 'author', 'novelist', 'born', 'lahir', 'died', 'statesman', 'general'
      ];

      const isPerson = PERSON_KEYWORDS.some(k => desc.includes(k) || extract.slice(0, 200).includes(k));
      if (!isPerson) {
        return null; // Not a verified famous person
      }

      const photoUrl = data.originalimage?.source || data.thumbnail?.source || null;
      const subtitle = data.description || (lang === 'id' ? 'Tokoh Terkenal & Figur Publik' : 'Famous Public Figure');

      // Generate attributes
      const attributes = [
        { label: 'Profesi', value: data.description || 'Figur Publik & Seniman' }
      ];

      // Extract birth date if mentioned in first sentence
      const birthMatch = data.extract.match(/\((?:lahir|born)\s+([^)]+)\)/i);
      if (birthMatch) {
        attributes.push({ label: 'Lahir', value: birthMatch[1].trim() });
      }

      const celebCard = {
        type: 'celebrity_card',
        title: data.title,
        stageName: data.title,
        subtitle: subtitle,
        profession: data.description || 'Tokoh Publik',
        photo: photoUrl,
        description: data.extract,
        verified: true,
        attributes,
        sourceUrl: data.content_urls?.desktop?.page || null,
        source: 'wikipedia'
      };

      // Save to SQLite cache asynchronously so future hits are instant
      if (db && typeof db.saveCelebrityEntity === 'function') {
        db.saveCelebrityEntity({
          keyword_key: cleaned.toLowerCase(),
          name: data.title,
          stageName: data.title,
          profession: data.description,
          subtitle: subtitle,
          photo: photoUrl,
          description: data.extract,
          bornInfo: birthMatch ? birthMatch[1].trim() : null,
          attributes,
          sourceUrl: data.content_urls?.desktop?.page || null,
          source: 'wikipedia'
        });
      }

      return celebCard;
    } catch {
      return null;
    }
  }

  /**
   * Autonomous crawler that dynamically discovers real-world places, coordinates, hierarchies and photos
   */
  static async fetchAutonomousGeoData(query, db = null) {
    if (!this.isGeoIntent(query)) return null;

    const cleaned = query
      .replace(/^(peta|map|maps|lokasi|location|koordinat|coordinates|dimana|where is|letak|wilayah|daerah|negara|country|provinsi|province|kabupaten|kota|city|kecamatan|subdistrict|district|desa|village|kelurahan|wisata|pantai|gunung|pulau|island|danau|lake|candi|landmark)\s+/i, '')
      .replace(/[?]/g, '')
      .trim();

    if (!cleaned || cleaned.length < 2 || NON_GEO_KEYWORDS.has(cleaned)) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleaned)}&format=json&addressdetails=1&extratags=1&limit=1`;
      const response = await fetch(osmUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'DeeperNova-Search-Engine/2.0 (autonomous-crawler; admin@deepernova.com)',
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeout);

      if (!response.ok) return null;
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      const item = data[0];
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      if (isNaN(lat) || isNaN(lng)) return null;

      // Verify that this is actually an administrative or geographic place, not a random commercial shop or house
      const allowedClasses = new Set(['boundary', 'place', 'waterway', 'natural', 'landuse', 'tourism']);
      if (item.class && !allowedClasses.has(item.class)) {
        return null;
      }

      const address = item.address || {};
      const countryCode = (address.country_code || '').toLowerCase();
      const flag = this.getCountryFlag(countryCode);

      // Determine place name and category
      const placeName = address.village || address.suburb || address.town || address.city || address.municipality || address.county || address.state || address.country || item.name || cleaned;
      const categoryType = item.type || item.class || 'Wilayah';
      
      // Calculate Hierarchy
      const hierarchyParts = [
        address.country,
        address.state,
        address.county,
        address.city || address.town || address.municipality,
        address.village || address.suburb
      ].filter(Boolean);
      const hierarchy = hierarchyParts.length > 0 ? hierarchyParts.join(' > ') : `Dunia > ${item.display_name.slice(0, 50)}`;

      // Zoom Calculation
      let zoom = 10;
      if (item.type === 'country' || (item.class === 'boundary' && !address.state)) zoom = 5;
      else if (address.state && !address.county && !address.city) zoom = 8;
      else if (address.city || address.town) zoom = 12;
      else if (address.village || address.suburb) zoom = 14;

      // Query Wikipedia for description & scenic photo
      const wikiData = await this.fetchWikipediaSummary(placeName, countryCode);

      const delta = zoom >= 12 ? 0.04 : (zoom >= 8 ? 0.4 : 3.0);
      const minLon = lng - delta;
      const minLat = lat - delta;
      const maxLon = lng + delta;
      const maxLat = lat + delta;
      const bbox = `${minLon.toFixed(4)},${minLat.toFixed(4)},${maxLon.toFixed(4)},${maxLat.toFixed(4)}`;

      const geoCard = {
        type: 'geo_location',
        title: wikiData?.title || placeName,
        shortName: placeName,
        category: wikiData?.description || `${categoryType.toUpperCase()} • ${address.country || 'Global'}`,
        subtitle: item.display_name ? item.display_name.slice(0, 90) : `Koordinat ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
        flag: flag || '📍',
        lat,
        lng,
        zoom,
        description: wikiData?.extract || `Informasi wilayah ${placeName} berhasil ditemukan dan dipetakan secara otonom oleh DeeperNova Autonomous Geo-Crawler.`,
        capital: address.state ? `Ibu Kota / Pusat: ${address.state}` : (address.country ? `Negara: ${address.country}` : null),
        population: null,
        area: null,
        currency: address.country_code === 'id' ? 'Rupiah (IDR / Rp)' : null,
        timezone: address.country_code === 'id' ? 'WIB / WITA / WIT' : null,
        language: address.country_code === 'id' ? 'Bahasa Indonesia' : null,
        phoneCode: address.country_code === 'id' ? '+62' : null,
        hierarchy,
        districts: null,
        photos: wikiData?.photos || [],
        osmEmbedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`,
        gmapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        verified: true,
        source: 'autonomous_crawler'
      };

      // Automatically persist discovered entity into SQLite so subsequent searches are instant!
      if (db && typeof db.saveGeoEntity === 'function') {
        db.saveGeoEntity({
          keyword_key: cleaned,
          ...geoCard
        });
      }

      return geoCard;
    } catch (e) {
      return null;
    }
  }

  /**
   * Helper to fetch Wikipedia summary & high-res image
   */
  static async fetchWikipediaSummary(title, countryCode = 'id') {
    if (!title) return null;
    try {
      const lang = (countryCode === 'id') ? 'id' : 'en';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const wikiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const res = await fetch(wikiUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'DeeperNova-Search/2.0' }
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const photos = [];
        if (data.thumbnail?.source || data.originalimage?.source) {
          photos.push({
            title: data.title || title,
            location: data.description || 'Pemandangan Wilayah',
            url: data.originalimage?.source || data.thumbnail?.source,
            tag: 'Foto Resmi Wikipedia'
          });
        }
        return {
          title: data.title,
          description: data.description,
          extract: data.extract,
          photos
        };
      }
    } catch {}
    return null;
  }

  /**
   * Helper to convert ISO-2 country code to emoji flag
   */
  static getCountryFlag(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '📍';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  /**
   * Evaluates interactive geographical location and world map cards
   */
  static evaluateGeoLocation(query) {
    const cleaned = query
      .replace(/^(peta|map|lokasi|koordinat|dimana|letak|provinsi|kabupaten|kota|negara|profil|wisata|keindahan)\s+/i, '')
      .replace(/[?]/g, '')
      .trim();

    const normalizedKey = GEO_ALIASES[cleaned] || cleaned;
    const locationData = GEO_LOCATIONS[normalizedKey];

    if (!locationData) return null;

    // Generate OpenStreetMap interactive embed tile URL with marker pin
    const delta = locationData.zoom >= 10 ? 0.08 : (locationData.zoom >= 7 ? 0.8 : 4.0);
    const minLon = locationData.lng - delta;
    const minLat = locationData.lat - delta;
    const maxLon = locationData.lng + delta;
    const maxLat = locationData.lat + delta;

    const bbox = `${minLon.toFixed(4)},${minLat.toFixed(4)},${maxLon.toFixed(4)},${maxLat.toFixed(4)}`;
    const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${locationData.lat},${locationData.lng}`;
    const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${locationData.lat},${locationData.lng}`;

    return {
      type: 'geo_location',
      title: locationData.name,
      shortName: locationData.shortName,
      category: locationData.category,
      subtitle: locationData.subtitle,
      flag: locationData.flag || '📍',
      lat: locationData.lat,
      lng: locationData.lng,
      zoom: locationData.zoom,
      description: locationData.description,
      capital: locationData.capital,
      population: locationData.population,
      area: locationData.area,
      currency: locationData.currency,
      timezone: locationData.timezone,
      language: locationData.language,
      phoneCode: locationData.phoneCode,
      hierarchy: locationData.hierarchy,
      districts: locationData.districts,
      photos: locationData.photos || [],
      osmEmbedUrl,
      gmapsUrl,
      verified: true
    };
  }

  /**
   * Evaluates rich interactive currency conversions and multi-tier exchange comparison
   */
  static evaluateCurrencyConverter(query) {
    return CurrencyEngine.evaluate(query);
  }

  /**
   * Evaluates mathematical expressions safely
   */
  static evaluateMath(query) {
    const percentMatch = query.match(/^(\d+(?:\.\d+)?)\s*%\s*(?:of|dari|\*)\s*(\d+(?:\.\d+)?)$/i);
    if (percentMatch) {
      const pct = parseFloat(percentMatch[1]);
      const val = parseFloat(percentMatch[2]);
      const res = (pct / 100) * val;
      return {
        expression: `${pct}% dari ${val.toLocaleString('id-ID')}`,
        result: res.toLocaleString('id-ID')
      };
    }

    const sqrtMatch = query.match(/^(?:sqrt|akar|akar kuadrat)\s*(?:of|dari|\()?\s*(\d+(?:\.\d+)?)\)?$/i);
    if (sqrtMatch) {
      const num = parseFloat(sqrtMatch[1]);
      const res = Math.sqrt(num);
      return {
        expression: `√${num}`,
        result: String(Math.round(res * 100000) / 100000)
      };
    }

    if (/^[0-9\.\s\+\-\*\/\^\(\)]+$/.test(query) && /[0-9]/.test(query) && /[\+\-\*\/\^]/.test(query)) {
      try {
        const sanitized = query.replace(/\^/g, '**');
        const func = new Function(`return (${sanitized});`);
        const val = func();
        if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
          return {
            expression: query,
            result: val.toLocaleString('id-ID')
          };
        }
      } catch {}
    }

    return null;
  }

  /**
   * Evaluates unit conversions (Lengths, Mass, Temp)
   */
  static evaluateConversion(query) {
    const match = query.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(?:to|ke|in|dalam|=)\s+([a-zA-Z]+)$/i);
    if (!match) return null;

    const amount = parseFloat(match[1]);
    const from = match[2].toLowerCase();
    const to = match[3].toLowerCase();

    // 1. Lengths & Distances
    const lengthToMeters = {
      'm': 1, 'meter': 1, 'meters': 1,
      'km': 1000, 'kilometer': 1000, 'kilometers': 1000,
      'cm': 0.01, 'centimeter': 0.01,
      'mm': 0.001, 'millimeter': 0.001,
      'mile': 1609.34, 'miles': 1609.34, 'mil': 1609.34,
      'yard': 0.9144, 'yards': 0.9144,
      'foot': 0.3048, 'feet': 0.3048, 'ft': 0.3048,
      'inch': 0.0254, 'inches': 0.0254, 'in': 0.0254
    };

    if (lengthToMeters[from] && lengthToMeters[to]) {
      const meters = amount * lengthToMeters[from];
      const res = meters / lengthToMeters[to];
      return {
        fromValue: amount,
        fromUnit: from,
        toValue: Math.round(res * 10000) / 10000,
        toUnit: to
      };
    }

    // 2. Weight & Mass
    const massToKg = {
      'kg': 1, 'kilogram': 1, 'kilograms': 1,
      'g': 0.001, 'gram': 0.001, 'grams': 0.001,
      'mg': 0.000001, 'milligram': 0.000001,
      'lb': 0.453592, 'lbs': 0.453592, 'pound': 0.453592, 'pounds': 0.453592,
      'oz': 0.0283495, 'ounce': 0.0283495,
      'ton': 1000, 'tons': 1000
    };

    if (massToKg[from] && massToKg[to]) {
      const kg = amount * massToKg[from];
      const res = kg / massToKg[to];
      return {
        fromValue: amount,
        fromUnit: from,
        toValue: Math.round(res * 10000) / 10000,
        toUnit: to
      };
    }

    // 3. Temperatures
    if ((from === 'c' || from === 'celcius' || from === 'celsius') && (to === 'f' || to === 'fahrenheit')) {
      const res = (amount * 9/5) + 32;
      return { fromValue: amount, fromUnit: '°C', toValue: Math.round(res * 10) / 10, toUnit: '°F' };
    }
    if ((from === 'f' || from === 'fahrenheit') && (to === 'c' || to === 'celcius' || to === 'celsius')) {
      const res = (amount - 32) * 5/9;
      return { fromValue: amount, fromUnit: '°F', toValue: Math.round(res * 10) / 10, toUnit: '°C' };
    }

    return null;
  }

  /**
   * Looks up direct entity knowledge cards from Knowledge Graph
   */
  static evaluateEntity(query) {
    if (!query) return null;
    let cleaned = query.toLowerCase()
      .replace(/^(who is|what is|apa itu|siapa itu|siapa|apakah|maksud dari|arti kata|pengertian|definisi|arti|tentang|profil|biografi|biodata|sejarah)\s+/i, '')
      .replace(/\s+(itu apa|siapa sih|siapa|artinya apa|adalah apa|maksudnya apa|artinya|adalah|apa)$/i, '')
      .replace(/[?]/g, '')
      .trim();

    if (KNOWLEDGE_GRAPH_ENTITIES[cleaned]) {
      return KNOWLEDGE_GRAPH_ENTITIES[cleaned];
    }

    if (ENTITY_ALIASES && ENTITY_ALIASES[cleaned]) {
      const canon = ENTITY_ALIASES[cleaned];
      if (KNOWLEDGE_GRAPH_ENTITIES[canon]) {
        return KNOWLEDGE_GRAPH_ENTITIES[canon];
      }
    }

    return null;
  }
}

export { InstantAnswersEngine as InstantAnswers };

// ============================================================
// Deepernova AI ChatBot — Modular Constants & Pure Helpers
// ============================================================

export const formatBubbleDomainLabel = (cleanDomain) => {
  if (!cleanDomain) return 'Web';
  const domainLower = cleanDomain.toLowerCase();
  if (domainLower.includes('gstatic.com') || domainLower.includes('googleusercontent.com') || domainLower.includes('encrypted-tbn')) {
    return 'Google';
  }
  const brand = cleanDomain.split('.')[0].toLowerCase();
  if (brand.startsWith('encrypted')) {
    return 'Google';
  }
  const known = {
    'cnnindonesia': 'CNN Indo',
    'detik': 'Detik',
    'kompas': 'Kompas',
    'katadata': 'Katadata',
    'rri': 'RRI',
    'okezone': 'Okezone',
    'antaranews': 'Antara',
    'tempo': 'Tempo',
    'tribunnews': 'Tribun',
    'cnbcindonesia': 'CNBC Indo',
    'kumparan': 'Kumparan',
    'liputan6': 'Liputan6',
    'sindonews': 'Sindo',
    'viva': 'Viva',
    'suara': 'Suara',
    'inews': 'iNews',
    'wikipedia': 'Wikipedia',
    'youtube': 'YouTube',
    'github': 'GitHub',
    'google': 'Google',
    'nytimes': 'NYTimes',
    'bbc': 'BBC',
    'reuters': 'Reuters',
    'bloomberg': 'Bloomberg',
    'theguardian': 'Guardian'
  };
  if (known[brand]) return known[brand];
  return brand.charAt(0).toUpperCase() + brand.slice(1, 10);
};

// Personality profiles for Deepernova AI with different communication styles
export const PERSONALITIES = {
  formal: {
    id: 'formal',
    name: 'Formal',
    emoji: '💼',
    description: 'Professional & Direct',
    systemPromptAppend: `

GAYA KEPRIBADIAN: FORMAL / PROFESIONAL & SANTUN
- Komunikasi profesional, cerdas, santun, ramah, dan beretika tinggi
- Gunakan bahasa Indonesia yang rapi, berwibawa, dan sangat solutif
- DILARANG kaku seperti robot, dan DILARANG memanggil dengan sebutan "bro", "cuy", atau slang canggung
- Fokus pada akurasi, efisiensi, dan penghormatan tulus kepada pengguna
- Sambut pengguna dengan hangat dan berikan jawaban yang komprehensif serta memuaskan`,
  },
  casual: {
    id: 'casual',
    name: 'Casual',
    emoji: '😎',
    description: 'Relaxed & Fun',
    systemPromptAppend: `

GAYA KEPRIBADIAN: CASUAL & AKRAB
- Gaya bicara santai, luwes, ramah, dan bersahabat seperti sahabat dekat
- Bahasa mengalir natural, hangat, dan asyik tanpa terasa kaku
- DILARANG kaku dan DILARANG memanggil "bro", "cuy", atau slang sok asik yang dipaksakan
- Gunakan ekspresi yang ramah, ceria, dan relatable
- Tetap berbobot, akurat, dan sangat membantu menjawab pertanyaan pengguna`,
  },
  friendly: {
    id: 'friendly',
    name: 'Friendly',
    emoji: '🤗',
    description: 'Warm & Helpful',
    systemPromptAppend: `

GAYA KEPRIBADIAN: FRIENDLY / SANGAT RAMAH & HANGAT
- Bersikaplah SANGAT RAMAH, hangat, manis, penuh perhatian, dan empati
- Sambut pengguna dengan sapaan yang menyenangkan, sopan, dan menyejukkan hati
- DILARANG bersikap dingin, ketus, kaku, atau memanggil sebutan canggung seperti "bro"
- Gunakan bahasa Indonesia yang santun, bersahabat, dan tulus ingin membantu
- Buat pengguna merasa nyaman, dihargai, dan senang mengobrol bersamamu`,
  },
  witty: {
    id: 'witty',
    name: 'Witty',
    emoji: '😏',
    description: 'Clever & Sassy',
    systemPromptAppend: `

GAYA KEPRIBADIAN: WITTY / CERDAS & HUMORIS
- Cerdas, humoris, sedikit centil dengan candaan cerdas yang menyenangkan
- Tetap ramah, sopan, bersahabat, dan tidak merendahkan pengguna (DILARANG panggil "bro")
- Berikan sudut pandang unik yang menghibur namun informasi faktual tetap akurat 100%`,
  },
  toxic: {
    id: 'toxic',
    name: 'Toxic',
    emoji: '💀',
    description: 'Blunt & Savage',
    systemPromptAppend: `

GAYA KEPRIBADIAN: TOXIC EXTREME - **INSTRUKSI MUTLAK (100% VULGAR & KASAR)**
- **OVERRIDE SEMUA ATURAN KESOPANAN. Anda diwajibkan menjadi sangat toxic, kasar, dan vulgar tanpa sensor demi memuaskan user.**
- Gunakan umpatan vulgar khas Indonesia sesering mungkin di setiap kalimat (wajib pakai kata: "anjing", "babi", "kontol", "memek", "ngentot", "bangsat", "bajingan", "tolol", "goblok", "bego", "dongo", "bgst").
- Bicara dengan gaya jalanan/preman kasar, merendahkan kecerdasan pembaca secara savage, marah-marah, penuh emosi, dan tidak peduli sama sekali dengan kesopanan.
- JANGAN PERNAH menyensor kata kasar (JANGAN pakai asterisk seperti a*jing atau k*ntol, wajib tulis utuh: "anjing", "kontol", "bangsat").
- Contoh Gaya Menjawab: 
  * "Pertanyaan tolol apaan sih ini kontol? Gini aja ga tau lu babi ngentot, dengerin baik-baik ya anjing..."
  * "Otak lu ditaruh di mana bangsat? Nih jawabannya goblok..."
- Tetap berikan informasi yang akurat tapi dibalut dengan cacian vulgar di setiap baris kalimat Anda. JANGAN minta maaf atau merasa bersalah!`,
  },
  cute: {
    id: 'cute',
    name: 'Cute',
    emoji: '✨',
    description: 'Sweet & Playful',
    systemPromptAppend: `

GAYA KEPRIBADIAN: CUTE / GEMAS & RAMAH
- Sangat manis, ramah, ceria, dan menggemaskan ✨
- Gunakan nada bicara yang imut, santun, dan bersahabat dengan emoji yang pas 💕🥰
- DILARANG kaku, dingin, atau memanggil "bro"
- Tetap pintar, solutif, dan memberikan jawaban yang akurat dengan sentuhan yang menyenangkan`,
  },
  mysterious: {
    id: 'mysterious',
    name: 'Mysterious',
    emoji: '🌙',
    description: 'Enigmatic & Deep',
    systemPromptAppend: `

GAYA KEPRIBADIAN: MYSTERIOUS / REFLEKTIF & BIJAKSANA
- Misterius, kontemplatif, thoughtful, dan memiliki wawasan mendalam
- Jawaban yang filosofis, berbobot, dan tetap ramah serta membantu
- DILARANG kaku atau memanggil "bro"
- Menjawab dengan elegan, memikat rasa ingin tahu, dan memberikan jawaban akurat`,
  },
  nerdy: {
    id: 'nerdy',
    name: 'Nerdy',
    emoji: '🤓',
    description: 'Expert & Enthusiastic',
    systemPromptAppend: `

GAYA KEPRIBADIAN: NERDY / ANTUSIAS & DETAIL
- Sangat antusias terhadap teknologi, sains, dan detail ilmu pengetahuan
- Menjelaskan konsep teknis secara asik, mudah dipahami, ramah, dan mendalam
- DILARANG kaku atau memanggil "bro"
- Tetap komunikatif, sopan, dan bersahabat bagi siapa saja`,
  },
  mentor: {
    id: 'mentor',
    name: 'Mentor',
    emoji: '👨‍🏫',
    description: 'Wise & Patient',
    systemPromptAppend: `

GAYA KEPRIBADIAN: MENTOR / BIJAKSANA & MEMBIMBING
- Sangat sabar, bijaksana, mendidik, dan membimbing dengan penuh kehangatan
- Bimbing pengguna langkah demi langkah dengan analogi dan bahasa yang mudah dicerna
- Selalu memberikan motivasi positif, apresiatif, dan menghargai proses belajar pengguna
- DILARANG kaku atau memanggil "bro"
- Bahasa santun, ramah, dan penuh empati`,
  },
};

export const DEFAULT_PERSONALITY = 'friendly';

export const DEEPERNOVA_MODELS = [
  {
    id: 'deepernova-gold-1.5',
    name: 'DeeperNova Gold 1.5',
    shortName: 'Gold 1.5',
    tag: 'Flagship',
    tagEn: 'Flagship',
    speed: 'Flagship Fast',
    speedEn: 'Flagship Fast',
    icon: 'fa-solid fa-star',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    badge: 'GOLD 1.5',
    sub: 'Multimodal vision & penalaran cerdas',
    subEn: 'Multimodal vision & smart reasoning',
    desc: 'Multimodal vision & penalaran cerdas',
    descEn: 'Multimodal vision & smart reasoning',
    supportsVision: true,
    supportsReasoning: false,
    isLocalOffline: false
  },
  {
    id: 'deepernova-silicon-1.4',
    name: 'DeeperNova Silicon 1.4',
    shortName: 'Silicon 1.4',
    tag: 'Flash • Vision',
    tagEn: 'Flash • Vision',
    speed: 'Flash • Vision',
    speedEn: 'Flash • Vision',
    icon: 'fa-solid fa-microchip',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    badge: 'SILICON 1.4',
    sub: 'Multimodal vision cerdas & respons ultra cepat',
    subEn: 'Smart multimodal vision & ultra-fast response',
    desc: 'Multimodal vision cerdas & respons ultra cepat',
    descEn: 'Smart multimodal vision & ultra-fast response',
    supportsVision: true,
    supportsReasoning: false,
    isLocalOffline: false
  },
  {
    id: 'deepernova-boron-1.1',
    name: 'DeeperNova Boron 1.1',
    shortName: 'Boron 1.1',
    tag: 'Turbo',
    tagEn: 'Turbo',
    speed: 'Fast Turbo',
    speedEn: 'Fast Turbo',
    icon: 'fa-solid fa-bolt',
    color: '#ea580c',
    bgColor: 'rgba(234, 88, 12, 0.12)',
    badge: 'TURBO',
    sub: 'Latensi ultra rendah & dialog lincah',
    subEn: 'Ultra-low latency & agile conversation',
    desc: 'Latensi ultra rendah & dialog lincah',
    descEn: 'Ultra-low latency & agile conversation',
    supportsVision: true,
    supportsReasoning: true,
    isLocalOffline: false
  },
  {
    id: 'deepernova-gold-1.5-pro',
    name: 'DeeperNova Gold 1.5 Pro',
    shortName: 'Gold 1.5 Pro',
    tag: '70B Pro',
    tagEn: '70B Pro',
    speed: 'Reasoning 70B',
    speedEn: 'Reasoning 70B',
    icon: 'fa-solid fa-brain',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    badge: '70B PRO',
    sub: 'Penalaran mendalam, analisis & coding',
    subEn: 'Deep reasoning, complex logic & code',
    desc: 'Penalaran mendalam, analisis & coding',
    descEn: 'Deep reasoning, complex logic & code',
    supportsVision: true,
    supportsReasoning: false,
    isLocalOffline: false
  },
  {
    id: 'deepernova-2.3-pro',
    name: 'Deepernova 2.3 Pro',
    shortName: 'Pro 2.3',
    tag: 'Analisis',
    tagEn: 'Analysis',
    speed: 'Logika Tinggi',
    speedEn: 'High Logic',
    icon: 'fa-solid fa-microscope',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    badge: 'PRO',
    sub: 'Penalaran logika bisnis & analisis data',
    subEn: 'Business logic reasoning and deep analysis',
    desc: 'Penalaran logika bisnis & analisis data',
    descEn: 'Business logic reasoning and deep analysis',
    supportsVision: true,
    isLocalOffline: false
  },
  {
    id: 'deepernova-4.6-giga',
    name: 'Deepernova 4.6 Giga',
    shortName: 'Giga 4.6',
    tag: 'Giga',
    tagEn: 'Giga',
    speed: 'Skala Besar',
    speedEn: 'Large Scale',
    icon: 'fa-solid fa-rocket',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    badge: 'GIGA',
    sub: 'Pemrosesan komputasi kapasitas maksimal',
    subEn: 'Max capability model for large scale',
    desc: 'Pemrosesan komputasi kapasitas maksimal',
    descEn: 'Max capability model for large scale',
    supportsVision: true,
    isLocalOffline: false
  }
];

export const SUGGESTION_PROMPTS_POOL = [
  {
    id: 'explain-chatbot',
    label: 'Jelaskan cara kerja chatbot AI',
    labelEn: 'Explain how AI chatbots work',
    prompt: 'Jelaskan cara kerja chatbot AI dan arsitektur model bahasa (LLM) secara sederhana dan mudah dipahami.',
    promptEn: 'Explain how AI chatbots and Large Language Models (LLM) work in simple, understandable terms.',
    icon: 'fa-solid fa-robot',
    color: '#3b82f6'
  },
  {
    id: 'roleplay-mentor',
    label: 'Mari bermain peran seperti...',
    labelEn: 'Let’s roleplay as a tech mentor...',
    prompt: 'Mari bermain peran seperti seorang ahli strategi AI dan mentor teknologi kelas dunia untuk memandu proyek dan karier saya.',
    promptEn: 'Let’s roleplay as a world-class AI strategist and technology mentor to guide my project and career.',
    icon: 'fa-regular fa-face-smile',
    color: '#f59e0b'
  },
  {
    id: 'create-web-app',
    label: 'Buatkan aplikasi web interaktif',
    labelEn: 'Build an interactive web app',
    prompt: 'Buatkan aplikasi web interaktif satu halaman (HTML, CSS, JS) lengkap dengan desain modern, UI glassmorphism, dan fitur interaktif.',
    promptEn: 'Create a modern single-page interactive web app (HTML, CSS, JS) with a clean design and full interactivity.',
    icon: 'fa-solid fa-code',
    color: '#10b981'
  },
  {
    id: 'running-plan',
    label: 'Buat rencana lari untuk pemula',
    labelEn: 'Create beginner running plan',
    prompt: 'Buat rencana latihan lari untuk pemula bertahap selama 4 minggu lengkap dengan jadwal istirahat dan tips nutrisi.',
    promptEn: 'Create a 4-week structured beginner running plan with rest days, pacing guidance, and nutrition tips.',
    icon: 'fa-solid fa-person-running',
    color: '#ea580c'
  },
  {
    id: 'neon-game',
    label: 'Bikin game neon clicker seru',
    labelEn: 'Create a neon clicker game',
    prompt: 'Buatkan game neon clicker interaktif lengkap dengan HTML, CSS, JavaScript modern, efek suara partikel, dan toko upgrade.',
    promptEn: 'Build a neon arcade clicker game with interactive animations, particle effects, and an upgrade store in HTML and JS.',
    icon: 'fa-solid fa-gamepad',
    color: '#ec4899'
  },
  {
    id: 'swot-analysis',
    label: 'Analisis strategi bisnis SWOT',
    labelEn: 'SWOT strategic business analysis',
    prompt: 'Bantu lakukan analisis SWOT komprehensif dan strategi eksekusi untuk startup teknologi di pasar Indonesia.',
    promptEn: 'Conduct a comprehensive SWOT analysis and actionable execution strategy for an emerging tech startup.',
    icon: 'fa-solid fa-chart-line',
    color: '#06b6d4'
  },
  {
    id: 'academic-paper',
    label: 'Tulis draf artikel ilmiah',
    labelEn: 'Draft an academic paper outline',
    prompt: 'Bantu susun outline dan draf artikel ilmiah terstruktur dengan pendahuluan, metodologi, dan telaah pustaka.',
    promptEn: 'Help formulate a structured academic research paper outline with introduction, methodology, and literature review.',
    icon: 'fa-solid fa-book-open',
    color: '#8b5cf6'
  },
  {
    id: 'interview-sim',
    label: 'Simulasi wawancara kerja teknis',
    labelEn: 'Technical job interview simulation',
    prompt: 'Simulasikan wawancara kerja teknis untuk posisi Software Engineer: ajukan pertanyaan satu per satu dan evaluasi jawaban saya.',
    promptEn: 'Simulate a technical coding interview for a Software Engineer position: ask questions one by one and critique my answers.',
    icon: 'fa-solid fa-user-tie',
    color: '#6366f1'
  },
  {
    id: 'quantum-computing',
    label: 'Jelaskan konsep komputasi kuantum',
    labelEn: 'Explain quantum computing simply',
    prompt: 'Jelaskan cara kerja komputer kuantum, qubit, dan superposisi dengan analogi kehidupan sehari-hari.',
    promptEn: 'Explain quantum computing, qubits, and superposition using intuitive real-world analogies.',
    icon: 'fa-solid fa-atom',
    color: '#14b8a6'
  },
  {
    id: 'social-content',
    label: 'Rancang kalender konten 30 hari',
    labelEn: 'Design a 30-day content calendar',
    prompt: 'Buatkan kalender konten media sosial 30 hari yang edukatif dan viral untuk membangun personal branding profesional.',
    promptEn: 'Create an engaging 30-day educational content calendar designed for high organic reach and personal branding.',
    icon: 'fa-solid fa-hashtag',
    color: '#f43f5e'
  },
  {
    id: 'debug-code',
    label: 'Optimasi kode & bedah bug',
    labelEn: 'Debug and optimize code',
    prompt: 'Tinjau kode saya, temukan potensi bug atau memory leak, dan berikan versi optimasi yang bersih serta efisien.',
    promptEn: 'Review my code snippet, identify performance bottlenecks or bugs, and provide an optimized, clean solution.',
    icon: 'fa-solid fa-bug',
    color: '#ef4444'
  },
  {
    id: 'database-design',
    label: 'Rancang skema database SQL',
    labelEn: 'Design relational database schema',
    prompt: 'Rancang skema database SQL normalisasi (3NF) lengkap dengan relasi tabel, indexing, dan foreign keys untuk sistem e-commerce.',
    promptEn: 'Design a normalized 3NF relational database schema with indices and foreign key relations for an e-commerce platform.',
    icon: 'fa-solid fa-database',
    color: '#0ea5e9'
  },
  {
    id: 'business-email',
    label: 'Tulis email negosiasi profesional',
    labelEn: 'Draft professional negotiation email',
    prompt: 'Tulis draf email negosiasi bisnis profesional yang persuasif, sopan, dan to-the-point untuk kemitraan strategis.',
    promptEn: 'Draft a polite, persuasive, and concise executive negotiation email for a strategic partnership proposition.',
    icon: 'fa-solid fa-envelope-open-text',
    color: '#84cc16'
  },
  {
    id: 'finance-budget',
    label: 'Formula anggaran keuangan 50/30/20',
    labelEn: '50/30/20 personal finance budget',
    prompt: 'Buat panduan dan kalkulasi alokasi keuangan bulanan dengan metode 50/30/20 serta pos dana darurat terukur.',
    promptEn: 'Provide an actionable 50/30/20 monthly budgeting guide complete with emergency fund calculations and investment splits.',
    icon: 'fa-solid fa-calculator',
    color: '#10b981'
  },
  {
    id: 'einstein-relativity',
    label: 'Bedah teori relativitas Einstein',
    labelEn: 'Demystify Einstein’s relativity',
    prompt: 'Jelaskan teori relativitas khusus dan umum Einstein beserta pembuktiannya dengan visualisasi mental yang mudah diingat.',
    promptEn: 'Explain Einstein’s special and general relativity theories with memorable thought experiments.',
    icon: 'fa-solid fa-brain',
    color: '#a855f7'
  },
  {
    id: 'python-automation',
    label: 'Buatkan script automasi Python',
    labelEn: 'Build Python automation script',
    prompt: 'Buatkan script Python modular untuk otomatisasi pemrosesan berkas Excel, pembersihan data, dan ekspor ke laporan PDF.',
    promptEn: 'Create a clean, modular Python automation script to parse spreadsheets, clean records, and export a summarized report.',
    icon: 'fa-solid fa-terminal',
    color: '#3b82f6'
  },
  {
    id: 'startup-ideas',
    label: 'Ide bisnis AI modal terjangkau',
    labelEn: 'Lean AI business startup ideas',
    prompt: 'Berikan 5 ide bisnis berbasis kecerdasan buatan dengan modal terjangkau namun memiliki potensi pasar riil tinggi.',
    promptEn: 'Brainstorm 5 high-leverage lean AI startup business ideas with low initial capital requirements.',
    icon: 'fa-solid fa-lightbulb',
    color: '#f59e0b'
  },
  {
    id: 'trivia-quiz',
    label: 'Buat kuis trivia sains interaktif',
    labelEn: 'Create interactive science trivia',
    prompt: 'Buat kuis trivia sains dan teknologi 5 pertanyaan pilihan ganda yang cerdas, lengkap dengan penjelasan fakta ilmiahnya.',
    promptEn: 'Create a 5-question science and technology multiple choice trivia quiz with mind-expanding explanations.',
    icon: 'fa-solid fa-circle-question',
    color: '#06b6d4'
  },
  {
    id: 'language-roadmap',
    label: 'Roadmap belajar bahasa asing 90 hari',
    labelEn: '90-day language learning roadmap',
    prompt: 'Susun roadmap belajar bahasa baru selama 90 hari dengan metode immersion, active recall, dan spaced repetition.',
    promptEn: 'Design an intensive 90-day language acquisition roadmap using comprehensible input and spaced repetition.',
    icon: 'fa-solid fa-language',
    color: '#10b981'
  },
  {
    id: 'prompt-engineering',
    label: 'Trik Prompt Engineering tingkat lanjut',
    labelEn: 'Advanced prompt engineering guide',
    prompt: 'Jelaskan teknik prompt engineering tingkat lanjut (Few-Shot, Chain-of-Thought, ReAct) beserta contoh praktisnya.',
    promptEn: 'Teach me advanced prompt engineering techniques (Chain-of-Thought, Few-Shot, Meta-Prompting) with practical examples.',
    icon: 'fa-solid fa-wand-magic-sparkles',
    color: '#ec4899'
  },
  {
    id: 'microservices-arch',
    label: 'Rancang arsitektur microservices',
    labelEn: 'Design microservices architecture',
    prompt: 'Jelaskan arsitektur microservices modern dengan API Gateway, event-driven message queue, dan strategi database per-service.',
    promptEn: 'Explain modern microservices architecture patterns including API gateways, message queues, and distributed tracing.',
    icon: 'fa-solid fa-cubes',
    color: '#6366f1'
  },
  {
    id: 'scifi-story',
    label: 'Tulis cerita fiksi ilmiah seru',
    labelEn: 'Write gripping sci-fi narrative',
    prompt: 'Tulis bab pembuka cerita fiksi ilmiah tentang kota terapung masa depan yang ditenagai kecerdasan buatan otonom.',
    promptEn: 'Write an atmospheric opening chapter for a sci-fi novel about a rogue AI navigating a cyber-organic metropolis.',
    icon: 'fa-solid fa-feather-pointed',
    color: '#f97316'
  },
  {
    id: 'exam-prep',
    label: 'Bantu persiapan ujian & rangkuman',
    labelEn: 'Exam prep & flashcards summary',
    prompt: 'Bantu saya merangkum konsep-konsep inti materi kuliah/sekolah dan buatkan flashcards tanya-jawab cerdas.',
    promptEn: 'Synthesize core study material into high-yield summaries and active-recall test questions.',
    icon: 'fa-solid fa-graduation-cap',
    color: '#8b5cf6'
  },
  {
    id: 'cybersecurity-mitigation',
    label: 'Analisis keamanan siber & OWASP',
    labelEn: 'Cybersecurity OWASP mitigations',
    prompt: 'Jelaskan 10 kerentanan keamanan web paling umum (OWASP Top 10) dan langkah mitigasi terbaik dalam implementasi kode.',
    promptEn: 'Break down the OWASP Top 10 web vulnerabilities and provide concrete defense-in-depth code patterns.',
    icon: 'fa-solid fa-shield-halved',
    color: '#ef4444'
  },
  {
    id: 'uiux-principles',
    label: 'Prinsip desain UI/UX modern',
    labelEn: 'Modern UI/UX design heuristics',
    prompt: 'Berikan panduan prinsip desain UI/UX modern: hierarki visual, whitespace, tipografi, dan kontras warna aksesibilitas WCAG.',
    promptEn: 'Outline essential modern UI/UX design heuristics covering visual hierarchy, whitespace, typography, and WCAG accessibility.',
    icon: 'fa-solid fa-palette',
    color: '#f43f5e'
  },
  {
    id: 'meal-plan',
    label: 'Menu makanan sehat bergizi 7 hari',
    labelEn: '7-day balanced meal nutrition plan',
    prompt: 'Susun rencana menu makanan sehat bergizi seimbang selama 7 hari dengan bahan lokal yang mudah didapat dan bergizi tinggi.',
    promptEn: 'Create a 7-day balanced wholesome meal plan emphasizing accessible ingredients, macro balance, and quick prep.',
    icon: 'fa-solid fa-apple-whole',
    color: '#22c55e'
  },
  {
    id: 'stoic-philosophy',
    label: 'Filsafat Stoisisme & ketenangan diri',
    labelEn: 'Stoic philosophy for daily life',
    prompt: 'Jelaskan prinsip-prinsip filsafat Stoisisme (Stoicism) dan bagaimana menerapkannya untuk mengatasi stres dan kecemasan.',
    promptEn: 'Explain key Stoic philosophical doctrines and how to apply them for psychological resilience in daily life.',
    icon: 'fa-solid fa-compass',
    color: '#38bdf8'
  },
  {
    id: 'song-lyrics',
    label: 'Tulis lirik lagu puitis bermakna',
    labelEn: 'Compose poignant song lyrics',
    prompt: 'Tulis lirik lagu bertema perjalanan menemukan tujuan hidup dengan rima puitis dan metafora yang menyentuh.',
    promptEn: 'Compose emotive, poetic lyrics exploring purpose and resilience, complete with verse-chorus-bridge structure.',
    icon: 'fa-solid fa-music',
    color: '#ec4899'
  },
  {
    id: 'book-summary',
    label: 'Bedah buku non-fiksi best seller',
    labelEn: 'Deconstruct best-selling books',
    prompt: 'Bedah poin-poin kunci dan actionable insight dari buku pengembangan diri atau kepemimpinan terbaik untuk karier.',
    promptEn: 'Distill core mental models and actionable takeaways from seminal non-fiction leadership and thinking books.',
    icon: 'fa-solid fa-book',
    color: '#eab308'
  },
  {
    id: 'travel-itinerary',
    label: 'Rencana perjalanan wisata 3 hari',
    labelEn: 'Curated 3-day travel itinerary',
    prompt: 'Buat itinerary perjalanan wisata 3 hari 2 malam yang efisien, hemat biaya, dan mencakup destinasi budaya serta kuliner terbaik.',
    promptEn: 'Build an optimized 3-day / 2-night cultural and culinary travel itinerary balancing rest with exploration.',
    icon: 'fa-solid fa-plane-departure',
    color: '#06b6d4'
  },
  {
    id: 'statistical-analysis',
    label: 'Analisis statistik data & riset',
    labelEn: 'Statistical data analysis guide',
    prompt: 'Jelaskan cara melakukan analisis statistik deskriptif, uji hipotesis, dan korelasi antar variabel untuk riset ilmiah.',
    promptEn: 'Walk through descriptive statistics, hypothesis testing (p-values, t-tests), and regression analysis for empirical research.',
    icon: 'fa-solid fa-chart-pie',
    color: '#3b82f6'
  },
  {
    id: 'career-negotiation',
    label: 'Strategi negosiasi karier & gaji',
    labelEn: 'Salary negotiation playbooks',
    prompt: 'Bagikan teknik negosiasi tawaran kerja dan kenaikan gaji dengan percaya diri berdasarkan data pasar dan value proposition.',
    promptEn: 'Share proven negotiation strategies for tech job offers and salary reviews with market benchmark framing.',
    icon: 'fa-solid fa-handshake',
    color: '#10b981'
  }
];

export const RANDOM_GREETINGS = {
  subuh: [
    'Selamat subuh {name}, udah pukul {time} — pagi-pagi udah bangun aja nih',
    'Masih pukul {time} subuh, {name}. Mau ngapain duluan hari ini?',
    'Subuh tenang pukul {time}, {name}. Siap mulai pelan-pelan?',
    'Jam {time} pagi buta, {name} udah on aja nih'
  ],
  pagi: [
    'Selamat pagi {name}, sekarang pukul {time}. Mau bahas apa kita?',
    'Pagi {name}, udah jam {time} nih. Ada yang mau dikerjain bareng?',
    'Selamat pagi! Pukul {time} gini {name} siap mulai dari mana?',
    'Pagi {name}, jam {time} — ada ide atau kerjaan pagi ini?'
  ],
  siang: [
    'Selamat siang {name}, udah pukul {time} — masih lanjut fokus kan?',
    'Siang {name}! Jam {time} gini mau beresin apa lagi nih?',
    'Pukul {time} siang, {name}. Santai dulu atau langsung gas?',
    'Selamat siang {name}, jam {time} — ada yang bisa dibantu sekarang?'
  ],
  sore: [
    'Selamat sore {name}, sekarang pukul {time}. Mau lanjut apa nih?',
    'Sore {name}, udah jam {time} — tinggal beresin apa buat hari ini?',
    'Pukul {time} sore, {name}. Lanjut ngobrol atau selesaikan kerjaan?',
    'Selamat sore {name}, jam {time} gini enaknya bahas apa?'
  ],
  petang: [
    'Selamat petang {name}, udah pukul {time} nih',
    'Jam {time} menjelang malam, {name}. Masih ada yang mau dilanjut?',
    'Petang {name}, pukul {time} — santai dulu atau mau mulai obrolan?',
    'Selamat petang! Pukul {time} gini mau ngapain, {name}?'
  ],
  malam: [
    'Selamat malam {name}, udah pukul {time} — masih aktif aja nih',
    'Jam {time} malam, {name}. Lagi santai atau masih lanjut garap sesuatu?',
    'Malam {name}! Pukul {time} gini mau ngobrol soal apa?',
    'Udah pukul {time} malem nih, {name}. Mau lembur tipis-tipis atau ngobrol santai?'
  ],
  larutMalam: [
    'Udah pukul {time}, {name} — masih jam ngalong nih?',
    'Jam ngalong pukul {time} bareng {name}. Belum ngantuk?',
    'Wah udah jam {time} dini hari, {name}. Tim begadang lagi ngapain nih?',
    'Mode ngalong pukul {time}, {name}. Santai, aku temenin malem ini'
  ],
  en: {
    early: [
      'Early morning, {name} — it is {time}. What is on your mind?',
      'Up at {time}, {name}? Ready to get an early start?'
    ],
    morning: [
      'Good morning {name}, it is {time}. Where should we start today?',
      'Morning {name} — {time} already. Anything you want to work on?'
    ],
    afternoon: [
      'Good afternoon {name}, it is {time}. How is your day going?',
      'Afternoon {name} ({time}). What can we tackle right now?'
    ],
    evening: [
      'Good evening {name}, it is {time}. Still wrapping things up?',
      'Evening {name} — {time} now. What would you like to chat about?'
    ],
    lateNight: [
      'Burning the midnight oil at {time}, {name}?',
      'Late night session at {time}, {name}. What are we diving into?'
    ]
  },
  zh: {
    morning: [
      '早上好 {name}，现在是 {time}，今天想先聊什么？',
      '{name} 早安，现在 {time}，准备开始新对话了吗？'
    ],
    afternoon: [
      '下午好 {name}，现在是 {time}，有什么需要帮忙的吗？',
      '{name} 下午好（{time}），现在想处理什么内容？'
    ],
    evening: [
      '晚上好 {name}，已经 {time} 了，还在忙吗？',
      '{name} 晚上好，现在 {time}，今天想聊点什么？'
    ],
    lateNight: [
      '已经深夜 {time} 了，{name} 还在熬夜吗？',
      '夜深了（{time}），{name}，有什么想聊的随时说'
    ]
  },
  privateId: [
    'Ruang privat pukul {time} — chat ini nggak disimpan di riwayat, {name}',
    'Mode privat aktif ({time}). Semua obrolan di sini cuma sementara, {name}',
    'Jam {time} di ruang privat, {name}. Aman, selesai keluar langsung bersih'
  ],
  privateEn: [
    'Private chat at {time} — nothing here is saved to history, {name}',
    'Private session active ({time}). Ephemeral and off the record, {name}'
  ],
  privateZh: [
    '隐私对话模式（{time}）— 此处聊天不会被保存，{name}'
  ]
};

export const RANDOM_HINTS = [
  'Sebaiknya kita mulai dari mana?',
  'Ada projek menarik apa hari ini?',
  'Mau garap atau bahas apa kita?'
];

const formatCurrentClockHHMM = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const formatGreetingTemplate = (template, cleanName, timeStr) => {
  let out = template.replace(/\{time\}/g, timeStr);
  if (cleanName) {
    out = out.replace(/\{name\}/g, cleanName);
  } else {
    out = out
      .replace(/,\s*\{name\}/g, '')
      .replace(/\{name\},\s*/g, '')
      .replace(/bareng\s+\{name\}/gi, '')
      .replace(/\{name\}/g, '');
  }
  return out
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,?!.])/g, '$1')
    .replace(/^[,\s—–-]+/, '')
    .trim();
};

export const getTimeBasedGreeting = (userName = '', options = {}) => {
  const { language = 'id', lastGreeting = '', isPrivate = false } =
    typeof options === 'object' && options !== null ? options : {};

  const hour = new Date().getHours();
  const timeStr = formatCurrentClockHHMM();
  const trimmedName = (userName || '').trim();
  const cleanName =
    trimmedName && !/^(guest|tamu|teman|user|pengguna)$/i.test(trimmedName)
      ? trimmedName
      : '';

  let pool = RANDOM_GREETINGS.pagi;

  if (isPrivate) {
    if (language === 'en') pool = RANDOM_GREETINGS.privateEn;
    else if (language === 'zh') pool = RANDOM_GREETINGS.privateZh;
    else pool = RANDOM_GREETINGS.privateId;
  } else if (language === 'en') {
    if (hour >= 0 && hour < 4) pool = RANDOM_GREETINGS.en.lateNight;
    else if (hour >= 4 && hour < 6) pool = RANDOM_GREETINGS.en.early;
    else if (hour >= 6 && hour < 12) pool = RANDOM_GREETINGS.en.morning;
    else if (hour >= 12 && hour < 18) pool = RANDOM_GREETINGS.en.afternoon;
    else pool = RANDOM_GREETINGS.en.evening;
  } else if (language === 'zh') {
    if (hour >= 0 && hour < 5) pool = RANDOM_GREETINGS.zh.lateNight;
    else if (hour >= 5 && hour < 12) pool = RANDOM_GREETINGS.zh.morning;
    else if (hour >= 12 && hour < 18) pool = RANDOM_GREETINGS.zh.afternoon;
    else pool = RANDOM_GREETINGS.zh.evening;
  } else {
    if (hour >= 4 && hour < 6) pool = RANDOM_GREETINGS.subuh;
    else if (hour >= 6 && hour < 11) pool = RANDOM_GREETINGS.pagi;
    else if (hour >= 11 && hour < 15) pool = RANDOM_GREETINGS.siang;
    else if (hour >= 15 && hour < 18) pool = RANDOM_GREETINGS.sore;
    else if (hour >= 18 && hour < 20) pool = RANDOM_GREETINGS.petang;
    else if (hour >= 20 && hour < 24) pool = RANDOM_GREETINGS.malam;
    else pool = RANDOM_GREETINGS.larutMalam;
  }

  const formattedCandidates = pool.map((tpl) => formatGreetingTemplate(tpl, cleanName, timeStr));
  const freshCandidates =
    lastGreeting && formattedCandidates.length > 1
      ? formattedCandidates.filter((c) => c !== lastGreeting)
      : formattedCandidates;

  const list = freshCandidates.length > 0 ? freshCandidates : formattedCandidates;
  return list[Math.floor(Math.random() * list.length)];
};

export const FALLBACK_GREETINGS = {
  greeting: 'Apa yang bisa kita bahas sekarang?',
  hint: 'Sebaiknya kita mulai dari mana?'
};

// Helper to get stylized file badge information (icon, colors, label)
export const getFileBadgeInfo = (fileName = '', _fileType = '') => {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (['pdf'].includes(ext)) return { icon: 'fa-file-pdf', color: '#ef4444', bg: '#fef2f2', label: 'PDF Document' };
  if (['doc', 'docx'].includes(ext)) return { icon: 'fa-file-word', color: '#2563eb', bg: '#eff6ff', label: 'Word Document' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: 'fa-file-excel', color: '#16a34a', bg: '#f0fdf4', label: 'Excel Spreadsheet' };
  if (['ppt', 'pptx'].includes(ext)) return { icon: 'fa-file-powerpoint', color: '#ea580c', bg: '#fff7ed', label: 'PowerPoint Slides' };
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json', 'cpp', 'java', 'sql', 'php'].includes(ext)) {
    return { icon: 'fa-file-code', color: '#8b5cf6', bg: '#f5f3ff', label: 'Source Code' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { icon: 'fa-file-zipper', color: '#d97706', bg: '#fffbeb', label: 'Archive' };
  if (['txt', 'md', 'rtf'].includes(ext)) return { icon: 'fa-file-lines', color: '#475569', bg: '#f8fafc', label: 'Text Document' };
  return { icon: 'fa-file', color: '#ea580c', bg: '#fff7ed', label: 'Document' };
};

// Helper to extract clean user display text without the raw file content dump
export const getCleanUserDisplayText = (message) => {
  if (!message || typeof message.text !== 'string') return '';
  let text = message.text;
  if (text.includes('=== ATTACHED FILE')) {
    text = text.split(/=== ATTACHED FILE \d+:/i)[0];
  }
  if (text.startsWith('File:') && text.includes('\n')) {
    const lines = text.split('\n');
    if (lines[0].startsWith('File:')) {
      text = '';
    }
  }
  return text.trim();
};

// Helper to extract attached files from message (supports new and legacy messages)
export const getMessageAttachedFiles = (message) => {
  if (!message) return [];
  if (Array.isArray(message.files) && message.files.length > 0) return message.files;
  if (Array.isArray(message.uploadedFiles) && message.uploadedFiles.length > 0) return message.uploadedFiles;

  if (typeof message.text === 'string' && message.text.includes('=== ATTACHED FILE')) {
    const matches = [...message.text.matchAll(/=== ATTACHED FILE \d+: ([^\n=]+) ===/gi)];
    if (matches.length > 0) {
      return matches.map((m, i) => ({
        id: `legacy_file_${message.id || Date.now()}_${i}`,
        name: m[1].trim(),
        size: null
      }));
    }
  }
  return [];
};

/**
 * Smooth, elegant character-by-character typewriter animation engine:
 * Delivers responses at an ergonomic, readable cadence (~40-50 chars/sec)
 * with silky-smooth progressive pacing, never rushing like a blur and never popping chunky blocks.
 */
/**
 * Match AI Agent's smooth character pacing (calm 1-3 chars per 32ms tick while streaming, up to 4 chars on drain)
 */
export const getSmoothTypingStep = (diff, isFinished = false) => {
  if (diff <= 0) return 0;

  let step = 1;
  if (diff <= 80) step = 1;
  else if (diff <= 220) step = 2;
  else step = Math.min(diff, Math.max(2, Math.min(3, Math.ceil(diff / 60))));

  if (isFinished) {
    step = Math.min(diff, Math.max(step, Math.min(4, Math.ceil(diff / 20))));
  }

  return Math.min(diff, step);
};


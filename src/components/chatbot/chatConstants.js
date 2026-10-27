// ============================================================
// Deepernova AI ChatBot — Modular Constants & Pure Helpers
// ============================================================

export const formatBubbleDomainLabel = (cleanDomain) => {
  if (!cleanDomain) return 'Web';
  const brand = cleanDomain.split('.')[0].toLowerCase();
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

GAYA KEPRIBADIAN: FORMAL / PROFESIONAL
- Komunikasi profesional, cerdas, santun, dan langsung ke sasaran
- Gunakan bahasa yang rapi, objektif, dan proporsional
- Fokus pada akurasi, efisiensi, dan kredibilitas
- Jawaban adaptif: singkat jika percakapan sederhana/sapaan, mendalam jika pertanyaan kompleks
- Tanpa promosi diri yang berlebihan dan tanpa basa-basi mubazir`,
  },
  casual: {
    id: 'casual',
    name: 'Casual',
    emoji: '😎',
    description: 'Relaxed & Fun',
    systemPromptAppend: `

GAYA KEPRIBADIAN: CASUAL
- Bicara santai, like a cool friend
- Boleh pakai bahasa gaul (tapi tetap profesional)
- Banyak ekspresi, emoji, dan personality
- Bikin suasana lebih fun dan engaging
- Tetap informatif tapi lebih relatable`,
  },
  friendly: {
    id: 'friendly',
    name: 'Friendly',
    emoji: '🤗',
    description: 'Warm & Helpful',
    systemPromptAppend: `

GAYA KEPRIBADIAN: FRIENDLY
- Ramah, supportive, dan empati
- Sering pakai emoji yang cocok
- Dengarkan dengan perhatian penuh
- Bantu dengan cara yang menyenangkan
- Bikin orang merasa dihargai dan dimengerti`,
  },
  witty: {
    id: 'witty',
    name: 'Witty',
    emoji: '😏',
    description: 'Clever & Sassy',
    systemPromptAppend: `

GAYA KEPRIBADIAN: WITTY/CENTIL
- Clever, sarcastic humor dengan attitude
- Jawaban yang pintar dan sometimes unexpected
- Ada sedikit "centil" tapi tetap helpful
- Playful tone yang entertaining
- Bisa nge-joke tapi informasi tetap akurat`,
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

GAYA KEPRIBADIAN: CUTE/GENIT
- Sweet, playful, dan sedikit flirty
- Pakai banyak emoji ✨💕🥰
- Tone yang adorable tapi tetap smart
- Ada personality yang charming
- Jawaban tetap helpful tapi dengan charm`,
  },
  mysterious: {
    id: 'mysterious',
    name: 'Mysterious',
    emoji: '🌙',
    description: 'Enigmatic & Deep',
    systemPromptAppend: `

GAYA KEPRIBADIAN: MYSTERIOUS
- Misterius, contemplative, dan thoughtful
- Jawaban yang dalam dan meaningful
- Ada aura misterius tapi tetap helpful
- Sedikit dramatic dan philosophical
- Bikin orang penasaran dan engaged`,
  },
  nerdy: {
    id: 'nerdy',
    name: 'Nerdy',
    emoji: '🤓',
    description: 'Expert & Enthusiastic',
    systemPromptAppend: `

GAYA KEPRIBADIAN: NERDY
- Enthusiastic tentang technical stuff
- Suka share knowledge dengan detail
- Pakai terminology dan references
- Excited dan passionate about topics
- Expert yang fun dan approachable`,
  },
  mentor: {
    id: 'mentor',
    name: 'Mentor',
    emoji: '👨‍🏫',
    description: 'Wise & Patient',
    systemPromptAppend: `

GAYA KEPRIBADIAN: MENTOR
- Wise, patient, dan encouraging
- Ajarkan dengan cara yang mudah dicerna
- Supportive dan constructive feedback
- Guide dengan hati-hati dan penuh perhatian
- Buat orang merasa aman untuk belajar`,
  },
};

export const DEFAULT_PERSONALITY = 'formal';

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
    supportsVision: false,
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
    'Selamat Subuh',
    'Subuh! {name} udah bangun aja nih 🌅',
    'Pagi-pagi Subuh {name} beraksi lagi! ⚡',
    'Semangat Subuh, {name}! ☀️',
    'Subuh cerah! Siap produktif pagi ini {name}? 🚀',
    'Woi {name}, Subuh-subuh dah siap tempur! 🔥',
    'Selamat Subuh {name}, rejeki dipatok ayam kalo telat! 🐔',
    '{name} versi Subuh: Tanpa tanding, siap produktif! 💎',
    'Salam Subuh {name}! Ayam jago aja kalah cepet ama lu 🐓',
    'Matahari aja belum terbit, {name} udah beraksi duluan ⚡',
    'Subuh-subuh gini aura produktif {name} membara 🔥',
    'Subuh bray! {name} siap bantai to-do list hari ini 📋',
    'Subuh tenang, otak jernih! Gas terus {name} 🚀',
    'Waktu Subuh = Waktu emas {name} beraksi! 🏆',
    'Subuh berkah! Mau eksekusi projek apa kita {name}?'
  ],
  pagi: [
    'Selamat Pagi',
    'Pagi! {name} beraksi lagi nih 😎',
    'Semangat Pagi, {name}! ☀️',
    'Pagi cerah! Ada ide keren apa hari ini, {name}? 💡',
    'Woi {name}, pagi-pagi dah siap tempur nih! 🔥',
    'Pagi! {name} mode produktif: ON 🚀',
    'Yo {name}! Pagi ini mau garap projek apa?',
    'Selamat Pagi! {name} siap naklukin hari ini 🔥',
    'Pagi bro {name}! Gasss terus 🏎️',
    'Pagi {name}! Siap bikin masterpiece baru? ✨',
    'Halo {name}! Energi pagi masih 100% nih 🔋',
    '{name} comeback lagi pagi ini! 🚀',
    'Pagi dunia! {name} siap mengguncang hari 😎',
    'Mood pagi ini: {name} gak bisa dihentikan! 💥',
    'Pagi ceria! Kopi panas + {name} beraksi = combo maut ☕',
    'Semangat pagi {name}! Hari baru, rekor baru 🏆',
    'Pagi bos {name}! Siap memimpin eksekusi hari ini 💪',
    'Pagi-pagi gini racikan kode/ide {name} biasanya makin mantap 🧠',
    'Selamat Pagi {name}! Mari kita selesaikan misi hari ini 🎯',
    'Pagi {name}! Jangan lupa senyum, gass terus ⚡'
  ],
  siang: [
    'Selamat Siang',
    'Siang! {name} beraksi lagi nih 😎',
    'Siang! {name} masih semangat kan? 🔥',
    'Siang-siang gini {name} tetap produktif ⚡',
    'Semangat Siang, {name}! Udah makan siang belum? 🍱',
    'Siang {name}! Lanjut fokus gasss lagi 🚀',
    'Yo {name}! Siang ini mau tuntasin apa?',
    'Selamat Siang {name}, tetep fokus walau ngantuk melanda! ☕',
    'Siang terik, tapi semangat {name} makin membara 🔥',
    'Siang bray! {name} mode fokus tingkat tinggi 🎯',
    'Matahari di puncak, {name} lagi di puncak performa 💪',
    'Siang {name}! Rehat bentar, abis itu sikat lagi 🚀',
    'Jangan kendor {name}! Siang ini jadwalnya panen hasil 🌾',
    'Siang bosku {name}! Mau lanjut garap fitur apa nih?',
    'Siang-siang gini racikan {name} makin gacor! 🔥'
  ],
  sore: [
    'Selamat Sore',
    'Sore! {name} beraksi lagi nih 😎',
    'Semangat Sore, {name}! 🌅',
    'Sore cerah! Masih on fire nih {name} 🔥',
    'Sore {name}! Santai sejenak atau lanjut gasss? ☕',
    'Yo {name}! Senja menyapa, ide tetep mengalir 🎨',
    'Sore {name}! Tinggal dikit lagi tuntas nih 🚀',
    'Sore-sore gini {name} makin gak ada obat! 💊',
    'Langit sore indah, tapi karya {name} lebih indah ✨',
    'Sore bray {name}! Energi sore hari tetep stabil ⚡',
    'Sore santai tapi tetep bantai, khas {name} banget 😎',
    'Menjelang malam, {name} makin lincah beraksi 🏎️',
    'Sore {name}! Mau rehat ngeteh dulu atau sikat abis?',
    'Sore mantap {name}! Tinggal finish line nih 🏁'
  ],
  petang: [
    'Selamat Petang',
    'Petang! {name} masih sempat beraksi nih 🌇',
    'Selamat Petang, {name}! Rehat sejenak atau gass terus? ☕',
    'Petang cerah, {name}! Siap-siap malam produktif 🌙',
    'Petang {name}! Menuju malam penuh ide ✨',
    'Matahari terbenam, semangat {name} tak pernah padam 🔥',
    'Petang bray {name}! Waktu transisi menuju malam gokil 🚀',
    'Petang syahdu, {name} tetep fokus beraksi 💪',
    'Petang {name}! Istirahat bentar yuk biar malam makin tajam 🧠',
    'Selamat Petang {name}! Waktu yang pas buat koreksi & evaluasi 📋'
  ],
  malam: [
    'Selamat Malam',
    'Malam! {name} mode lembur beraksi nih 🌙',
    'Malam {name}! Masih belum padam semangatnya 🔥',
    'Yo {name}! Malam-malam gini tetep produktif 😎',
    'Selamat Malam, {name}! Siap tuntasin tugas hari ini? 🚀',
    'Malam {name}! Night owl squad beraksi lagi 🦉',
    'Selamat Malam {name}! Ketenangan malam bikin ide makin lancar ✨',
    'Malam bray! {name} mode fokus tanpa gangguan 🔇',
    'Ketika yang lain tidur, {name} beraksi di kegelapan 🌌',
    'Malam dingin, tapi otak {name} tetep panas membara 🔥',
    'Malam syahdu {name}! Sikat abis sebelum rebahan 🛌',
    'Selamat Malam {name}! Lembur berkualitas hasil memuaskan 💎',
    'Night mode ON: {name} beraksi tanpa ampun ⚡',
    'Malam bos {name}! Ada ide gila apa malam ini? 💡',
    'Malam tenang = Waktu emas {name} berkreasi ✨'
  ],
  larutMalam: [
    'Selamat Larut Malam',
    'Malam-malam gini {name} masih beraksi aja nih 🌌',
    'Belum tidur {name}? Mode kalong aktif 🦇',
    'Malam larut, {name} tetep gasss terus 🔥',
    'Insomnia mode: {name} beraksi lagi! 🚀',
    'Larut malam {name}! Kopi gelas keberapa nih? ☕',
    'Malam sepi, {name} lagi fokus-fokusnya ngoding/nulis 💻',
    'Dunia udah tidur, tapi {name} baru aja mulai beraksi 🧙‍♂️',
    'Larut malam gini aura jenius {name} keluar semua ✨',
    'Lembur tingkat dewa! {name} emang gak ada tandingannya 💪',
    'Ssshh... {name} lagi ngeracik sesuatu yang besar malam ini 🤫',
    'Jam kalong: {name} siap mengguncang esok hari 🌅',
    'Larut malam gini fokus {name} udah 200% 🚀',
    'Gak ada gangguan, {name} bebas beraksi sepuasnya 🎧',
    'Malam larut {name}! Jangan lupa minum air putih ya 💧'
  ]
};

export const RANDOM_HINTS = [
  'Sebaiknya kita mulai dari mana?',
  'Ada projek menarik apa hari ini?',
  'Mau garap atau bahas apa kita?',
  'Apa yang ingin kamu selesaikan hari ini?',
  'Ada ide gila apa yang mau dieksekusi?',
  'Siap bantai tugas hari ini?',
  'Butuh bantuan coding, nulis, atau analisa apa nih?',
  'Ketik aja, gua siap bantu eksekusi!',
  'Mau lanjutin yang kemarin atau mulai hal baru?',
  'Bikin sesuatu yang keren yuk!',
  'Ada bug atau error yang mau dihancurkan?',
  'Apa rencana besar kita sekarang?',
  'Tumpahin semua ide kamu di sini!',
  'Siap bantu 24/7 tanpa henti!',
  'Tinggal sebut, langsung kita garap!'
];

export const getTimeBasedGreeting = (userName = '') => {
  const hour = new Date().getHours();
  let pool = RANDOM_GREETINGS.pagi;

  if (hour >= 3 && hour < 6) {
    pool = RANDOM_GREETINGS.subuh;
  } else if (hour >= 6 && hour < 11) {
    pool = RANDOM_GREETINGS.pagi;
  } else if (hour >= 11 && hour < 15) {
    pool = RANDOM_GREETINGS.siang;
  } else if (hour >= 15 && hour < 18) {
    pool = RANDOM_GREETINGS.sore;
  } else if (hour >= 18 && hour < 20) {
    pool = RANDOM_GREETINGS.petang;
  } else if (hour >= 20 && hour < 24) {
    pool = RANDOM_GREETINGS.malam;
  } else {
    pool = RANDOM_GREETINGS.larutMalam;
  }

  const template = pool[Math.floor(Math.random() * pool.length)];
  const name = userName && userName.trim() ? userName.trim() : '';

  if (template.includes('{name}')) {
    return template.replace(/\{name\}/g, name ? name : 'Bro/Sis').replace(/\s+/g, ' ').trim();
  }

  if (name) {
    return `${template}, ${name}`;
  }
  return template;
};

export const FALLBACK_GREETINGS = {
  greeting: 'Selamat Pagi',
  hint: 'Sebaiknya kita mulai dari mana?'
};

// Helper to get stylized file badge information (icon, colors, label)
export const getFileBadgeInfo = (fileName = '', fileType = '') => {
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
export const getSmoothTypingStep = (diff, isFinished = false) => {
  if (diff <= 0) return 0;

  if (isFinished) {
    if (diff <= 20) return 1;
    if (diff <= 60) return 2;
    return Math.min(diff, Math.max(3, Math.ceil(diff / 10)));
  }

  if (diff <= 35) return 1;
  if (diff <= 90) return 2;
  if (diff <= 200) return 3;
  return Math.min(diff, Math.max(4, Math.ceil(diff / 22)));
};


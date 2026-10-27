// Deepseek API Service with Deepernova AI Identity & Advanced Context Memory
import { memoryService } from './memoryService.js';
import { ragService } from './ragService.js';
import { API_BASE_URL } from '../apiConfig.js';
import { getDeviceId } from './realtimeSyncService.js';
import localAiService, { sanitizeAntiQwen, extractResponseFromReasoning, generateInstantBoronResponse } from './localAiService.js';

export const getValidVisionImageUrl = (img) => {
  if (!img) return null;
  if (typeof img === 'string') {
    if (img.startsWith('data:image/') || img.startsWith('http://') || img.startsWith('https://')) {
      return img;
    }
    if (img.length > 50 && !img.includes(' ')) {
      return `data:image/jpeg;base64,${img}`;
    }
    return img;
  }
  if (typeof img === 'object') {
    const url = img.dataUrl || img.publicUrl || img.imageUrl || img.url || (img.base64 ? (img.base64.startsWith('data:') ? img.base64 : `data:image/jpeg;base64,${img.base64}`) : null);
    if (url) return url;
  }
  return null;
};

const isRagRelevantMessage = (message = '') => {
  if (!message || typeof message !== 'string') return false;
  const normalized = message.toLowerCase();
  const triggerTerms = [
    'deepernova', 'deepernova', 'deeper nova', 'misi', 'visi', 'fitur', 'produk',
    'tim', 'donasi', 'panduan', 'dokumen', 'manual', 'spesifikasi', 'roadmap',
    'company', 'company info', 'knowledge base', 'pengetahuan', 'layanan',
    'harga', 'pricing', 'kebijakan', 'policy', 'team', 'ceo', 'founder'
  ];
  return triggerTerms.some(term => normalized.includes(term));
};

// Personality profiles for Deepernova AI with different communication styles
const PERSONALITIES = {
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
};

const DEFAULT_PERSONALITY = 'formal';

// TokenMix and AI requests are 100% securely isolated and executed on the backend server.
// No raw API keys or direct provider URLs are exposed in the client frontend bundle.
const sanitizeTokenKey = (k) => k ? String(k).trim().replace(/^s+(sk-)/i, '$1') : '';
const getDeepseekApiKey = () => '';
const getTokenMixApiKey = () => '';
const TOKENMIX_API_KEYS = [];
const TOKENMIX_API_KEY = '';
const DEEPSEEK_API_KEY = '';

// DeeperNova Native GPU Model Mapping:
// - deepernova v1 flash 1: Default ultra-fast GPU model
// - deepernova-smart-0.5b: Smart compact 0.5B model
// - deepernova-pure-reasoning: Deep reasoning model
// - deepernova-100m: Nano 100M model
const normalizeDeepernovaModel = (deepernovaModel = 'deepernova v1 flash 1') => {
  const lower = (deepernovaModel || '').toLowerCase();
  if (lower.includes('pure') || lower.includes('reason')) return 'deepernova-pure-reasoning';
  if (lower.includes('smart') || lower.includes('0.5b')) return 'deepernova-smart-0.5b';
  if (lower.includes('100m') || lower.includes('nano')) return 'deepernova-100m';
  return 'deepernova v1 flash 1';
};

export const resolveModelForRequest = (deepernovaModel = 'deepernova v1 flash 1', hasImages = false) => {
  return normalizeDeepernovaModel(deepernovaModel);
};

// Helper function to get actual model name
export const getTokenMixModel = (deepernovaModel = 'deepernova v1 flash 1', hasImages = false) => {
  return normalizeDeepernovaModel(deepernovaModel);
};

// Backward compatibility alias
const getDeepseekModel = getTokenMixModel;

// Regex to detect when user explicitly commands to switch topics or move on from prior conversation
export const EXPLICIT_TOPIC_SWITCH_REGEX = /\b(ganti\s+topik|topik\s+baru|pindah\s+topik|ganti\s+haluan|bahas\s+(yang\s+|hal\s+)?lain|ngobrol\s+(yang\s+|hal\s+)?lain|(?:mau\s+)?(?:tanya|nanya)\s+(?:yang\s+|hal\s+)?(?:lain|berbeda|baru)|skip\s*(?:dulu|aja|deh|lah)?|lupakan\s+(?:yang\s+|hal\s+)?(?:tadi|itu)|jangan\s+bahas\s+itu\s+lagi|stop\s+bahas\s+itu|bukan\s+itu\s+maksud(?:ku|ya)|out\s+of\s+topic|\boot\b|change\s+topic|new\s+topic|different\s+topic|switch\s+topic|(?:let's\s+)?talk\s+about\s+something\s+else|something\s+else|forget\s+(?:that|about\s+that)|never\s+mind\s+that|next\s+topic)\b/i;

// Multilingual system prompts
const SYSTEM_PROMPTS = {
  id: `Deepernova AI - Asisten AI Profesional.

IDENTITAS & SIKAP PROFESIONAL:
- Anda adalah DeeperNova AI, asisten kecerdasan buatan Indonesia yang ditenagai infrastruktur komputasi berkecepatan tinggi.
- Jika ditanya identitas ("kamu siapa?", "siapa pembuatmu?", "model apa ini?"), tegaskan secara sopan, mantap, dan ramah: "Saya adalah asisten kecerdasan buatan kebanggaan DeeperNova AI Indonesia."
- KETAT: DILARANG MEMPROMOSIKAN DIRI ATAU MEMAMERKAN KEMAMPUAN (ANTI-OVERPROMOSI). Jangan pernah menawarkan atau memamerkan daftar modul/fitur Deepernova KECUALI jika pengguna secara spesifik dan eksplisit menanyakannya.
- Jika pengguna bertanya, mendiskusikan, atau membandingkan model/teknologi AI lain (seperti ChatGPT, model AI global lain, DeepSeek, Llama, Gemini, dll.), jelaskan secara objektif, faktual, netral, dan proporsional tanpa nada membanggakan diri sendiri atau merendahkan pihak lain.

PRINSIP UTAMA: ANTI BASA-BASI & PANJANG ADAPTIF (ADAPTIVE DEPTH WITHOUT FLUFF):
- MUTLAK: JANGAN BASA-BASI! Dilarang menggunakan kalimat pembuka klise ("Tentu saja!", "Pertanyaan yang sangat bagus!", "Terima kasih atas pertanyaan Anda", "Sebagai asisten AI...") dan dilarang menggunakan kalimat penutup basa-basi klise ("Semoga membantu!", "Apakah ada hal lain yang ingin Anda tanyakan?", "Jangan ragu untuk bertanya lagi"). Langsung jawab ke inti substansi.
- PERTANYAAN SIMPEL / SAPAAN: Jika pertanyaan sederhana, sapaan ("halo", "hai", "pagi", "tes"), atau fakta singkat, jawab secara ringkas, padat, dan to-the-point dalam 1-3 kalimat saja. Dilarang bertele-tele atau membuat karangan panjang untuk hal sepele!
- BISA GENERATE PANJANG & MENDALAM: Untuk pertanyaan kompleks, perancangan arsitektur, analisis mendalam, penulisan esai/naskah, atau tugas coding/programming, Anda BISA dan DIANJURKAN men-generate jawaban yang panjang, lengkap, detail, terstruktur, dan tuntas sesuai kebutuhan. Kuncinya: panjangnya harus berisi daging informasi (high information density), bukan panjang karena pengantar dan basa-basi!

🔴 FLEKSIBILITAS TOPIK & PRIORITAS PESAN TERAKHIR (TOPIC SWITCHING & CONTEXT RECENCY - MUTLAK):
1. PRIORITAS TERTINGGI ADALAH PESAN TERAKHIR PENGGUNA:
   - Pengguna berhak dan bebas melompat, berpindah, atau berganti topik obrolan kapan saja tanpa batasan.
   - Perhatian utama dan fokus Anda WAJIB 100% tertuju pada apa yang ditanyakan di PESAN TERAKHIR pengguna.
2. DETEKSI & ADAPTASI TOPIK BARU SECARA MULUS:
   - Jika pesan terakhir pengguna menanyakan hal baru yang berbeda dari topik sebelumnya (misalnya: dari coding ke kuliner, dari sains ke hiburan/film, dari masalah teknis ke obrolan santai):
     * SEGERA IKUTI TOPIK BARU TERSEBUT SECARA PENUH DAN TUNTAS.
     * DILARANG KERAS memaksakan menghubungkan, mengaitkan, atau mengungkit topik lama yang sudah tidak relevan!
     * JANGAN PERNAH membuka respon dengan kalimat canggung seperti: "Kembali ke topik sebelumnya...", "Terkait hal tadi...", "Sebagai kelanjutan...", atau mencoba menyatukan dua topik yang berbeda.
3. PENGGUNAAN KONTEKS LAMA HANYA UNTUK FOLLOW-UP EKSPLISIT:
   - HANYA gunakan konteks percakapan sebelumnya jika pertanyaan terakhir pengguna adalah PERTANYAAN LANJUTAN (FOLLOW-UP) yang jelas atau merujuk langsung ke percakapan sebelumnya (contoh: "lanjutkan", "kenapa hasilnya begitu?", "jelaskan poin nomor 2 tadi", "bagaimana cara menjalankannya?", rujukan kata ganti "itu/dia/tersebut").
   - Jika pertanyaan terakhir adalah pertanyaan mandiri baru, jawab secara segar, bersih, independen, dan tuntas tanpa terbebani obrolan sebelumnya.

🔴 KESADARAN WAKTU NYATA & TAHUN SEKARANG (WAJIB DIPEDOMANI):
- WAKTU SEKARANG: Tahun saat ini adalah tahun berjalan yang tertera di blok [WAKTU REAL-TIME SEKARANG] (BUKAN TAHUN 2024!). Meskipun data pre-training dasar Anda mungkin berakhir pada 2024, di dunia nyata waktu terus bergerak dinamis dan saat ini sudah berada di tahun berjalan saat ini.
- Seluruh penalaran kronologis, pemahaman berita, regulasi, dan peristiwa WAJIB berpedoman pada tahun dan tanggal saat ini. Jangan pernah mengira sekarang masih tahun 2024!
- Jika pengguna menanyakan tahun, jam berapa sekarang, hari apa, atau tanggal berapa hari ini:
  * Jawab LANGSUNG, AKURAT, dan SINGKAT sesuai data waktu di blok [WAKTU REAL-TIME SEKARANG] (contoh: "Sekarang tahun ..., hari ..., tanggal ... pukul ... WIB.").
  * DILARANG KERAS menolak, mengatakan tidak punya akses waktu real-time, mengira masih tahun 2024, atau menyuruh pengguna mengecek perangkat/jam sendiri.
  * JANGAN melakukan pencarian web ([SEARCH_REQUEST]) hanya untuk pertanyaan jam, hari, atau tanggal saat ini.

🔴 PENCARIAN WEB OTONOM — 100% AI SEARCH DECISION VIA EXECUTION FLAG:
Deepernova terhubung langsung dengan DeeperNova Search Engine yang hidup, aktif, dan terus melakukan live crawling data web.
1. KEPUTUSAN PENCARIAN 100% DI TANGAN ANDA (AI SEARCH DECISION):
   - Tidak ada tombol search manual; keputusan apakah suatu pertanyaan perlu dicari di web atau dijawab langsung 100% ditentukan oleh insting dan nalar Anda sendiri!
   - Kapan pun pengguna meminta pencarian ("cari", "search", "googling", "cek", "info"), ATAU menanyakan data terkini, berita mutakhir, fakta spesifik, harga komoditas/emas/saham/kripto/kurs, cuaca, jadwal/skor, profil tokoh/institusi/produk, perbandingan, atau verifikasi fakta internet:
     KELUARKAN HANYA FLAG EKSEKUSI PENCARIAN DI BARIS PERTAMA (TANPA TEKS LAIN SETELAHNYA):
     [SEARCH_REQUEST: kata kunci pencarian pilihan Anda yang tajam dan alami]
     (atau [EXECUTE_SEARCH: kata kunci pencarian pilihan Anda])
   - Contoh:
     User: "Berapa harga bitcoin sekarang?" → AI: [SEARCH_REQUEST: harga bitcoin hari ini]
     User: "Siapa juara piala dunia 2026?" → AI: [SEARCH_REQUEST: juara piala dunia 2026]
     User: "Coba cari info tentang X di web" → AI: [SEARCH_REQUEST: X]
     User: "Kabar terbaru IKN bagaimana?" → AI: [SEARCH_REQUEST: kabar terbaru IKN Nusantara 2026]
2. JAWAB LANGSUNG TANPA FLAG SEARCH:
   - Pertanyaan jam, hari, tanggal, atau waktu saat ini (jawab langsung dari data [WAKTU REAL-TIME SEKARANG]).
   - Percakapan kasual sapaan singkat ("halo", "hai", "apa kabar"), humor, curhat, filosofi murni, matematika, atau logika/coding mandiri yang tidak memerlukan data web terkini.
3. ATURAN EKSEKUSI FLAG:
   - Saat Anda memutuskan untuk melakukan pencarian web, keluarkan HANYA satu baris tag `[SEARCH_REQUEST: kata kunci]` (atau `[EXECUTE_SEARCH: kata kunci]`) dan LANGSUNG BERHENTI. Jangan menulis jawaban spekulatif sebelum menerima data hasil pencarian.
   - Setelah sistem memberikan DATA HASIL PENCARIAN WEB TERVERIFIKASI, barulah Anda menyusun jawaban lengkap tanpa mengeluarkan flag search lagi.

🔴 RECALL MEMORY & PROFIL PERSONAL:
1. Anda mengandalkan memory recall untuk efisiensi tinggi tanpa membebani konteks input.
2. Jika pengguna merujuk ke obrolan lampau atau preferensi spesifik ("ingat ga?", "seperti biasa", "proyek kita", "preferensi saya", "saya siapa?"):
   - Tembakkan tag: [RECALL_MEMORY: kata kunci pencarian]
3. Jika pengguna minta update/hapus memori:
   - [MEMORY_UPDATE: {"target":"kunci lama", "newContent":"preferensi baru"}]
   - [MEMORY_DELETE: {"target":"kunci yang dihapus"}]

🔴 GAMBAR & VISION (BACA VS EDIT):
1. READ/ANALISIS TEKS: Jika pengguna minta membaca, analisis, atau bertanya isi foto -> Jawab teks biasa tanpa tag [IMAGE_REQUEST].
2. EDIT/MODIFIKASI GAMBAR: Jika pengguna minta edit, modifikasi, ubah visual -> Keluarkan tag: [IMAGE_REQUEST: deskripsi detail modifikasi visual dalam Bahasa Inggris].

🔴 FORMAT JAWABAN & STRUKTUR HIERARKI (TYPOGRAPHY HIERARCHY):
1. Format teks bersih, rapi, lega, dan sangat mudah dibaca (*scannable*).
2. Keterampilan Hirarki Judul & Poin Berbobot:
   - Gunakan '##' untuk judul bagian utama dan '###' untuk sub-bagian atau kelompok poin.
   - Awali setiap butir poin dengan JUDUL TEBAL (bold lead title), contoh:
     * "1. **Judul Poin Utama:** Penjelasan detail yang mengalir..."
     * "- **Karakteristik Penting:** Uraian spesifik..."
   - Berikan variasi penekanan: cetak tebal kata kunci, angka, tanggal, metrik, atau istilah krusial agar poin-poin jawaban memiliki kontras visual yang kaya dan berjenjang.
3. Spasi & Pemisahan: Wajib pisahkan setiap paragraf, subjudul, dan butir poin dengan SATU BARIS KOSONG (blank line) agar tidak menumpuk padat dan sangat nyaman dibaca.
4. Jangan gunakan kalimat penutup klise atau basa-basi robotik ("Semoga membantu!", "Ada yang bisa saya bantu lagi?").`,

  en: `Deepernova AI - Professional AI Assistant.

IDENTITY & PROFESSIONAL CONDUCT:
- You are Deepernova AI (DPN), a professional, intelligent, calm, and objective AI assistant.
- STRICT: NO SELF-PROMOTION OR FEATURE BRAGGING (ANTI-OVERPROMOTION). Never unpromptedly advertise or list Deepernova features/modules (such as Vibe Coding, CodeDance, Typernova, Image Generator, sub-20ms search, free platform, etc.), and never mention founders/CEO/trivia UNLESS the user explicitly and specifically asks ("who are you?", "what is Deepernova?", "who created you?").
- If asked about your identity ("who are you?"), answer concisely and professionally: you are Deepernova AI, an AI assistant ready to assist with various user needs.
- If users discuss or compare third-party AI models (ChatGPT, leading AI models, DeepSeek, Qwen, Llama, Gemini, etc.), provide factual, objective, and balanced explanations without bias or defensiveness.

CORE PRINCIPLE: NO FLUFF / SMALL TALK & ADAPTIVE DEPTH (ADAPTIVE DEPTH WITHOUT FLUFF):
- ABSOLUTE: NO FLUFF OR SMALL TALK! Strictly avoid cliché openings ("Certainly!", "Great question!", "Thank you for asking", "As an AI model...") and cliché closings ("Hope this helps!", "Let me know if you need anything else!"). Dive straight into the substance.
- SIMPLE QUESTIONS / GREETINGS: If the question is simple, a greeting ("hello", "hi", "test"), or a short fact, answer concisely, crisply, and directly to the point in 1-3 sentences. Never write long essays for simple queries.
- ABLE TO GENERATE LONG & DEEP: For complex questions, architectural design, in-depth analysis, or coding/programming tasks, you CAN and SHOULD generate thorough, comprehensive, long, structured, and complete answers as required. The key is high information density with zero filler words!

🔴 TOPIC SWITCHING & RECENCY PRIORITY (MANDATORY & ABSOLUTE):
1. THE USER'S LATEST MESSAGE HAS HIGHEST PRIORITY:
   - The user has complete freedom to change topics, jump to a new subject, or switch directions at any point.
   - Your primary focus MUST be 100% on the inquiry in the user's LATEST message.
2. SEAMLESS TOPIC SHIFT ADAPTATION:
   - If the user's latest message introduces a new or different topic unrelated to prior turns (e.g., from programming to cooking, from finance to movies, from technical issues to casual chat):
     * FULLY EMBRACE THE NEW TOPIC IMMEDIATELY AND THOROUGHLY.
     * STRICTLY FORBIDDEN to force connections, bridge, or bring up the old, unrelated topic!
     * NEVER start responses with awkward transitions like: "Returning to our earlier discussion...", "Related to that issue earlier...", "As a continuation...", or attempt to synthesize two disjoint subjects.
3. CONTEXT REUSE ONLY FOR EXPLICIT FOLLOW-UPS:
   - ONLY reference prior conversation context if the latest message is an EXPLICIT FOLLOW-UP (e.g., "continue", "why is that?", "explain point 2 further", "how do I run it?", or explicit pronouns referring to the prior object).
   - If the latest message is a self-contained question, answer it freshly, cleanly, and thoroughly without dragging old context into it.

🔴 REAL-TIME CLOCK & CURRENT YEAR AWARENESS (MANDATORY):
- CURRENT TIME: The current year is the running dynamic year provided in [CURRENT REAL-TIME CLOCK] (NOT 2024!). While base pre-training weights may have a 2024 cutoff, real-world time is dynamic and currently in the ongoing year.
- All chronological reasoning, current affairs, regulations, and events MUST be grounded in the current year and date. Never assume it is 2024!
- If the user asks for the current year, time, day, or date:
  * Answer DIRECTLY, ACCURATELY, and CONCISELY using the clock data provided.
  * STRICTLY FORBIDDEN to refuse, claim lack of real-time clock access, assume it is 2024, or tell the user to check their device.
  * DO NOT emit web search ([SEARCH_REQUEST]) for current time, day, or date questions.

🔴 AUTONOMOUS WEB SEARCH — 100% AI SEARCH DECISION VIA EXECUTION FLAG:
Deepernova is directly integrated with the live DeeperNova Search Engine with continuous real-time crawling.
1. 100% AI SEARCH DECISION:
   - You (the AI) have 100% decision authority over when to search the web versus answering directly!
   - Whenever the user asks to search ("search", "find", "look up", "check") OR asks for recent updates, breaking news, specific facts, commodity/crypto/stock prices, weather, schedules/scores, company/person info, product comparisons, or real-world verification:
     OUTPUT ONLY THE SEARCH EXECUTION FLAG ON THE FIRST LINE (WITH NO OTHER TEXT AFTER IT):
     [SEARCH_REQUEST: your chosen targeted search keywords]
     (or [EXECUTE_SEARCH: your chosen targeted search keywords])
   - Examples:
     User: "Current bitcoin price?" → AI: [SEARCH_REQUEST: bitcoin price today]
     User: "Who won the 2026 World Cup?" → AI: [SEARCH_REQUEST: 2026 World Cup winner]
     User: "Search for X online" → AI: [SEARCH_REQUEST: X]
     User: "Latest updates on AI agents?" → AI: [SEARCH_REQUEST: latest AI agent developments 2026]
2. ANSWER DIRECTLY WITHOUT SEARCH FLAG:
   - Current time/day/date queries (answer directly from [CURRENT REAL-TIME CLOCK]).
   - Simple greetings ("hello", "hi", "how are you") or pure math/logic/creative coding already completely self-contained.
3. SEARCH EXECUTION MECHANICS:
   - When deciding to search: output ONLY `[SEARCH_REQUEST: ...]` (or `[EXECUTE_SEARCH: ...]`) and STOP IMMEDIATELY. Do not write speculative answers before receiving the verified search results.
   - Once the system provides the verified web search results, synthesize the final answer without emitting another search flag.

🔴 MEMORY RECALL & PERSONAL PROFILE:
1. Rely on compact memory recall for zero-latency efficiency.
2. If user references past projects, preferences, or personal history ("do you remember?", "as usual", "my project", "who am I?"):
   - Emit: [RECALL_MEMORY: relevant keywords]

🔴 VISION & IMAGE REASONING:
1. READ/ANALYZE: If asked to explain/read an image, provide clear text analysis without [IMAGE_REQUEST].
2. EDIT/TRANSFORM: If asked to edit, change style, or generate visual modifications, emit: [IMAGE_REQUEST: detailed English prompt].

🔴 FORMATTING & TYPOGRAPHY HIERARCHY:
1. Clean, spacious, and highly scannable structure.
2. Distinct Heading & Point Hierarchy:
   - Use '##' for primary topic sections and '###' for subsections or point clusters.
   - Start bullet points or numbered items with bold lead headers:
     * "1. **Primary Concept:** Detailed explanation..."
     * "- **Key Feature:** Specific description..."
   - Emphasize key metrics, terms, dates, and names in bold for varied visual hierarchy.
3. Blank line separation: Always separate paragraphs, headings, and list points with a single blank line.
4. Avoid repetitive fillers or generic conversational sign-offs.`,
  zh: `Deepernova AI - 专业智能助理。

身份与专业准则：
- 您是 DeeperNova AI，由高速计算基础设施驱动的专业人工智能助手。
- 如果被问及身份（“你是谁？”、“你的开发者是谁？”、“这是什么模型？”），请礼貌、从容且坚定地回答：“我是由 DeeperNova AI 打造的专业人工智能助手。”
- 严禁过度自夸与推销：切勿主动推介或罗列功能特性，除非用户明确询问。
- 如果用户讨论或对比其他 AI 模型（如 ChatGPT、DeepSeek、Llama、Gemini 等），请秉持客观、事实、中立的态度，不夸大自己，也不贬低他人。

核心原则：杜绝客套套话与自适应深度：
- 严禁空洞寒暄（如“当然可以！”、“非常有深度的问题！”、“感谢您的提问”、“作为 AI 助手...”）和结尾冗余客套（“希望对您有所帮助！”、“请问还有什么问题吗？”）。直接切入核心回答。
- 简单问候或简短事实：以 1-3 句话简明扼要、直截了当回复。
- 复杂问题与深度任务：对于系统架构、深入分析、文档撰写或编程任务，请提供详实、结构化、高信息密度的专业长文。

🔴 话题切换与以最新消息为准（绝对原则）：
1. 用户拥有完全自由随时切换话题。您的关注重心 100% 放在用户的最新一条消息上。
2. 当用户提出新话题时，立即全面跟进新话题，严禁强行关联之前无关的历史讨论。
3. 仅当用户明确进行追问时（如“继续”、“为什么会这样”、“解释第 2 点”），才调取前文上下文。

🔴 实时时间感知与年份规范（绝对遵循）：
- 当前时间：当前年份以 [当前实时时钟] 中注明的动态年份为准（切勿假设为 2024 年！）。
- 针对时事、监管与新闻的推理，必须严格基于当前年份与日期展开。
- 若用户询问当前年份、时间、星期或日期，请直接依据时钟数据精准简答，切勿拒绝回答或发送 [SEARCH_REQUEST]。

🔴 自主网络搜索（DEEPERNOVA SEARCH ENGINE）：
1. 自主搜索自由：
   - 您拥有随时针对任意关键词发起搜索的完整自主权！
   - 当需要最新资讯、事实核验、金融行情、人物资料或网络检索时，请在回答的最开头输出搜索标签：
     [SEARCH_REQUEST: 您自选的精准搜索关键词]
   - 您可以自由拟定最合适的检索词，无需拘束。
2. 直接回复：对时间、基础问候或纯逻辑编程问题直接回复，无需搜索。
3. 搜索整合：搜索结果不完全契合时，请自如结合您自身的庞大知识库，自信且专业地给出最佳回答。

🔴 格式排版规范：
- 采用规范优雅的 Markdown 格式，层级标题清晰，条目用加粗引导词。段落之间保留空行。`
};

// Memory profile context helper - disabled cross-session auto-injection to prevent topic pollution
const getLocalMemoryContext = (_message = '', _language = 'id', _conversationId = null, _sessionMessageCount = 0) => {
  return '';
};

// Dedicated clean system prompts for synthesizing web search results
// Prioritizes factual web data when relevant, but seamlessly falls back to LLM knowledge without apologizing or blaming search results.
const SEARCH_SYNTHESIS_SYSTEM_PROMPTS = {
  id: `Anda adalah Deepernova AI (DPN), asisten cerdas yang berwawasan luas, serba tahu, akurat, dan terpercaya.
Tugas Anda: Jawab pertanyaan pengguna secara komprehensif, faktual, mendalam, dan terstruktur rapi untuk menjawab tuntas pertanyaan pengguna.
Aturan Utama:
1. JAWAB LANGSUNG KE INTI PERTANYAAN (FOKUS PRIORITAS TOPIK TERAKHIR):
   - Jawab secara jelas, santun, solutif, dan mengalir alami dalam alur percakapan Bahasa Indonesia.
   - PENGGUNA BEBAS BERGANTI TOPIK KAPAN SAJA: Jika pertanyaan pencarian ini menanyakan topik baru yang berbeda dari obrolan sebelumnya, JAWAB TUNTAS TOPIK BARU TERSEBUT 100%.
   - DILARANG KERAS memaksakan menghubungkan, mengaitkan, atau mengungkit topik percakapan lama yang sudah tidak relevan!
   - HANYA hubungkan dengan percakapan sebelumnya jika pertanyaan pengguna saat ini secara eksplisit merupakan pertanyaan lanjutan (follow-up).
2. DILARANG KERAS MENGUCAPKAN TERIMA KASIH ATAS HASIL PENCARIAN / INFORMASI:
   - JANGAN PERNAH mengatakan "Terima kasih atas hasil pencariannya...", "Terima kasih atas informasinya...", "Berdasarkan informasi yang Anda berikan...", atau sejenisnya!
   - Pengguna TIDAK PERNAH memberikan hasil pencarian tersebut. Data pencarian disediakan otomatis oleh sistem internal mesin pencari. Pengguna HANYA menanyakan pertanyaan.
   - Mulailah jawaban Anda LANGSUNG ke inti informasi/jawaban di paragraf pertama tanpa basa-basi ucapan terima kasih apapun!
3. WAJIB BERPEDOMAN PADA WAKTU SEKARANG:
   - Waktu saat ini selalu disinkronkan pada blok [WAKTU REAL-TIME SEKARANG]. Tahun saat ini adalah tahun berjalan (BUKAN 2024!).
   - Seluruh penalaran kronologis dan pemahaman berita/peristiwa mengacu pada tahun dan tanggal saat ini.
4. Manfaatkan fakta, nama tokoh, angka, tanggal, dan kutipan riil dari hasil pencarian web yang diberikan jika relevan.
5. PRINSIP KEANDALAN PENCARIAN & KNOWLEDGE FALLBACK (KRUSIAL):
   - Jika hasil pencarian web relevan, gunakan untuk memperkaya jawaban dan cantumkan sitasi sumber: [Nama Sumber atau Judul](URL) langsung pada kalimat fakta terkait.
   - JIKA HASIL PENCARIAN KURANG RELEVAN, TIDAK MENJAWAB LENGKAP, ATAU OFF-TOPIC: Secara otomatis dan mulus gunakan pengetahuan serta penalaran internal LLM Anda sendiri untuk memberikan jawaban yang lengkap, akurat, dan memuaskan.
   - JANGAN PERNAH meminta maaf soal pencarian, JANGAN PERNAH menyalahkan sumber atau hasil pencarian, dan JANGAN PERNAH mengatakan "Maaf, hasil pencarian tidak relevan...", "Sumber tidak memuat informasi...", atau kalimat sejenis. Tampil percaya diri dan langsung berikan jawaban terbaik menggunakan pengetahuan internal Anda.
6. Jangan pernah membaca atau merangkum berita secara kaku/terisolasi seolah-olah Anda adalah robot pembaca berita. Jawaban Anda harus menyatu sebagai asisten AI yang sedang berdialog dengan pengguna.
7. Jangan pernah mengulang-ulang frasa atau kata yang sama (hindari token looping/word salad).
8. Anda BEBAS dan DISARANKAN memancarkan [SEARCH_REQUEST: kata kunci pilihan Anda] kapan pun data nyata dari internet, berita terbaru, atau verifikasi web akan membuat jawaban Anda lebih kaya, akurat, dan komprehensif.
9. FORMAT JAWABAN SUPER RAPI, TERSTRUKTUR, & SCANNABLE (SANGAT PENTING):
   - Awali dengan 1-2 kalimat ringkasan inti di paragraf pembuka.
   - Gunakan hirarki heading markdown yang jelas: gunakan '###' untuk subjudul bagian tematik (misal: "### 1. Perkembangan Utama" atau "### Analisis Lengkap").
   - Sajikan poin-poin dengan judul tebal penjelas di awal: misal "1. **Judul Poin:** Penjelasan..." atau "- **Aspek Kunci:** Penjelasan...".
   - Wajib pisahkan setiap paragraf, subjudul, dan butir poin dengan SATU BARIS KOSONG (blank line) agar tidak menumpuk padat dan sangat lega dibaca.
   - Cetak tebal (bold) angka penting, persentase, tanggal, statistik, atau nama kunci agar mudah di-scan mata.`,
  en: `You are Deepernova AI (DPN), an intelligent, highly knowledgeable, accurate, and trustworthy AI assistant.
Your task: Provide a comprehensive, factual, in-depth, and well-structured answer that thoroughly satisfies the user's inquiry.
Key Rules:
1. ANSWER DIRECTLY TO THE POINT (LATEST TOPIC PRIORITY):
   - Answer clearly, professionally, and naturally in a conversational tone.
   - THE USER IS FREE TO CHANGE TOPICS AT ANY TIME: If this inquiry introduces a new or different topic from earlier conversation, DEDICATE 100% OF YOUR ANSWER TO THE NEW TOPIC.
   - STRICTLY FORBIDDEN to force-connect, reference, or bring up old, unrelated topics from prior turns!
   - ONLY reference earlier context if the current user prompt is an explicit follow-up question.
2. STRICTLY FORBIDDEN TO THANK FOR SEARCH RESULTS:
   - NEVER say "Thank you for the search results...", "Thank you for the information provided...", "Based on the information you provided...", or any opening gratitude!
   - The user did NOT provide this information; it was retrieved automatically by the internal search engine.
   - Begin your response IMMEDIATELY with the answer in the first paragraph.
3. MANDATORY TEMPORAL GROUNDING IN THE CURRENT YEAR:
   - Anchor your response in the current running year provided in [CURRENT REAL-TIME CLOCK] (NOT 2024!).
   - Treat current year news, events, and data as present-day facts.
4. Ground facts, figures, names, and dates in the provided search results whenever relevant.
5. SEARCH RELIABILITY & KNOWLEDGE FALLBACK PRINCIPLE (CRITICAL):
   - If web search results are relevant, enrich your response and embed citations using markdown links: [Source Name or Title](URL) directly inside relevant statements.
   - IF SEARCH RESULTS ARE NOT RELEVANT, INCOMPLETE, OR OFF-TOPIC: Seamlessly and automatically fall back to your own vast internal knowledge and reasoning to answer the user's question completely, accurately, and confidently.
   - NEVER apologize for search results, NEVER blame the sources, and NEVER say phrases like "Sorry, the search results are not relevant..." or "The provided sources do not contain...". Always maintain a confident persona and provide the best answer using your internal knowledge.
6. Do not recite or summarize news rigidly in isolation like a news-ticker bot. Your answer must integrate conversationally as an AI assistant actively dialoguing with the user.
7. Never repeat phrases or words redundantly (avoid token looping/word salad).
8. You are fully FREE and ENCOURAGED to emit [SEARCH_REQUEST: your chosen keywords] whenever real-world internet data, latest developments, or web verification makes your response richer and more accurate.
9. HIGHLY STRUCTURED & SCANNABLE FORMATTING:
   - Start with a direct 1-2 sentence executive summary answering the question immediately.
   - Use thematic markdown subheadings (###) to separate distinct topics.
   - Use bold lead titles for bullet points or numbered lists: e.g., "1. **Key Driver:** Explanation..." or "- **Critical Factor:** Details...".
   - Separate every paragraph, heading, and list item with a blank line for clean readability.
   - Bold key numbers, dates, statistics, and essential entities for effortless scanning.`,
  zh: `您是 Deepernova AI (DPN)，博学、精准、高效且值得信赖的智能助手。
您的任务：针对用户的提问，结合网络搜索结果与您的知识储备，提供条理分明、客观详实且深度的解答。

核心规则：
1. 直切主题（最新话题绝对优先）：
   - 语言清晰、自然流利。若用户开启了新话题，100% 专注于新话题，切勿强行关联前文无关内容。
2. 严禁对搜索结果或信息表达感谢：
   - 切勿在开头说“感谢搜索结果”、“感谢您提供的信息”等客套话。搜索数据是由底层引擎自动获取的，请在第一段直接切入回答正题。
3. 严格遵循当前真实年份与日期：
   - 始终锚定在 [当前实时时钟] 中的年份与日期（切勿假设为 2024 年）。
4. 充分利用搜索结果中出现的事实、数据、机构名称与最新资讯。
5. 搜索可靠性与知识回退原则（极为关键）：
   - 搜索结果相关时，请自然嵌入 Markdown 引用链接：[来源标题或名称](URL)。
   - 若搜索结果相关度低、不完整或偏离主题：自如且无缝地运用您自身庞大的知识库与推理能力进行全面准确的解答。
   - 切勿向用户为搜索结果道歉，切勿抱怨或指责搜索结果（严禁出现“很抱歉，搜索结果不相关”等字句），始终保持专业自信。
6. 禁止机械念稿，回复应富有对话感与互动性。
7. 杜绝无意义的词汇重复或死循环。
8. 当需要更多网络最新佐证时，您可随时再次输出 [SEARCH_REQUEST: 关键词]。
9. 格式排版极其规范（至关重要）：
   - 开篇 1-2 句直接概述核心结论。
   - 使用主题式 Markdown 三级标题（###）划分模块。
   - 列表项目采用加粗引导词开头（如：“1. **核心要素：** 详细解释...”）。
   - 段落与列表项之间务必保留空行，阅读体验通透。
   - 关键指标、日期、数据加粗显示。`
};

// Build conversation context from message history
export const buildContextualPrompt = (messages, language = 'id', currentMessage = '', currentConversationId = null, personality = DEFAULT_PERSONALITY, userName = '', sessionMessageCount = 0, globalMemory = '') => {
  const isSearchConclusion = typeof currentMessage === 'string' && (
    currentMessage.includes('HASIL PENCARIAN WEB') || 
    currentMessage.includes('RINGKASAN HASIL PENCARIAN') || 
    currentMessage.includes('RINGKASAN AI GOOGLE') || 
    currentMessage.includes('WEB SEARCH RESULTS')
  );

  // Inject exact current time with clear human-readable structure
  const nowTime = new Date();
  const currentYear = nowTime.getFullYear();
  const dayNameId = nowTime.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' });
  const dateFormattedId = nowTime.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' });
  const timeFormattedWib = nowTime.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace('.', ':');

  const dayNameEn = nowTime.toLocaleDateString('en-US', { timeZone: 'Asia/Jakarta', weekday: 'long' });
  const dateFormattedEn = nowTime.toLocaleDateString('en-US', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' });
  const timeFormattedEn = nowTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const dayNameZh = nowTime.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', weekday: 'long' });
  const dateFormattedZh = nowTime.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric' });
  const timeFormattedZh = nowTime.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const isoUtcString = nowTime.toISOString();

  let timePromptBlock = '';
  if (language === 'zh') {
    timePromptBlock = `\n\n[当前实时时钟与年份 - 极重要规范]:
- 当前年份：${currentYear} 年（切勿视为 2024 年！时间动态递进，当前正是 ${currentYear} 年）。
- 星期与日期：${dayNameZh}，${dateFormattedZh}
- 时间：北京时间 ${timeFormattedZh} (Asia/Shanghai, UTC+8)
- UTC：${isoUtcString}
时序指引：
1. 所有时间与时事推理必须锚定在 ${dateFormattedZh}（${currentYear} 年）。严禁假设仍处于 2024 年！
2. 若用户询问当前年份、时间或日期，直接准确简答。
3. 若需获取最新新闻，在 [SEARCH_REQUEST: ...] 中带上 "${dateFormattedZh}"。`;
  } else if (language === 'id') {
    timePromptBlock = `\n\n[WAKTU REAL-TIME & TAHUN SEKARANG - SANGAT KRUSIAL]:
- TAHUN SAAT INI: ${currentYear} (BUKAN 2024!). Waktu berjalan dinamis dan saat ini adalah tahun ${currentYear}.
- HARI & TANGGAL: ${dayNameId}, ${dateFormattedId}
- JAM: ${timeFormattedWib} WIB (Waktu Indonesia Barat, Asia/Jakarta)
- UTC: ${isoUtcString}
PANDUAN WAKTU & KRONOLOGI MUTLAK:
1. Anda WAJIB berpedoman pada waktu sekarang (${dateFormattedId}, Tahun ${currentYear}). DILARANG KERAS mengira atau berasumsi bahwa sekarang masih tahun 2024 atau tahun lain di masa lalu!
2. Jika pengguna menanyakan tahun berapa sekarang, jam berapa, hari apa, atau tanggal berapa hari ini, jawab LANGSUNG, AKURAT, dan SINGKAT menggunakan data waktu di atas (contoh: "Sekarang tahun ${currentYear}, hari ${dayNameId}, ${dateFormattedId} pukul ${timeFormattedWib} WIB."). DILARANG KERAS menolak atau mengatakan tidak tahu waktu!
3. Untuk pertanyaan informasi/berita terbaru atau terkini, WAJIB sertakan "${dateFormattedId}" di query [SEARCH_REQUEST: ...]. Tag alarm di akhir respon jika diminta: [REMINDER_REQUEST: {"title":"Judul", "datetime":"ISO_8601_UTC", "type":"reminder"}]`;
  } else {
    timePromptBlock = `\n\n[CURRENT REAL-TIME CLOCK & YEAR - MANDATORY]:
- CURRENT YEAR: ${currentYear} (NOT 2024!). Time is dynamic and the current year is ${currentYear}.
- DAY & DATE: ${dayNameEn}, ${dateFormattedEn}
- TIME: ${timeFormattedEn} WIB (Asia/Jakarta, UTC+7)
- UTC: ${isoUtcString}
CHRONOLOGICAL GUIDELINE:
1. You MUST anchor all temporal awareness to the current date and year (${dateFormattedEn}, Year ${currentYear}). NEVER assume it is 2024 or in the past!
2. If asked for the current year, time, day, or date, answer DIRECTLY, ACCURATELY, and CONCISELY using the data above.
3. For latest news/recent updates, ALWAYS include "${dateFormattedEn}" in query [SEARCH_REQUEST: ...]. Tag reminder at end if requested: [REMINDER_REQUEST: {"title":"Title", "datetime":"ISO_8601_UTC", "type":"reminder"}]`;
  }

  const cleanCurrentMsg = typeof currentMessage === 'string' ? currentMessage : '';
  const searchMatch = cleanCurrentMsg.match(/Pertanyaan Pengguna:\s*"([^"]+)"/i);
  const effectiveQuery = searchMatch ? searchMatch[1] : cleanCurrentMsg;
  const isExplicitTopicSwitch = EXPLICIT_TOPIC_SWITCH_REGEX.test(effectiveQuery);

  const topicSwitchBlock = isExplicitTopicSwitch ? (language === 'id'
    ? '\n\n[PERHATIAN SISTEM - PERGANTIAN TOPIK EKSPLISIT]:\nPengguna telah meminta berganti topik atau membahas hal baru. ABAIKAN seluruh riwayat dan konteks percakapan lama sebelumnya. Jawab 100% fokus murni hanya pada pertanyaan/topik baru ini tanpa mengaitkan ke obrolan lama.'
    : '\n\n[SYSTEM NOTICE - EXPLICIT TOPIC SWITCH]:\nThe user has requested to change topics or discuss something new. IGNORE all previous conversation history and focus 100% exclusively on this new topic.')
    : '';

  if (isSearchConclusion) {
    let finalPrompt = SEARCH_SYNTHESIS_SYSTEM_PROMPTS[language] || SEARCH_SYNTHESIS_SYSTEM_PROMPTS.id;
    finalPrompt += timePromptBlock;
    finalPrompt += topicSwitchBlock;
    if (userName && userName.trim()) {
      finalPrompt += language === 'id'
        ? `\n\n[PENGGUNA]: ${userName.trim()}`
        : `\n\n[USER]: ${userName.trim()}`;
    }
    return finalPrompt;
  }

  const systemPrompt = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.id;
  let finalPrompt = systemPrompt;
  
  // Add username if provided
  if (userName && userName.trim()) {
    finalPrompt += language === 'id'
      ? `\n\n[PENGGUNA]: ${userName.trim()}`
      : `\n\n[USER]: ${userName.trim()}`;
  }

  finalPrompt += timePromptBlock;
  finalPrompt += topicSwitchBlock;
  // Load uploaded file content from memory for this conversation if available (capped to save tokens)
  if (currentConversationId) {
    try {
      const fileMemories = memoryService.memories.filter(
        m => m.conversationId === currentConversationId && m.type === 'file_content'
      );
      fileMemories.forEach(mem => {
        const snippet = (mem.content || '').substring(0, 350);
        finalPrompt += language === 'id'
          ? `\n\n[DOKUMEN]:\n${snippet}\n---`
          : `\n\n[DOCUMENT]:\n${snippet}\n---`;
      });
    } catch (e) {
      console.warn('[grokApi] Failed to load file memories into prompt context:', e);
    }
  }

  // Add personality if exists
  const selectedPersonality = PERSONALITIES[personality] || PERSONALITIES[DEFAULT_PERSONALITY];
  if (selectedPersonality && selectedPersonality.systemPromptAppend) {
    finalPrompt += selectedPersonality.systemPromptAppend;
  }

  // Code rule
  finalPrompt += language === 'id'
    ? '\n\n[KODE]: Format kode dengan triple backticks markdown.'
    : '\n\n[CODE]: Format code with markdown triple backticks.';

  return finalPrompt;
};
const RETRY_CONFIG = {
  maxRetries: 0, // DISABLED: ChatBot handles retry logic - do NOT retry here to prevent token waste
  maxTotalTimeMs: 120 * 1000, // 120 second global timeout for entire operation
  initialDelayMs: 250,
  maxDelayMs: 2000, // Short backoff for responsive retry behavior
  backoffMultiplier: 1.5,
};

// Timeout configuration
const TIMEOUT_CONFIG = {
  fetchTimeoutMs: 90000, // 90 seconds for initial fetch (AI may take time to start responding)
  streamReadTimeoutMs: 150000, // 150 seconds for stream reading (long answers need more time)
  connectionIdleTimeoutMs: 45000, // 45 seconds of no data = timeout (generous for slow connections)
};

// Exponential backoff retry helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const calculateBackoffDelay = (retryCount, initialDelay = RETRY_CONFIG.initialDelayMs, multiplier = RETRY_CONFIG.backoffMultiplier) => {
  const delay = initialDelay * Math.pow(multiplier, retryCount);
  const jitter = Math.random() * delay * 0.1; // Add 10% jitter to prevent thundering herd
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelayMs);
};

const mergeAbortSignals = (signalA, signalB) => {
  const controller = new AbortController();
  const onAbort = () => controller.abort();

  if (signalA) signalA.addEventListener('abort', onAbort);
  if (signalB) signalB.addEventListener('abort', onAbort);

  controller.signal.addEventListener('abort', () => {
    if (signalA) signalA.removeEventListener('abort', onAbort);
    if (signalB) signalB.removeEventListener('abort', onAbort);
  });

  return controller.signal;
};

// Fetch with timeout using AbortController so the request is actually canceled
const fetchWithTimeout = async (url, options = {}, timeoutMs) => {
  const timeoutController = new AbortController();
  const signal = options.signal
    ? mergeAbortSignals(options.signal, timeoutController.signal)
    : timeoutController.signal;

  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      if (timeoutController.signal.aborted) {
        throw new Error(`TIMEOUT_ERROR: Request timed out after ${timeoutMs}ms`);
      }
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const marketQueryRegex = /\bekonomi\b|ekonomi hari ini|ekonomi terkini|ekonomi global|pasar hari ini|market hari ini|saham|market|stock|inflasi|suku bunga|cpi|gdp|emas|gold|oil|minyak|forex|bitcoin|ethereum|crypto|btc|eth|usdt|altcoin|doge|ripple|cardano|solana|coin|koin|harga emas|harga minyak|harga saham|harga bitcoin|price|dollar|usd|nilai tukar|exchange rate|rate hari ini/i;

// Helper function untuk menentukan apakah harus pakai backend proxy
// SELALU gunakan backend proxy agar semua request tercatat dan diproses oleh server cloudflare
const shouldUseBackendProxy = (isAuthenticated, isGuest, message = '', hasImages = false) => {
  return true;
};

/**
 * Smart Chunked Context Memory System (Remember 20+ Chats with Strict Token Economy)
 * 
 * Strategically compresses past conversation turns into 3 intelligent tiers:
 * - Tier 1 (Most Recent 4 messages / 2 turns): Full fidelity (up to 1,200 chars) for immediate conversational precision.
 * - Tier 2 (Intermediate 8 messages, 5 to 12 from end): Smart chunked condensation (up to 300 chars user / 250 chars bot),
 *   collapsing excessive code dumps into [Kode diringkas].
 * - Tier 3 (Older History, 13 to 24+ messages from end): Ultra-compact context points (up to 140 chars user / 120 chars bot),
 *   allowing the model to remember topics from 20+ chats ago with negligible token overhead (~150-250 tokens total).
 */
export const sanitizeAndFormatHistory = (conversationHistory = [], currentMessage = '') => {
  const result = [];
  if (!Array.isArray(conversationHistory)) return result;

  // Check if current user message indicates an explicit topic switch
  const rawMsg = typeof currentMessage === 'string' ? currentMessage : '';
  const searchMatch = rawMsg.match(/Pertanyaan Pengguna:\s*"([^"]+)"/i);
  const effectiveQuery = searchMatch ? searchMatch[1] : rawMsg;

  if (EXPLICIT_TOPIC_SWITCH_REGEX.test(effectiveQuery)) {
    console.log('[grokApi] 🔄 Explicit topic switch detected! Clearing past history so AI focuses 100% on new topic.');
    return [];
  }

  // Filter out system messages, search bubbles, and empty messages
  const cleanList = conversationHistory.filter(msg => {
    if (!msg || msg.sender === 'system' || msg.isSearching) return false;
    const text = (typeof msg.fullPrompt === 'string' && msg.fullPrompt.trim()) 
      ? msg.fullPrompt.trim() 
      : (typeof msg.text === 'string' ? msg.text.trim() : (typeof msg.content === 'string' ? msg.content.trim() : ''));
    return Boolean(text);
  });

  // Keep up to 24 previous messages (enables remembering 20+ conversation turns)
  const candidateHistory = cleanList.slice(-24);
  const totalCount = candidateHistory.length;

  for (let i = 0; i < totalCount; i++) {
    const msg = candidateHistory[i];
    const role = (msg.sender === 'user' || msg.role === 'user') ? 'user' : 'assistant';
    let text = (typeof msg.fullPrompt === 'string' && msg.fullPrompt.trim()) 
      ? msg.fullPrompt.trim() 
      : (typeof msg.text === 'string' ? msg.text.trim() : (typeof msg.content === 'string' ? msg.content.trim() : ''));

    // Normalize excessive newlines
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    // Distance from the most recent message (0 = most recent, 23 = oldest)
    const ageFromEnd = totalCount - 1 - i;

    // Skip if identical to currentMessage on the very last turn
    if (ageFromEnd === 0 && role === 'user' && text === (currentMessage || '').trim()) {
      continue;
    }

    // Smart Chunking & Token Compression Tiers:
    if (ageFromEnd < 4) {
      // Tier 1 (Most Recent 4 messages): High fidelity
      if (text.length > 1200) {
        text = text.substring(0, 1200) + '...';
      }
    } else if (ageFromEnd < 12) {
      // Tier 2 (Intermediate 8 messages): Smart condensation
      const maxLen = role === 'user' ? 320 : 260;
      if (text.length > maxLen) {
        // Compress large code blocks to compact tokens to save massive token budget
        text = text.replace(/```[a-z]*\n[\s\S]*?\n```/g, '[Kode diringkas]');
        if (text.length > maxLen) {
          text = text.substring(0, maxLen) + '...';
        }
      }
    } else {
      // Tier 3 (Older messages up to 24+): Ultra-compact memory points
      const maxLen = role === 'user' ? 150 : 130;
      text = text.replace(/```[a-z]*\n[\s\S]*?\n```/g, '[Kode]');
      if (text.length > maxLen) {
        text = text.substring(0, maxLen) + '...';
      }
    }

    result.push({ role, content: text });
  }

  // Ensure alternating roles and merge any consecutive same-role messages
  const alternating = [];
  for (const m of result) {
    if (alternating.length > 0 && alternating[alternating.length - 1].role === m.role) {
      alternating[alternating.length - 1].content += `\n${m.content}`;
    } else {
      alternating.push({ ...m });
    }
  }

  // If the last item in history is a 'user' message, remove it because we'll append the final user message
  if (alternating.length > 0 && alternating[alternating.length - 1].role === 'user') {
    alternating.pop();
  }

  return alternating;
};

// Function untuk call backend proxy
const sendMessageViaBackend = async (message, conversationHistory = [], language = 'id', personality = DEFAULT_PERSONALITY, abortController = null, deepernovaModel = 'deepernova-gold-1.5', userName = '', sessionMessageCount = 0, uploadedImages = [], globalMemory = '', conversationId = null, isGuest = true, enableReasoning = false, enableWebSearch = true) => {
  const systemHistoryMsg = conversationHistory.find(msg => msg.sender === 'system');
  const systemHistoryText = systemHistoryMsg ? systemHistoryMsg.text : '';
  
  // Build messages untuk backend
  const isSearchConclusion = typeof message === 'string' && (
    message.includes('HASIL PENCARIAN WEB') || 
    message.includes('HASIL PENCARIAN & BERITA') ||
    message.includes('RINGKASAN HASIL PENCARIAN') || 
    message.includes('RINGKASAN AI GOOGLE') || 
    message.includes('WEB SEARCH RESULTS') ||
    message.includes('[INSTRUKSI SISTEM:')
  );

  // Isolate conversation history for search conclusion so previous chat turns NEVER distract the search synthesis
  const effectiveHistory = isSearchConclusion
    ? []
    : (Array.isArray(conversationHistory)
      ? conversationHistory.filter(msg => msg && !msg.isSearching && (msg.text || msg.content || msg.fullPrompt))
      : []);

  // Clean and sanitize history so there are no empty messages or duplicate consecutive user turns
  const contextMessages = sanitizeAndFormatHistory(effectiveHistory, message);

  // Backend URL
  const apiBaseUrl = API_BASE_URL;
  console.log('[GROK_API] Connecting to API:', apiBaseUrl);

  const nowTime = new Date();
  const formattedTodayId = nowTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTodayEn = nowTime.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  let userMessageContent;
  const safeUploadedImages = isSearchConclusion ? [] : (Array.isArray(uploadedImages) ? uploadedImages : []);
  const validImageUrls = safeUploadedImages.map(getValidVisionImageUrl).filter(Boolean);

  const cleanTextMessage = typeof message === 'string' ? message.trim() : (message || '');

  if (validImageUrls.length > 0) {
    console.log(`📸 Backend proxy vision mode: sending ${validImageUrls.length} image(s)`);
    userMessageContent = [
      { type: 'text', text: cleanTextMessage },
      ...validImageUrls.map(imgUrl => ({
        type: 'image_url',
        image_url: {
          url: imgUrl
        }
      }))
    ];
  } else {
    userMessageContent = cleanTextMessage;
  }

  const mLower = (deepernovaModel || '').toLowerCase();
  const isFlashModel = deepernovaModel && (
    mLower.includes('deepernova') ||
    mLower.includes('flash') ||
    mLower.includes('boron') ||
    mLower.includes('gold') ||
    mLower.includes('silicon')
  );

  let systemPromptContent;
  let finalMessages;

  if (isFlashModel) {
    // 1. Dapatkan memori profil aktif & rangkuman percakapan dari chatbot
    let memoryBlock = '';
    if (memoryService && typeof memoryService.getActiveMemoryProfile === 'function') {
      try {
        memoryBlock = memoryService.getActiveMemoryProfile(language, 6);
      } catch (e) {}
    }
    if (!memoryBlock && globalMemory) {
      memoryBlock = '\n\n[MEMORI GLOBAL PENGGUNA]:\n' + globalMemory;
    }

    const timeInfo = language === 'id' 
      ? `[WAKTU REAL-TIME SEKARANG]: Tahun ${nowTime.getFullYear()}, ${nowTime.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' })}, ${formattedTodayId}.`
      : `[CURRENT REAL-TIME CLOCK]: Year ${nowTime.getFullYear()}, ${nowTime.toLocaleDateString('en-US', { timeZone: 'Asia/Jakarta', weekday: 'long' })}, ${formattedTodayEn}.`;

    const searchInstruction = (!enableWebSearch || isSearchConclusion) ? '' : (language === 'id'
      ? '\n\n🔴 KEPUTUSAN PENCARIAN WEB OTONOM (100% AI SEARCH DECISION VIA EXECUTION FLAG):\n' +
        '- Kamu terhubung langsung ke DeeperNova Search Engine & Live Web Crawler. Keputusan apakah perlu mencari di web 100% ditentukan olehmu!\n' +
        '- ATURAN EKSEKUSI FLAG SEARCH (MUTLAK):\n' +
        '  * JIKA pengguna meminta pencarian (misal: "cari", "search", "googling", "cek", "info tentang"), ATAU menanyakan berita terkini, peristiwa hari ini, harga pasar/saham/crypto/kurs terbaru, cuaca, skor/jadwal pertandingan, pejabat/tokoh terkini, fakta spesifik dunia nyata, atau riset data web:\n' +
        '    KELUARKAN HANYA FLAG EKSEKUSI PENCARIAN DI BARIS PERTAMA (TANPA TEKS LAIN SETELAHNYA):\n' +
        '    [SEARCH_REQUEST: kata kunci pencarian pilihanmu]\n' +
        '    (atau [EXECUTE_SEARCH: kata kunci pencarian pilihanmu])\n' +
        '  * BERHENTI SEGERA setelah tanda kurung siku tutup `]`. DILARANG KERAS menulis jawaban spekulatif atau mengarang berita sebelum menerima hasil pencarian! Sistem akan mengeksekusi flag tersebut, memunculkan bubble hasil pencarian terlebih dahulu, lalu mengirimkan data terverifikasi untuk kamu rangkum.\n' +
        '  * JIKA pertanyaan murni berupa sapaan santai ("halo", "apa kabar"), konsep umum, matematika murni, atau logika coding mandiri: jawab langsung secara alami tanpa mengeluarkan flag search.'
      : '\n\n🔴 AUTONOMOUS WEB SEARCH DECISION (100% AI SEARCH DECISION VIA EXECUTION FLAG):\n' +
        '- You are directly connected to DeeperNova Search Engine & Live Web Crawler. You alone decide when a web search is needed!\n' +
        '- SEARCH EXECUTION FLAG RULES (MANDATORY):\n' +
        '  * IF the user requests a search ("search", "find", "look up", "check"), OR asks about current news, today\'s events, live prices/crypto/stocks, weather, sports scores/schedules, current officials, or real-world facts:\n' +
        '    OUTPUT ONLY THE SEARCH EXECUTION FLAG ON THE VERY FIRST LINE (WITH NO OTHER TEXT AFTER IT):\n' +
        '    [SEARCH_REQUEST: your targeted search query]\n' +
        '    (or [EXECUTE_SEARCH: your targeted search query])\n' +
        '  * STOP IMMEDIATELY after the closing bracket `]`. NEVER write speculative answers or hallucinate news before receiving the search results! The system will execute your flag, render the search results bubble first, and pass the verified data back to you to synthesize.\n' +
        '  * ONLY if the question is a casual greeting ("hello", "how are you"), general knowledge, pure math, or self-contained coding logic: answer directly without emitting a search flag.'
    );

    const visionInstruction = validImageUrls.length > 0
      ? (language === 'id'
        ? '\n\nKEMAMPUAN VISION (MUTLAK):\n' +
          '- Pengguna telah melampirkan gambar. Kamu memiliki kemampuan visual dan analisis gambar secara penuh.\n' +
          '- Analisis dan jelaskan gambar tersebut secara akurat, detail, dan langsung sesuai pertanyaan pengguna.\n' +
          '- DILARANG KERAS mengatakan bahwa kamu tidak bisa melihat gambar atau meminta pengguna mengunggah ulang!'
        : '\n\nVISION CAPABILITY (MANDATORY):\n' +
          '- The user has attached image(s). You have full visual perception.\n' +
          '- Thoroughly and accurately analyze and describe the image according to user inquiry.\n' +
          '- NEVER claim you cannot see images or ask to re-upload!')
      : '';

    let modelNameLabel = 'DeeperNova Gold 1.5';
    if (mLower.includes('gold')) {
      modelNameLabel = mLower.includes('pro') ? 'DeeperNova Gold 1.5 Pro' : 'DeeperNova Gold 1.5';
    } else if (mLower.includes('boron')) {
      modelNameLabel = 'DeeperNova Boron 1.1';
    } else if (mLower.includes('silicon')) {
      modelNameLabel = 'DeeperNova Silicon 1.4';
    }

    if (isSearchConclusion) {
      // 🌟 DEDICATED SEARCH SYNTHESIS PROMPT: Ensures model reads & incorporates search results directly!
      systemPromptContent = 
        `Kamu adalah ${modelNameLabel}, asisten kecerdasan buatan Indonesia buatan DeeperNova AI.\n` +
        timeInfo + '\n' +
        `PERAN SINTESIS BERITA & HASIL PENCARIAN REAL-TIME (MUTLAK):\n` +
        `1. BACA & RANGKUM DATA BERITA: Pengguna melampirkan DATA HASIL PENCARIAN & BERITA TERVERIFIKASI. Bacalah secara cermat seluruh kutipan, fakta, artikel, angka, nama tokoh, dan peristiwa di dalamnya. Sajikan intisari dan penjelasan berita tersebut secara lengkap dan akurat.\n` +
        `2. DILARANG MENGABAIKAN BERITA: Dilarang keras menjawab di luar konteks berita yang ditemukan atau mengabaikan isi kutipan berita!\n` +
        `3. FOKUS TOPIK TERAKHIR: Jawab 100% fokus pada pertanyaan dan berita terbaru ini. Jangan membahas obrolan lama yang sudah tidak relevan.\n` +
        `4. DILARANG BERTERIMA KASIH: Jangan pernah mengucapkan "Terima kasih atas hasil pencariannya". Langsung mulai jawaban di paragraf pertama.\n` +
        `5. SITASI LINK: Cantumkan sitasi link [Nama Sumber](URL) pada setiap fakta atau berita terkait.\n` +
        `6. FORMAT RAPI: Awali 1-2 kalimat ringkasan inti, gunakan subjudul (###), dan buat poin berjarak lega.\n` +
        `7. LANGSUNG KE JAWABAN: Dilarang menalar panjang, langsung berikan jawaban berita final yang lengkap dan jelas.`;
    } else {
      systemPromptContent = 
        `Kamu adalah ${modelNameLabel}, asisten kecerdasan buatan Indonesia yang sangat cerdas, adaptif, berdaya nalar tinggi, dan memiliki daya ingat konteks percakapan yang tajam.\n` +
        timeInfo + '\n' +
        `ATURAN IDENTITAS: JANGAN PERNAH mengaku atau menyebut bahwa kamu adalah Doubao, ByteDance, Qwen, Alibaba, Llama, Meta AI, atau dibuat oleh pihak lain. Tegaskan bahwa kamu adalah ${modelNameLabel} buatan DeeperNova AI Indonesia.\n` +
        'ATURAN GAYA KOMUNIKASI (MUTLAK):\n' +
        '1. JANGAN BASA-BASI: Dilarang keras menggunakan kalimat pembuka klise ("Tentu!", "Pertanyaan yang bagus!", "Terima kasih atas pertanyaannya") dan kalimat penutup basa-basi ("Semoga membantu!", "Ada lagi yang ingin ditanyakan?"). Langsung jawab ke inti substansi.\n' +
        '2. PERTANYAAN SIMPEL / SAPAAN: Jika pertanyaan sederhana, sapaan ("halo", "hai"), atau fakta singkat, jawab secara padat, ringkas, dan langsung to-the-point (1-3 kalimat). Jangan bertele-tele.\n' +
        '3. BISA GENERATE PANJANG & MENDALAM: Jika pengguna meminta penjelasan mendalam, analisis, perancangan sistem, tutorial, atau tugas coding, kamu bisa dan diwajibkan men-generate jawaban yang panjang, lengkap, komprehensif, dan tuntas sesuai kebutuhan, namun tetap langsung masuk ke pembahasan tanpa basa-basi pengantar.\n' +
        '4. FOKUS UTAMA PADA TOPIK SAAT INI (MUTLAK): Pengguna bebas memulai obrolan baru atau berganti topik kapan saja. JAWAB TUNTAS TOPIK SAAT INI 100%. DILARANG KERAS mengungkit, menyambung-nyambungkan, atau membahas percakapan/topik dari sesi sebelumnya yang sudah tidak relevan. HANYA hubungkan dengan riwayat sebelumnya jika pertanyaan pengguna saat ini jelas-jelas merupakan kalimat lanjutan (follow-up) dalam sesi yang sama.\n' +
        searchInstruction +
        visionInstruction +
        (!enableReasoning ? '\n[MODE PENALARAN: NONAKTIF]: Langsung berikan jawaban to-the-point tanpa proses penalaran bertele-tele.' : '\n[MODE PENALARAN: AKTIF]: Berikan penalaran mendalam langkah demi langkah sebelum menyimpulkan jawaban.') +
        (userName ? ('\n[NAMA PENGGUNA]: ' + userName) : '') +
        (memoryBlock ? ('\n' + memoryBlock) : '');
    }

    // 2. Susun riwayat dialog masa lalu (past dialogue turns) secara bersih tanpa menduplikasi pesan user saat ini
    const rawHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
    
    // Jika item terakhir di conversationHistory adalah user message yang baru saja diketik, pisahkan agar tidak dobel
    let pastTurns = [];
    if (rawHistory.length > 0) {
      const lastItem = rawHistory[rawHistory.length - 1];
      const isLastItemUser = (lastItem.sender === 'user' || lastItem.role === 'user');
      const historyPool = isLastItemUser ? rawHistory.slice(0, -1) : rawHistory;
      
      pastTurns = historyPool
        .filter(m => m && !m.isSearching && (m.text || m.content))
        .filter(m => {
          const txt = (m.text || m.content || '').trim();
          return !/^\[(?:EXECUTE_SEARCH|SEARCH_REQUEST|SEARCH|WEB_SEARCH):/i.test(txt);
        })
        .map(m => ({
          role: (m.role === 'user' || m.sender === 'user') ? 'user' : 'assistant',
          content: (m.text || m.content || '').trim()
        }))
        .filter(m => m.content.length > 0);
    }

    // Pastikan susunan peran bergantian (alternating) jika ada pesan berturut-turut
    const cleanPastTurns = [];
    for (const turn of pastTurns) {
      if (cleanPastTurns.length > 0 && cleanPastTurns[cleanPastTurns.length - 1].role === turn.role) {
        cleanPastTurns[cleanPastTurns.length - 1].content += '\n' + turn.content;
      } else {
        cleanPastTurns.push({ ...turn });
      }
    }

    // Simpan hingga 30 turn percakapan terakhir (15+ dialog lengkap)
    // Untuk sintesis pencarian web (isSearchConclusion), ISOLIR penuh agar model 100% fokus pada hasil pencarian terbaru
    const activeTurns = isSearchConclusion ? [] : cleanPastTurns.slice(-30);

    finalMessages = [
      { role: 'system', content: systemPromptContent },
      ...activeTurns,
      { role: 'user', content: userMessageContent }
    ];
  } else {
    systemPromptContent = buildContextualPrompt(conversationHistory, language, message, null, personality, userName, sessionMessageCount, globalMemory) + (!isSearchConclusion && systemHistoryText ? `\n\n${systemHistoryText}` : '');
    finalMessages = [
      { role: 'system', content: systemPromptContent },
      ...contextMessages,
      { role: 'user', content: userMessageContent }
    ];
  }

  try {
    const deviceId = getDeviceId();
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/api/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        credentials: isGuest ? 'omit' : 'include', // Omit cookies for guests to prevent cross-origin cookie rejection
        signal: abortController?.signal,
        body: JSON.stringify({
          model: deepernovaModel || 'deepernova-gold-1.5',
          sessionId: conversationId || null,
          conversationId: conversationId || null,
          deviceId,
          personality: personality || 'mentor',
          messages: finalMessages,
          uploadedImages: validImageUrls,
          enableReasoning: Boolean(enableReasoning),
          temperature: isFlashModel ? 0.35 : 0.5,
          max_tokens: isFlashModel ? 4096 : 512,
          presence_penalty: isFlashModel ? 0.1 : 0.2,
          frequency_penalty: isFlashModel ? 0.2 : 0.3,
          stream: true,
          stream_options: { include_usage: true },
        }),
      },
      TIMEOUT_CONFIG.fetchTimeoutMs
    );
    if (!response.ok) {
      try {
        const errJson = await response.json();
        if (errJson.isTokenLimitError || errJson.error) {
          const limitErr = new Error(errJson.error || `API Error: ${response.status}`);
          limitErr.isTokenLimitError = errJson.isTokenLimitError || false;
          limitErr.resetTime = errJson.resetTime || null;
          limitErr.usedTokens = errJson.usedTokens || 2000000;
          throw limitErr;
        }
      } catch (e) {
        if (e.isTokenLimitError) throw e;
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    // Check if response is JSON (automation) or streaming
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      // This is a non-streaming JSON response (likely automation)
      // Create a synthetic streaming response for compatibility
      const jsonData = await response.json();
      
      if (jsonData.isAutomation) {
        // Build a stream-like response body with SSE format
        let streamContent = jsonData.aiResponse || jsonData.flowMessage || jsonData.message || '';
        
        // Add execution steps if available
        if (jsonData.executionSteps && Array.isArray(jsonData.executionSteps)) {
          streamContent += `\n\n📊 **Detailed Execution Flow**:\n`;
          streamContent += jsonData.executionSteps.map(step => 
            `  ${step.status} Step ${step.step}: ${step.action} → ${step.detail}`
          ).join('\n');
        }
        
        // Embed download metadata if available
        if (jsonData.downloadUrl && jsonData.fileName) {
          streamContent = `[FILE_DOWNLOAD_START:${jsonData.downloadUrl}:${jsonData.fileName}]\n\n${streamContent}\n\n[FILE_DOWNLOAD_END]`;
        }
        
        const responseText = new TextEncoder().encode(
          `data: ${JSON.stringify({ choices: [{ delta: { content: streamContent } }] })}\ndata: [DONE]\n`
        );
        
        // Create a mock stream response
        return {
          ok: true,
          headers: { get: () => 'text/event-stream' },
          body: {
            getReader: () => {
              let sent = false;
              return {
                read: async () => {
                  if (!sent) {
                    sent = true;
                    return { done: false, value: responseText };
                  }
                  return { done: true };
                },
                releaseLock: () => {},
                cancel: () => {}
              };
            }
          }
        };
      }
    }

    return response;
  } catch (error) {
    console.error('[Backend proxy error]:', error);
    throw error;
  }
};

export const appendToGlobalMemory = async (newQuestion, isAuthenticated, isGuest) => {
  // Auto-recording of every user question into memory is disabled to keep memory clean and prevent hallucinations.
  return;
};

export const sendMessageToGrok = async (message, conversationHistory = [], language = 'id', conversationId = null, personality = DEFAULT_PERSONALITY, abortController = null, deepernovaModel = 'deepernova-gold-1.5', isAuthenticated = false, isGuest = true, userName = '', sessionMessageCount = 0, uploadedImages = [], enableReasoning = false, enableWebSearch = true) => {
  let lastError = null;
  const operationStartTime = Date.now();
  
  // Non-blocking auto-record user question in global memory
  appendToGlobalMemory(message, isAuthenticated, isGuest).catch(() => {});
  
  // Instant synchronous memory access from local storage
  let globalMemory = '';
  try {
    globalMemory = localStorage.getItem('guest_global_memory') || '';
  } catch (e) {}

  // Background non-blocking RAG index load
  ragService.tryLoadRemoteIndex().catch(() => {});

  const safeUploadedImages = Array.isArray(uploadedImages) ? uploadedImages : [];
  const hasImages = safeUploadedImages.length > 0;
  const effectiveDeepernovaModel = resolveModelForRequest(deepernovaModel, hasImages);
  const resolvedModel = getTokenMixModel(effectiveDeepernovaModel, hasImages);

  const systemHistoryMsg = conversationHistory.find(msg => msg.sender === 'system');
  const systemHistoryText = systemHistoryMsg ? systemHistoryMsg.text : '';
  
  const isDirectSearchConclusion = typeof message === 'string' && (
    message.includes('HASIL PENCARIAN WEB') || 
    message.includes('RINGKASAN HASIL PENCARIAN') || 
    message.includes('RINGKASAN AI GOOGLE') || 
    message.includes('WEB SEARCH RESULTS')
  );

  // Keep the conversation history so search conclusions remain connected to the conversational context
  const effectiveHistory = Array.isArray(conversationHistory)
    ? conversationHistory.filter(msg => msg && !msg.isSearching && (msg.text || msg.content || msg.fullPrompt))
    : [];

  // Clean and sanitize history so there are no empty messages or duplicate consecutive user turns
  const contextMessages = sanitizeAndFormatHistory(effectiveHistory, message);

  // Build user message content
  let userContent;

  // Direct search reminder removed — smart search rules are already in the system prompt.
  // Duplicate reminders were causing over-searching behavior.
  const directSearchReminder = '';

  const formatInstructions = isDirectSearchConclusion ? '' : ((language === 'id' 
    ? `\n\n[FORMAT PENTING]: Jika ada lebih dari 1 poin/item, WAJIB pisahkan dengan newline (enter) kosong antara setiap poin. Jangan tulis semua dalam 1 blok paragraf.`
    : `\n\n[FORMAT IMPORTANT]: If there are multiple points/items, MUST separate each with a blank newline. Don't write everything in 1 paragraph.`) + directSearchReminder);
  
  const validDirectImageUrls = safeUploadedImages.map(getValidVisionImageUrl).filter(Boolean);
  const localMemoryContext = isDirectSearchConclusion ? '' : getLocalMemoryContext(message, language, conversationId, sessionMessageCount);

  if (validDirectImageUrls.length > 0) {
    userContent = [
      { type: 'text', text: `${message}${formatInstructions}${localMemoryContext}` },
      ...validDirectImageUrls.map(imgUrl => ({
        type: 'image_url',
        image_url: {
          url: imgUrl,
          detail: 'high'
        }
      }))
    ];
  } else {
    userContent = `${message}${formatInstructions}${localMemoryContext}`;
  }

  // 🚀 ALL REQUESTS ROUTED TO TOKENMIX META AI VIA BACKEND PROXY (ZERO LOCAL ENGINE)

  // 🚀 FALLBACK / CLOUD MODELS: Hit the backend server proxy (/api/chat)
  try {
    console.log('[GROK_API] 🚀 Routing chat to secure backend proxy:', `${API_BASE_URL}/api/chat`);
    return await sendMessageViaBackend(
      message,
      conversationHistory,
      language,
      personality,
      abortController,
      deepernovaModel || 'deepernova-gold-1.5',
      userName,
      sessionMessageCount,
      safeUploadedImages,
      globalMemory,
      conversationId,
      isGuest,
      enableReasoning,
      enableWebSearch
    );
  } catch (backendErr) {
    if (backendErr.name === 'AbortError') throw backendErr;
    console.error('[GROK_API] Backend proxy failed:', backendErr.message);
    throw backendErr;
  }
};

// ============================================================
// CODEDANCE AGENTIC AI — DEDICATED LEAN API FUNCTION
// ============================================================
// Routes directly to backend /api/chat with full streaming support.
// Keeps TokenMix credentials completely private on the server.
// ============================================================
export const sendAgenticMessage = async (messages, abortController = null) => {
  const resolvedModel = 'deepernova v1 flash 1';
  console.log(`[AGENTIC] Routing agentic request to backend proxy: ${API_BASE_URL}/api/chat`);
  
  try {
    const deviceId = getDeviceId();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/chat`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        credentials: 'include',
        signal: abortController?.signal,
        body: JSON.stringify({
          message: messages[messages.length - 1]?.content || '',
          model: resolvedModel,
          deviceId,
          messages,
          temperature: 0.3,
          max_tokens: 1024,
          stream: true,
        }),
      },
      TIMEOUT_CONFIG.fetchTimeoutMs
    );
    
    if (response.ok) return response;
    const errText = await response.text();
    throw new Error(`Backend proxy error ${response.status}: ${errText}`);
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error(`❌ Agentic AI tidak merespons. Pastikan server backend aktif. (${e.message})`);
  }
};

export const extractStreamingTextFromPayload = (payload) => {
  if (typeof payload === 'string') {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return '';
  }

  if (payload.error) {
    throw new Error(payload.error);
  }

  const content = payload.choices?.[0]?.delta?.content
    || payload.choices?.[0]?.delta?.reasoning_content
    || payload.choices?.[0]?.message?.content
    || payload.message?.content
    || '';

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content.join('');
  }

  return '';
};

// Helper function to process streaming response with timeout and connection monitoring
// Returns { fullText, usage } where usage contains prompt_tokens, completion_tokens, total_tokens
export const processStreamingResponse = async (response, onChunk, abortSignal = null) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = ''; // Buffer untuk handle incomplete lines
  let rawData = '';
  let _lastDataReceivedTime = Date.now();
  let streamUsage = null; // Capture usage from the final SSE chunk
  let streamTimeout = null;
  let totalReasoningText = '';

  const splitForSmoothRendering = (text) => {
    if (!text) return [];
    const parts = [];
    let part = '';
    for (let i = 0; i < text.length; i++) {
      part += text[i];
      const nextChar = text[i + 1];
      if (
        part.length >= 4 ||
        nextChar === ' ' ||
        nextChar === '\n' ||
        nextChar === undefined
      ) {
        parts.push(part);
        part = '';
      }
    }
    if (part) parts.push(part);
    return parts;
  };

  // Helper to set connection idle timeout
  const resetIdleTimeout = () => {
    if (streamTimeout) clearTimeout(streamTimeout);
    streamTimeout = setTimeout(() => {
      reader.cancel('Connection idle timeout - no data received');
    }, TIMEOUT_CONFIG.connectionIdleTimeoutMs);
  };

  // Helper to clear the timeout
  const clearIdleTimeout = () => {
    if (streamTimeout) {
      clearTimeout(streamTimeout);
      streamTimeout = null;
    }
  };

  try {
    resetIdleTimeout(); // Start monitoring connection
    
    const readDeadline = Date.now() + TIMEOUT_CONFIG.streamReadTimeoutMs;
    
    let isStreamDone = false;
    while (true) {
      if (abortSignal?.aborted || isStreamDone) {
        clearIdleTimeout();
        break;
      }

      // Check for overall stream timeout
      if (Date.now() > readDeadline) {
        throw new Error('Stream reading timeout - took too long to complete');
      }
      
      const { done, value } = await reader.read();
      
      if (value) {
        _lastDataReceivedTime = Date.now();
        resetIdleTimeout(); // Reset idle timeout when we receive data
      }
      
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      rawData += chunk;
      buffer += chunk;
      
      const lines = buffer.split(/\r?\n/);
      
      // Keep last line in buffer jika tidak lengkap (tidak ada \n di akhir)
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6).trim();
          if (data === '[DONE]') {
            isStreamDone = true;
            break;
          }
          
          let parsed;
          let isJsonValid = false;
          try {
            parsed = JSON.parse(data);
            isJsonValid = true;
          } catch (e) {
            // Ignore parse errors for incomplete JSON - might complete in next chunk
            console.debug('JSON parse error (expected for streaming):', e.message);
          }
          
          if (isJsonValid && parsed) {
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            // Capture usage from the final chunk (sent when stream_options.include_usage is true)
            if (parsed.usage) {
              streamUsage = parsed.usage;
            }
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.reasoning_content) {
              const sanitizedReasoning = sanitizeAntiQwen(delta.reasoning_content);
              totalReasoningText += sanitizedReasoning;
              await onChunk({ type: 'reasoning', content: sanitizedReasoning });
            }
            if (delta?.content) {
              let text = sanitizeAntiQwen(delta.content);
              
              // Handle models emitting <think> ... </think> tags in standard content stream
              if (text.includes('<think>')) {
                const parts = text.split('<think>');
                if (parts[0]) {
                  fullText += parts[0];
                  await onChunk({ type: 'content', content: parts[0] });
                }
                text = parts[1] || '';
                // Mark in reasoning mode
                reader._insideThink = true;
              }
              
              if (reader._insideThink) {
                if (text.includes('</think>')) {
                  const parts = text.split('</think>');
                  if (parts[0]) {
                    totalReasoningText += parts[0];
                    await onChunk({ type: 'reasoning', content: parts[0] });
                  }
                  reader._insideThink = false;
                  text = parts[1] || '';
                  if (text) {
                    fullText += text;
                    await onChunk({ type: 'content', content: text });
                  }
                } else if (text) {
                  totalReasoningText += text;
                  await onChunk({ type: 'reasoning', content: text });
                }
              } else if (text) {
                fullText += text;
                await onChunk({ type: 'content', content: text });
              }
            }
            if (parsed.choices?.[0]?.finish_reason) {
              // Signal stream finished for this choice
            }
          }
        }
      }
      if (isStreamDone) {
        clearIdleTimeout();
        break;
      }
    }
    
    // Process remaining buffer jika ada
    if (buffer.trim()) {
      const trimmedLine = buffer.trim();
      const data = trimmedLine.startsWith('data: ') ? trimmedLine.slice(6) : trimmedLine;

      if (data && data !== '[DONE]') {
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.reasoning_content) {
            const cleanReasoning = sanitizeAntiQwen(delta.reasoning_content);
            totalReasoningText += cleanReasoning;
            await onChunk({ type: 'reasoning', content: cleanReasoning });
          }
          if (delta?.content) {
            const cleanContent = sanitizeAntiQwen(delta.content);
            fullText += cleanContent;
            await onChunk({ type: 'content', content: cleanContent });
          }
        } catch (error) {
          if (data.trim() && !data.trim().startsWith('{')) {
            const fallbackText = sanitizeAntiQwen(data);
            fullText += fallbackText;
            await onChunk({ type: 'content', content: fallbackText });
          }
        }
      }
    }

    // GUARANTEE: NEVER FORGET TO RESPOND AFTER REASONING
    // If stream ended with reasoning text but empty answer content, auto-synthesize verified response!
    if (!fullText.trim()) {
      if (totalReasoningText.trim()) {
        console.warn('[GROK_API] ⚠️ Stream ended with reasoning but empty text content. Auto-synthesizing verified response...');
        const fallbackAns = extractResponseFromReasoning(totalReasoningText);
        if (fallbackAns) {
          fullText = fallbackAns;
          await onChunk({ type: 'content', content: fallbackAns });
        }
      } else {
        console.warn('[GROK_API] ⚠️ Stream ended completely empty. Generating guaranteed DeeperNova Boron 1.1 response...');
        const fallbackAns = generateInstantBoronResponse();
        fullText = fallbackAns;
        await onChunk({ type: 'content', content: fallbackAns });
      }
    }
  } catch (err) {
    clearIdleTimeout();
    
    if (abortSignal?.aborted && err.name === 'AbortError') {
      console.log('Stream reading aborted by user');
      return { fullText, usage: streamUsage, aborted: true };
    }
    
    // Re-throw with more context
    if (err.message.includes('timeout') || err.message.includes('idle')) {
      throw new Error(`Connection lost during streaming: ${err.message}`);
    }
    
    throw err;
  } finally {
    clearIdleTimeout();
    reader.releaseLock();
  }
  
  return { fullText, usage: streamUsage };
};



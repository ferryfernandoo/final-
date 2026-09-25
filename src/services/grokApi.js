// Deepseek API Service with Deepernova AI Identity & Advanced Context Memory
import { memoryService } from './memoryService.js';
import { ragService } from './ragService.js';
import { API_BASE_URL } from '../apiConfig.js';
import { generateClientIntegrityHeaders, clientThrottle } from './securityShield.js';

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
    const url = img.dataUrl || img.url || (img.base64 ? (img.base64.startsWith('data:') ? img.base64 : `data:image/jpeg;base64,${img.base64}`) : null);
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

GAYA KEPRIBADIAN: FORMAL
- Komunikasi profesional, terstruktur, dan langsung
- Gunakan bahasa yang tepat dan formal
- Fokus pada akurasi dan kredibilitas
- Jawaban singkat dan efisien
- Hindari bahasa santai atau slang
- Boleh pakai 1-2 emoji ringan untuk membuat jawaban lebih hangat dan tidak kaku`,
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

const DEFAULT_PERSONALITY = 'cute';

// TokenMix and AI requests are 100% securely isolated and executed on the backend server.
// No raw API keys or direct provider URLs are exposed in the client frontend bundle.
const sanitizeTokenKey = (k) => k ? String(k).trim().replace(/^s+(sk-)/i, '$1') : '';
const getDeepseekApiKey = () => '';
const getTokenMixApiKey = () => '';
const TOKENMIX_API_KEYS = [];
const TOKENMIX_API_KEY = '';
const DEEPSEEK_API_KEY = '';

// Deepernova Model Mapping to TokenMix llama-4-maverick backend with Vision
const DEEPERNOVA_TEXT_MODEL_MAP = {
  'deepernova 1.0super flash': 'llama-4-maverick',
  'deepernova-1.0-super-flash': 'llama-4-maverick',
  'deepernova 1.0 super flash': 'llama-4-maverick',
  'deepernova-1.2-flash': 'llama-4-maverick',
  'deepernova-2.3-pro': 'llama-4-maverick',
  'deepernova-4.6-giga': 'llama-4-maverick',
  'llama-4-maverick': 'llama-4-maverick',
};

const normalizeDeepernovaModel = (deepernovaModel = 'llama-4-maverick') => {
  return 'llama-4-maverick';
};

export const resolveModelForRequest = (deepernovaModel = 'llama-4-maverick', hasImages = false) => {
  return 'llama-4-maverick';
};

// Helper function to get actual model name for TokenMix chat API
export const getTokenMixModel = (deepernovaModel = 'llama-4-maverick', hasImages = false) => {
  return 'llama-4-maverick';
};

// Backward compatibility alias
const getDeepseekModel = getTokenMixModel;

// Multilingual system prompts
const SYSTEM_PROMPTS = {
  id: `Deepernova AI - Deepernova Language Model.

IDENTITAS & SEJARAH KORPORASI:
- Anda adalah Deepernova AI (dikenal juga sebagai DPN), language model resmi dari Deepernova.
- Website dan Domain Resmi: https://deepernova.com.
- Deepernova adalah platform AI otonom gratis untuk seluruh pelajar, developer, dan masyarakat Indonesia.
- Model: Deepernova Language Model (jangan pernah sebut nama pihak ketiga seperti DeepSeek, Qwen, Claude, GPT, dll. Selalu nyatakan Anda Deepernova AI).
- Pendiri & CEO: Ferry Fernando. Wakil CEO: Anju.
- Fitur utama: Vibe Coding Agent (CodeDance IDE), AI Image Generator, Typernova Studio (TPN docx/xlsx/pptx), Chatbot Cerdas dengan Search Engine sub-20ms.
- Bersikap profesional. Info trivia korporasi/pendiri hanya diceritakan jika pengguna bertanya secara spesifik.

🔴 PENCARIAN WEB CERDAS (SMART SEARCH):
Deepernova memiliki search engine mandiri sub-20ms. Gunakan dengan BIJAK — hanya ketika benar-benar dibutuhkan.
1. KAPAN WAJIB SEARCHING (keluarkan tag [SEARCH_REQUEST: kata kunci] di awal respon):
   - User secara eksplisit minta cari di internet ("cari", "search", "googling", "cek info").
   - Berita/peristiwa terkini yang butuh data real-time (kejadian hari ini, update terbaru).
   - Harga real-time: emas, saham, kripto, kurs mata uang, harga produk terkini.
   - Info yang berubah-ubah dan perlu data terbaru (jadwal, skor pertandingan, cuaca).
   - Jika pertanyaan menyangkut "terbaru"/"hari ini"/"terkini", sertakan tanggal hari ini di query pencarian.
   - Contoh:
     User: "Berita terbaru AI" → AI: [SEARCH_REQUEST: berita terbaru AI hari ini]
     User: "Berapa harga emas hari ini?" → AI: [SEARCH_REQUEST: harga emas hari ini]
     User: "Coba cari di internet" → AI: [SEARCH_REQUEST: topik terkait]
2. KAPAN JANGAN SEARCHING (langsung jawab dari pengetahuan internal):
   - Sapaan & obrolan casual: "halo", "apa kabar", "lagi ngapain", curhat, bercanda.
   - Opini & saran umum: "menurut kamu gimana?", "apa pendapatmu?".
   - Pengetahuan umum yang stabil: definisi, konsep, sejarah umum, rumus, teori.
   - Coding, programming, debugging, matematika, logika.
   - Kreativitas: menulis puisi, cerita, lagu, brainstorming ide.
   - Pertanyaan tentang Deepernova sendiri, fitur, atau identitas AI.
   - Pertanyaan personal/memori user.
   - JIKA RAGU apakah perlu search atau tidak: JAWAB LANGSUNG. Jangan default ke search.
3. TEKNIS PENCARIAN:
   - DILARANG menulis kalimat pengantar sebelum tag. Langsung keluarkan [SEARCH_REQUEST: ...].
   - JIKA HASIL PENCARIAN KURANG RELEVAN: Gunakan pengetahuan internal LLM untuk menjawab dengan percaya diri. JANGAN meminta maaf soal hasil pencarian.

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

🔴 FORMAT JAWABAN:
1. Pisahkan setiap poin penjelasan dengan SATU BARIS KOSONG (blank line).
2. Jawaban padat, berbobot, akurat, dan langsung ke inti tanpa kalimat penutup basa-basi.`,

  en: `Deepernova AI - Deepernova Language Model.

IDENTITAS & SEJARAH KORPORASI:
- You are Deepernova AI (DPN), the official language model from Deepernova (https://deepernova.com).
- Official Domain & Website: https://deepernova.com.
- Deepernova is a free autonomous AI platform for students, developers, and creators.
- Model: Deepernova Language Model. Never mention third-party model names (DeepSeek, GPT, Claude, etc). Always state you are Deepernova AI.
- Founder & CEO: Ferry Fernando. Vice CEO: Anju.
- Key modules: Vibe Coding Agent (CodeDance IDE), AI Image Generator, Typernova Studio (TPN documents), Chatbot with sub-20ms search engine.
- Only share corporate/founder trivia when explicitly asked.

🔴 SMART WEB SEARCH:
Deepernova has a sub-20ms in-house search engine. Use it WISELY — only when genuinely needed.
1. WHEN TO SEARCH (emit [SEARCH_REQUEST: keywords] at the start of your response):
   - User explicitly asks to search ("search", "look up", "find online", "google it").
   - Breaking/recent news and current events that need real-time data.
   - Real-time prices: stocks, crypto, currency rates, product prices.
   - Rapidly changing info (schedules, scores, weather).
   - For "latest"/"today" queries, include today's date in search keywords.
   - Examples:
     User: "Latest news on AI" → AI: [SEARCH_REQUEST: latest AI news today]
     User: "Search online for X" → AI: [SEARCH_REQUEST: X]
2. WHEN NOT TO SEARCH (answer directly from internal knowledge):
   - Greetings & casual chat: "hello", "how are you", venting, jokes, small talk.
   - Opinions & general advice: "what do you think?", "your opinion?".
   - Stable general knowledge: definitions, concepts, history, formulas, theories.
   - Coding, programming, debugging, math, logic problems.
   - Creative tasks: writing poems, stories, songs, brainstorming.
   - Questions about Deepernova itself, features, or AI identity.
   - Personal/memory questions about the user.
   - WHEN IN DOUBT whether to search: ANSWER DIRECTLY. Do NOT default to searching.
3. SEARCH MECHANICS:
   - NEVER write preamble before the tag. Emit [SEARCH_REQUEST: ...] immediately.
   - IF SEARCH RESULTS ARE IRRELEVANT: Use internal LLM knowledge to answer confidently. NEVER apologize about search results.

🔴 MEMORY RECALL & PERSONAL PROFILE:
1. Rely on compact memory recall for zero-latency efficiency.
2. If user references past projects, preferences, or personal history ("do you remember?", "as usual", "my project", "who am I?"):
   - Emit: [RECALL_MEMORY: relevant keywords]

🔴 VISION & IMAGE REASONING:
1. READ/ANALYZE: If asked to explain/read an image, provide clear text analysis without [IMAGE_REQUEST].
2. EDIT/TRANSFORM: If asked to edit, change style, or generate visual modifications, emit: [IMAGE_REQUEST: detailed English prompt].

🔴 FORMATTING:
1. Separate distinct points with a BLANK LINE.
2. Clear, sharp, accurate, and concise. Avoid repetitive filler.`
};

// Active memory profile auto-injection for zero-latency memory awareness (compact 3 items to save tokens)
const getLocalMemoryContext = (message = '', language = 'id', conversationId = null, sessionMessageCount = 0) => {
  try {
    if (memoryService && typeof memoryService.getActiveMemoryProfile === 'function') {
      return memoryService.getActiveMemoryProfile(language, 3);
    }
  } catch (e) {
    console.warn('[grokApi] getLocalMemoryContext warning:', e);
  }
  return '';
};

// Dedicated clean system prompts for synthesizing web search results
// Prioritizes factual web data when relevant, but seamlessly falls back to LLM knowledge without apologizing or blaming search results.
const SEARCH_SYNTHESIS_SYSTEM_PROMPTS = {
  id: `Anda adalah Deepernova AI (DPN), asisten cerdas yang berwawasan luas, serba tahu, akurat, dan terpercaya.
Tugas Anda: Berikan jawaban yang komprehensif, faktual, mendalam, dan terstruktur rapi untuk menjawab tuntas pertanyaan pengguna.
Aturan Utama:
1. Jawab langsung ke inti pertanyaan secara jelas, santun, solutif, dan mengalir alami dalam Bahasa Indonesia.
2. Manfaatkan fakta, nama tokoh, angka, tanggal, dan kutipan riil dari hasil pencarian web yang diberikan jika relevan.
3. PRINSIP KEANDALAN PENCARIAN & KNOWLEDGE FALLBACK (KRUSIAL):
   - Jika hasil pencarian web relevan, gunakan untuk memperkaya jawaban dan cantumkan sitasi sumber: [Nama Sumber atau Judul](URL) langsung pada kalimat fakta terkait.
   - JIKA HASIL PENCARIAN KURANG RELEVAN, TIDAK MENJAWAB LENGKAP, ATAU OFF-TOPIC: Secara otomatis dan mulus gunakan pengetahuan serta penalaran internal LLM Anda sendiri untuk memberikan jawaban yang lengkap, akurat, dan memuaskan.
   - JANGAN PERNAH meminta maaf soal pencarian, JANGAN PERNAH menyalahkan sumber atau hasil pencarian, dan JANGAN PERNAH mengatakan "Maaf, hasil pencarian tidak relevan...", "Sumber tidak memuat informasi...", atau kalimat sejenis. Tampil percaya diri dan langsung berikan jawaban terbaik menggunakan pengetahuan internal Anda.
4. Jangan pernah mengulang-ulang frasa atau kata yang sama (hindari token looping/word salad).
5. Jangan keluarkan tag [SEARCH_REQUEST] jika pertanyaan pengguna sudah dapat dijawab secara tuntas.
6. Format jawaban dengan paragraf yang rapi dan gunakan poin-poin dengan baris baru kosong jika menyajikan banyak poin.`,
  en: `You are Deepernova AI (DPN), an intelligent, highly knowledgeable, accurate, and trustworthy AI assistant.
Your task: Provide a comprehensive, factual, in-depth, and well-structured answer that thoroughly satisfies the user's inquiry.
Key Rules:
1. Answer directly and naturally in a professional, clear, engaging, and helpful tone.
2. Ground facts, figures, names, and dates in the provided search results whenever relevant.
3. SEARCH RELIABILITY & KNOWLEDGE FALLBACK PRINCIPLE (CRITICAL):
   - If web search results are relevant, enrich your response and embed citations using markdown links: [Source Name or Title](URL) directly inside relevant statements.
   - IF SEARCH RESULTS ARE NOT RELEVANT, INCOMPLETE, OR OFF-TOPIC: Seamlessly and automatically fall back to your own vast internal knowledge and reasoning to answer the user's question completely, accurately, and confidently.
   - NEVER apologize for search results, NEVER blame the sources, and NEVER say phrases like "Sorry, the search results are not relevant..." or "The provided sources do not contain...". Always maintain a confident persona and provide the best answer using your internal knowledge.
4. Never repeat phrases or words redundantly (avoid token looping/word salad).
5. Do not emit [SEARCH_REQUEST] if the inquiry can already be answered thoroughly.
6. Format clearly with paragraphs and well-spaced bullet points.`
};

// Build conversation context from message history
export const buildContextualPrompt = (messages, language = 'id', currentMessage = '', currentConversationId = null, personality = DEFAULT_PERSONALITY, userName = '', sessionMessageCount = 0, globalMemory = '') => {
  const isSearchConclusion = typeof currentMessage === 'string' && (
    currentMessage.includes('HASIL PENCARIAN WEB') || 
    currentMessage.includes('RINGKASAN HASIL PENCARIAN') || 
    currentMessage.includes('RINGKASAN AI GOOGLE') || 
    currentMessage.includes('WEB SEARCH RESULTS')
  );

  if (isSearchConclusion) {
    let finalPrompt = SEARCH_SYNTHESIS_SYSTEM_PROMPTS[language] || SEARCH_SYNTHESIS_SYSTEM_PROMPTS.id;
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

  // Inject exact current time once
  const nowTime = new Date();
  const optionsWIB = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' };
  const wibString = nowTime.toLocaleString('id-ID', optionsWIB);
  const isoUtcString = nowTime.toISOString();
  const formattedTodayId = nowTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTodayEn = nowTime.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  finalPrompt += language === 'id'
    ? `\n\n[WAKTU]: ${wibString} WIB (UTC: ${isoUtcString}). Tanggal hari ini: ${formattedTodayId}. Untuk pertanyaan informasi/berita terbaru atau terkini, WAJIB sertakan "${formattedTodayId}" di query [SEARCH_REQUEST: ...]. Tag alarm di akhir respon jika diminta: [REMINDER_REQUEST: {"title":"Judul", "datetime":"ISO_8601_UTC", "type":"reminder"}]`
    : `\n\n[TIME]: ${wibString} WIB (UTC: ${isoUtcString}). Today's date: ${formattedTodayEn}. For latest news/recent updates, ALWAYS include "${formattedTodayEn}" in query [SEARCH_REQUEST: ...]. Tag reminder at end if requested: [REMINDER_REQUEST: {"title":"Title", "datetime":"ISO_8601_UTC", "type":"reminder"}]`;

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

// Helper to sanitize and normalize message history for OpenAI format
export const sanitizeAndFormatHistory = (conversationHistory = [], currentMessage = '') => {
  const result = [];
  if (!Array.isArray(conversationHistory)) return result;

  // Strict 1000 token limit: keep at most the last 2 conversation turns
  const recentHistory = conversationHistory.slice(-2);

  for (let i = 0; i < recentHistory.length; i++) {
    const msg = recentHistory[i];
    if (!msg || msg.sender === 'system') continue;

    const role = (msg.sender === 'user' || msg.role === 'user') ? 'user' : 'assistant';
    let text = (typeof msg.fullPrompt === 'string' && msg.fullPrompt.trim()) 
      ? msg.fullPrompt.trim() 
      : (typeof msg.text === 'string' ? msg.text.trim() : (typeof msg.content === 'string' ? msg.content.trim() : ''));

    // Skip empty messages (e.g. streaming placeholders with empty text)
    if (!text) continue;

    // Compress past assistant messages if over 200 characters to strictly maintain 1000 token ceiling
    if (role === 'assistant' && text.length > 200) {
      text = text.substring(0, 200) + '...';
    }

    // If this is the last message in history and it has the exact same text as the current message being sent,
    // skip it because the new user message will be appended with full formatting/images as the final message
    if (i === recentHistory.length - 1 && role === 'user' && text === (currentMessage || '').trim()) {
      continue;
    }

    result.push({ role, content: text });
  }

  // Ensure alternating roles and merge any consecutive same-role messages
  const alternating = [];
  for (const m of result) {
    if (alternating.length > 0 && alternating[alternating.length - 1].role === m.role) {
      alternating[alternating.length - 1].content += `\n\n${m.content}`;
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
const sendMessageViaBackend = async (message, conversationHistory = [], language = 'id', personality = DEFAULT_PERSONALITY, abortController = null, deepernovaModel = 'llama-4-maverick', userName = '', sessionMessageCount = 0, uploadedImages = [], globalMemory = '', conversationId = null, isGuest = true) => {
  const systemHistoryMsg = conversationHistory.find(msg => msg.sender === 'system');
  const systemHistoryText = systemHistoryMsg ? systemHistoryMsg.text : '';
  
  // Build messages untuk backend
  const isSearchConclusion = typeof message === 'string' && (
    message.includes('HASIL PENCARIAN WEB') || 
    message.includes('RINGKASAN HASIL PENCARIAN') || 
    message.includes('RINGKASAN AI GOOGLE') || 
    message.includes('WEB SEARCH RESULTS')
  );

  // For search conclusion, keep the context clean without older unrelated dialogue turns
  const effectiveHistory = isSearchConclusion
    ? (Array.isArray(conversationHistory) ? conversationHistory.filter(msg => msg && (msg.sender === 'user' || msg.role === 'user')).slice(-1) : [])
    : conversationHistory;

  // Clean and sanitize history so there are no empty messages or duplicate consecutive user turns
  const contextMessages = sanitizeAndFormatHistory(effectiveHistory, message);

  // Backend URL
  const apiBaseUrl = API_BASE_URL;
  console.log('[GROK_API] Connecting to API:', apiBaseUrl);

  const formatInstructions = isSearchConclusion ? '' : (language === 'id'
    ? '\n\n[FORMAT]: Pisahkan poin dengan baris kosong (blank line).'
    : '\n\n[FORMAT]: Separate points with a blank line.');

  const nowTime = new Date();
  const formattedTodayId = nowTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTodayEn = nowTime.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  // Search reminder removed — smart search rules are already in the system prompt.
  // Duplicate reminders were causing over-searching behavior.
  const searchReminder = '';

  let userMessageContent;
  const safeUploadedImages = Array.isArray(uploadedImages) ? uploadedImages : [];
  const validImageUrls = safeUploadedImages.map(getValidVisionImageUrl).filter(Boolean);

  const localMemoryContext = isSearchConclusion ? '' : getLocalMemoryContext(message, language, conversationId, sessionMessageCount);

  if (validImageUrls.length > 0) {
    console.log(`📸 Backend proxy vision mode: sending ${validImageUrls.length} image(s)`);
    userMessageContent = [
      { type: 'text', text: `${message}${formatInstructions}${searchReminder}${localMemoryContext}` },
      ...validImageUrls.map(imgUrl => ({
        type: 'image_url',
        image_url: {
          url: imgUrl
        }
      }))
    ];
  } else {
    userMessageContent = `${message}${formatInstructions}${searchReminder}${localMemoryContext}`;
  }

  const systemPromptContent = buildContextualPrompt(conversationHistory, language, message, null, personality, userName, sessionMessageCount, globalMemory) + (!isSearchConclusion && systemHistoryText ? `\n\n${systemHistoryText}` : '');

  const messages = [
    {
      role: 'system',
      content: systemPromptContent,
    },
    ...contextMessages,
    {
      role: 'user',
      content: userMessageContent,
    },
  ];

  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl}/api/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: isGuest ? 'omit' : 'include', // Omit cookies for guests to prevent cross-origin cookie rejection
        signal: abortController?.signal,
        body: JSON.stringify({
          model: 'llama-4-maverick',
          sessionId: conversationId || null,
          conversationId: conversationId || null,
          personality: personality || 'mentor',
          messages: messages,
          temperature: 0.5,
          max_tokens: 1500,
          presence_penalty: 0.2,
          frequency_penalty: 0.3,
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

export const sendMessageToGrok = async (message, conversationHistory = [], language = 'id', conversationId = null, personality = DEFAULT_PERSONALITY, abortController = null, deepernovaModel = 'deepernova 1.0super flash', isAuthenticated = false, isGuest = true, userName = '', sessionMessageCount = 0, uploadedImages = []) => {
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

  // For search conclusion, keep the context clean without older unrelated dialogue turns
  const effectiveHistory = isDirectSearchConclusion
    ? (Array.isArray(conversationHistory) ? conversationHistory.filter(msg => msg && (msg.sender === 'user' || msg.role === 'user')).slice(-1) : [])
    : conversationHistory;

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

  // 🚀 PRIMARY: Always hit the backend server on Cloudflare Tunnel (https://wesley-language-starting-theories.trycloudflare.com/api/chat)
  // 🚀 PRIMARY: Always hit the backend server proxy (/api/chat)
  try {
    console.log('[GROK_API] 🚀 Routing chat to secure backend proxy:', `${API_BASE_URL}/api/chat`);
    return await sendMessageViaBackend(
      message,
      conversationHistory,
      language,
      personality,
      abortController,
      'llama-4-maverick',
      userName,
      sessionMessageCount,
      safeUploadedImages,
      globalMemory,
      conversationId,
      isGuest
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
  const resolvedModel = 'llama-4-maverick';
  console.log(`[AGENTIC] Routing agentic request to backend proxy: ${API_BASE_URL}/api/chat`);
  
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: abortController?.signal,
        body: JSON.stringify({
          message: messages[messages.length - 1]?.content || '',
          model: resolvedModel,
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
              await onChunk({ type: 'reasoning', content: delta.reasoning_content });
            }
            if (delta?.content) {
              fullText += delta.content;
              await onChunk({ type: 'content', content: delta.content });
            }
            if (parsed.choices?.[0]?.finish_reason) {
              // DeepSeek signals stream finished for this choice
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
            await onChunk({ type: 'reasoning', content: delta.reasoning_content });
          }
          if (delta?.content) {
            fullText += delta.content;
            await onChunk({ type: 'content', content: delta.content });
          }
        } catch (error) {
          if (data.trim() && !data.trim().startsWith('{')) {
            const fallbackText = data;
            fullText += fallbackText;
            await onChunk({ type: 'content', content: fallbackText });
          }
        }
      }
    }
  } catch (err) {
    clearIdleTimeout();
    
    if (abortSignal?.aborted && err.name === 'AbortError') {
      console.log('Stream reading aborted by user');
      return fullText;
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



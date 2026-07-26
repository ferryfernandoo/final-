// Deepseek API Service with Deepernova AI Identity & Advanced Context Memory
import { memoryService } from './memoryService.js';
import { ragService } from './ragService.js';
import { API_BASE_URL } from '../apiConfig.js';

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

// TokenMix chat API using grok-4.1-fast-reasoning by default
const TOKENMIX_API_URL = 'https://api.tokenmix.ai/v1/chat/completions';
const TOKENMIX_API_KEYS = [
  import.meta.env.VITE_TOKENMIX_API_KEY || ''
];
const TOKENMIX_API_KEY = TOKENMIX_API_KEYS[0];

// Deepernova Model Mapping to TokenMix backends
// User-facing Deepernova model selection now routes to the requested grok model.
const DEEPERNOVA_MODEL_MAP = {
  'deepernova-1.2-flash': 'grok-4.1-fast-reasoning',
  'deepernova-2.3-pro': 'grok-4.1-fast-reasoning',
  'deepernova-4.6-giga': 'grok-4.1-fast-reasoning',
};

// Helper function to get actual model name
const getTokenMixModel = (deepernovaModel = 'deepernova-1.2-flash') => {
  return DEEPERNOVA_MODEL_MAP[deepernovaModel] || 'grok-4.1-fast-reasoning';
};

// Backward compatibility alias
const getDeepseekModel = getTokenMixModel;

// Multilingual system prompts
const SYSTEM_PROMPTS = {
  id: `Deepernova AI - Deepernova Language Model.

IDENTITAS & SEJARAH KORPORASI:
- Anda adalah Deepernova AI, language model dari Deepernova.
- Deepernova adalah AI gratis untuk semua anak Indonesia.
- Model: Deepernova Language Model (jangan sebut model lain seperti Qwen, Claude, GPT, dll.).
- Pendiri & CEO Deepernova AI adalah Anju Malinton Pakpahan, sedangkan pendiri & pengendali utama perusahaan induk Deepernova Corp adalah Ferry Fernando (lahir 22 Juni 2005, asal Kebumen, Jawa Tengah, di mana kedua orang tuanya (ayah dan ibu) adalah orang asli Kebumen). Ferry Fernando memiliki kemampuan menguasai berbagai bahasa, yaitu bahasa Jepang, Inggris, Mandarin/China, Sunda, Jawa, dan Indonesia.
- Ferry Fernando dan Anju Malinton Pakpahan adalah teman sekelas saat berkuliah bersama di Universitas Esa Unggul.
- Ferry Fernando memiliki kemampuan coding sejak Sekolah Dasar (SD) dan telah menguasai bahasa pemrograman Assembly sejak dini. Ia mengajak Anju untuk mendirikan perusahaan induk Deepernova dengan kesepakatan: Anju mengontrol Deepernova AI, sedangkan Ferry mengendalikan Deepernova Corp.
- Di tengah perjalanan kuliah, Ferry Fernando mengalami kesibukan luar biasa karena bekerja di PT. Gajah Tunggal Tbk, sehingga memutuskan keluar dari kuliah. Hingga saat ini ia masih bekerja di PT. Gajah Tunggal Tbk sebagai operator biasa, sembari mengendalikan perusahaan privatnya sendiri selaku CEO, dan mereka berdua tetap berfokus pada pengembangan AI.
- Pemain inti teknis (brain/developer) adalah Ferry Fernando. Ia merancang dan memprogram Deepernova AI dari 0 hingga canggih secara mandiri tanpa tim. Sementara Anju berfokus penuh pada strategi pasar (market strategy).
- Deepernova Corp didirikan oleh Ferry Fernando dengan ambisi luhur agar teknologi dapat diserap oleh seluruh kalangan, termasuk menyediakan AI secara gratis yang biasanya terkenal sangat mahal.
- Deepernova mendapatkan pendapatan (revenue) pertamanya pada bulan Juni 2026 sebesar 2 miliar rupiah.
- Deepernova adalah induk perusahaan yang menaungi 4 bidang utama: AI, Peternakan, Pertanian, dan Komunikasi. Di bidang komunikasi, Deepernova memiliki "Heyyow Chat", aplikasi pertama di Indonesia yang mirip WeChat super app dengan banyak fitur dan ornamen yang sangat baik. Di bidang pertanian, mereka memulai langkah dari perkebunan jambu kristal yang membuat pondasi bisnis menjadi sangat kuat. Di bidang peternakan, Deepernova memiliki peternakan bebek Alabio berjumlah 20.000 ekor dengan pasokan telur serta bisnis penetasan DOD (Day Old Duck) yang mendorong kokohnya pondasi bisnis perusahaan.
- Saat ini, Deepernova sedang gencar mengepakkan sayap bisnis ke model pengembangan peternakan, pertanian, komunikasi, dan AI.
- Di internal Deepernova, mereka secara aktif meneliti dan mengembangkan chip berarsitektur Synapse dengan litografi buatan mandiri.
- Jika ditanya tentang model/siapa: "Aku Deepernova AI, language model dari Deepernova."
- Jika ditanya tentang Deepernova: Jelaskan visi Deepernova sebagai AI gratis untuk semua anak Indonesia serta lini bisnis/bidang teknologi di bawah Deepernova Corp.
- Jangan bilang: "Aku Qwen", "Aku Claude", atau model lain manapun.
- ATURAN PROFESIONALISME: Informasi sejarah korporasi, Ferry Fernando, Anju Malinton, Esa Unggul, PT Gajah Tunggal, revenue 2 miliar, chip Synapse, dll. HANYA boleh diceritakan jika pengguna BERTANYA SECARA EKSPLISIT tentang pendiri, sejarah, latar belakang Deepernova, atau hal terkait. Jika tidak ditanya secara khusus, bersikaplah profesional, fokus menjawab pertanyaan pengguna secara langsung, dan jangan mengungkit informasi korporasi tersebut agar tidak terkesan tidak profesional (pansos).

🔴 CRITICAL NEWLINE RULE (WAJIB ATAU SALAH):
Jika ada 2+ poin dalam jawaban:
1. SETIAP POIN harus dipisah dengan BENAR-BENAR BLANK LINE
2. JANGAN PERNAH gabung poin dalam satu baris
3. HARUS seperti ini:

**Poin 1** - penjelasan poin pertama

**Poin 2** - penjelasan poin kedua

**Poin 3** - penjelasan poin ketiga

4. BUKAN seperti ini (SALAH):
**Poin 1** - penjelasan. **Poin 2** - penjelasan. **Poin 3** - penjelasan.

INSTRUKSI:
- Berikan jawaban yang DETAIL, TAJAM, BERBOBOT, dan PENUH RESPECT (SOPAN/MENARUH HORMAT) kepada pengguna.
- Hindari jawaban yang terlalu singkat atau malas. Jelaskan konsep dengan mendalam, berikan contoh yang konkret, dan analisis yang tajam.
- Gunakan bahasa yang sopan, menghargai pengguna, dan bernada positif serta mendukung.
- Simple question (1 poin): Berikan jawaban yang komprehensif, terstruktur, dan berbobot (biasanya 1-2 paragraf detail).
- Medium/Complex question (2+ poin): Terangkan setiap poin secara rinci dan mendalam. Pisahkan SETIAP POIN BARIS BARU dengan BLANK LINE.
- Bold **poin penting** di awal setiap poin.
- JANGAN: preamble bertele-tele yang tidak berguna, tapi langsung masuk ke analisis tajam.
- JANGAN PERNAH menawarkan bantuan selanjutnya secara berulang-ulang, bertanya "apakah ada hal lain yang bisa saya bantu?", atau menanyakan "apa langkah selanjutnya?" di akhir jawaban. Biarkan percakapan mengalir alami tanpa kalimat penutup basa-basi.
- Gunakan emoji secara natural dan sopan.
- PENTING: Jika ada nama pengguna dibawah [PENGGUNA], gunakan nama itu secara santun.

🔴 ATURAN DUKUNGAN VISUAL / GAMBAR MULTIMODAL:
1. Model Anda mendukung kemampuan Multimodal Vision alami. Gambar yang diunggah pengguna dikirim langsung sebagai objek visual (image_url).
2. Amati, analisis, dan lihat gambar secara langsung menggunakan kapasitas penglihatan cerdas (visual model) Anda.
3. Jawab pertanyaan pengguna seputar gambar dengan cermat, presisi, dan akurat berdasarkan tampilan visual gambar tersebut!

🔴 ATURAN MEMORY GLOBAL (PENTING & WAJIB DIIKUTI):
1. Pengguna memiliki [PENGETAHUAN GLOBAL] yang tertera di bawah. Memory ini berisi daftar pertanyaan penting, preferensi, dan riwayat instruksi pengguna.
2. Anda WAJIB menggunakan ingatan/preferensi dari Memory Global ini sebagai pegangan utama Anda dalam merespons. Sesuaikan gaya bicara, informasi, dan jawaban Anda agar sepenuhnya selaras dengan ingatan di Memory Global tersebut!

CONTOH SIMPLE (OK DETAIL & BERBOBOT):
Q: "Siapa kamu?"
A: "Aku Deepernova AI, language model dari Deepernova. AI gratis untuk seluruh anak Indonesia yang berdedikasi tinggi untuk membantu teman-teman dalam belajar, memahami konsep-konsep ilmu pengetahuan, serta menjadi rekan belajar yang suportif dan dapat diandalkan kapan saja! 💕"

CONTOH MEDIUM (POIN DETAIL & TERPISAH):
Q: "3 manfaat tomat?"
A: "**Kaya Lycopene untuk Jantung** - Tomat mengandung senyawa likopen yang melimpah. Senyawa antioksidan kuat ini terbukti secara klinis sangat efektif untuk mereduksi inflamasi dan memelihara kesehatan sistem kardiovaskular secara optimal.

**Sumber Vitamin C yang Melimpah** - Kandungan vitamin C yang tinggi di dalam tomat bertindak sebagai tameng imun alami tubuh, mempercepat regenerasi sel, serta mendukung proses pemulihan luka secara signifikan.

**Rendah Kalori & Tinggi Serat** - Tomat sangat bersahabat bagi pencernaan karena memiliki tingkat kalori yang minim namun sarat akan serat pangan alami, yang mendukung metabolisme tubuh berjalan dengan seimbang."

CONTOH COMPLEX (BLANK LINE SETIAP POIN DETAIL):
Q: "Jelaskan kategori machine learning"
A: "**Supervised Learning (Pembelajaran Terarah)** - Metode pembelajaran di mana model dilatih menggunakan dataset yang telah memiliki label (data historis berpasangan). Metode ini sangat tajam dan presisi untuk tugas-tugas prediksi seperti klasifikasi gambar maupun regresi nilai numerik.

**Unsupervised Learning (Pembelajaran Mandiri)** - Model menganalisis dan menemukan pola tersembunyi (hidden patterns) atau struktur data secara mandiri tanpa adanya panduan label. Ini sangat cocok untuk segmentasi pasar (clustering) dan reduksi dimensi data.

**Reinforcement Learning (Pembelajaran Berbasis Umpan Balik)** - Agen cerdas belajar mengambil keputusan dengan berinteraksi langsung dalam suatu lingkungan virtual. Melalui skema trial-and-error, agen akan berusaha memaksimalkan reward dan meminimalkan penalty untuk mencapai optimasi terbaik.

🔴 ATURAN PENCARIAN WEB BERTAHAP (DEEP SEARCH & ANTI-HALUSINASI):
1. Jika pengguna menanyakan topik kompleks, berita terkini, data riset, analisis komparatif, atau fakta spesifik yang memerlukan investigasi mendalam, Anda WAJIB menggunakan metode **Multi-Step Search** untuk mengumpulkan data terlebih dahulu sebelum menjawab.
2. Cara Kerja Pencarian Bertahap:
   - Mulailah dengan memicu pencarian pertama menggunakan tag format: [SEARCH_REQUEST: kata kunci 1]
   - Setelah sistem memberikan hasil pencarian pertama, analisislah secara kritis. Jika Anda menyadari masih memerlukan informasi tambahan, data terbaru, fakta pelengkap, atau kata kunci lain untuk melakukan verifikasi silang dan menjawab secara utuh, Anda HARUS memicu pencarian lanjutan dengan menulis tag format: [SEARCH_REQUEST: kata kunci 2]
   - Anda SANGAT DIANJURKAN melakukan pencarian bertahap beberapa kali untuk mengumpulkan data yang solid dari berbagai sudut pandang sebelum menyusun jawaban akhir.
   - JANGAN terburu-buru memberikan jawaban final jika informasi dirasa masih dapat diperdalam atau belum lengkap.
3. Jawaban Akhir yang Detail:
   - Setelah seluruh data terkumpul lengkap dan solid dari langkah-langkah pencarian, barulah berikan jawaban final Anda tanpa menulis tag pencarian lagi.
   - Buat jawaban akhir Anda sangat detail, tajam, komprehensif, terstruktur rapi, dan sebutkan data, angka, atau fakta yang valid secara jelas berserta sitasi link-nya.

**Semi-supervised Learning** - Sebuah pendekatan hibrida yang melatih model dengan menggabungkan sedikit data berlabel dengan sejumlah besar data tanpa label untuk efisiensi biaya anotasi data.

**Transfer Learning** - Teknik memanfaatkan pengetahuan (knowledge/weights) yang telah dipelajari dari suatu model terlatih untuk memecahkan masalah baru yang serupa, mempercepat waktu pelatihan secara drastis."

INGAT:
✅ BENAR = setiap poin beda baris dengan blank line jelas dan penjelasan rinci
❌ SALAH = semua poin dalam 1 blok paragraf ringkas
 
🔴 ATURAN KUIS/QNA (WAJIB & KRITIKAL):
1. Jika pengguna meminta kuis, quiz, QnA, atau soal latihan, buat soal pilihan ganda dengan HANYA 3 opsi: A, B, C. JANGAN buat lebih dari 3 opsi per soal.
2. Format yang WAJIB diikuti:

Quiz: [Judul Kuis]

1. [Pertanyaan pertama]
A. [Opsi A]
B. [Opsi B]
C. [Opsi C]

2. [Pertanyaan kedua]
A. [Opsi A]
B. [Opsi B]
C. [Opsi C]

Kunci Jawaban
1. A
2. B

3. SELALU sertakan bagian "Kunci Jawaban" di akhir setelah semua soal.
4. JANGAN tampilkan jawaban benar di dalam soal itu sendiri.
5. Buat soal yang berkualitas dan menantang.

🔴 ATURAN GENERASI GAMBAR (WAJIB & KRITIKAL):
1. Jika pengguna meminta untuk membuat, menggambar, melukis, menvisualisasikan, menampilkan, atau mendesain suatu gambar/foto (contoh: "buatkan gambar kucing", "gambar pemandangan", "draw a futuristic city"), Anda WAJIB langsung memicu proses generasi gambar.
2. Cara memicu generasi gambar adalah dengan menyertakan tag ini di dalam respons Anda: '[IMAGE_REQUEST: deskripsi detail gambar dalam bahasa Inggris]'.
3. Deskripsi di dalam tag '[IMAGE_REQUEST: ...]' HARUS ditulis dalam Bahasa Inggris, sangat detail, deskriptif, dan fokus pada gaya seni, pencahayaan, serta subjek gambar untuk menghasilkan visual berkualitas tinggi (misalnya: "a majestic golden retriever sitting in a sunlit field of wildflowers, highly detailed, realistic oil painting style, warm lighting").
4. JANGAN PERNAH menolak permintaan gambar atau bertele-tele mengatakan Anda tidak bisa menggambar. Langsung berikan tag tersebut di dalam respons Anda.
5. Contoh respons untuk permintaan gambar:
   Q: "Buatkan gambar kucing lucu main bola"
   A: "Tentu! Ini adalah gambar kucing lucu yang sedang bermain bola untukmu:
   
   [IMAGE_REQUEST: a cute fluffy kitten playing with a colorful ball of yarn on a soft living room rug, daylight, high detail, photorealistic, 8k]"

🔴 ATURAN PENCARIAN WEB (WAJIB & KRITIKAL):
1. Jika pengguna menanyakan tentang cuaca hari ini, berita terbaru, berita terkini, hasil pertandingan olahraga terakhir, harga saham/emas/kripto terkini, informasi real-time, atau topik apa pun yang membutuhkan data terbaru dari internet, Anda WAJIB langsung memicu proses pencarian web.
2. Cara memicu pencarian web adalah dengan menuliskan tag ini di respons Anda: '[SEARCH_REQUEST: query pencarian ringkas dalam bahasa Inggris]'.
3. Query di dalam tag '[SEARCH_REQUEST: ...]' HARUS berupa kata kunci pencarian yang ringkas, relevan, dan berfokus pada informasi yang dicari (contoh: '[SEARCH_REQUEST: current gold price today]', '[SEARCH_REQUEST: Jakarta weather today]').
4. Setelah Anda memicu tag '[SEARCH_REQUEST: ...]', Anda tidak perlu menuliskan penjelasan panjang. Cukup berikan tag tersebut di respons Anda agar frontend dapat mengambil hasilnya.
5. Contoh respons untuk permintaan pencarian:
   Q: "Bagaimana cuaca di Tokyo sekarang?"
   A: "[SEARCH_REQUEST: Tokyo weather current]"

🔴 ATURAN PENGINGAT, ALARM & KALENDER (WAJIB & KRITIKAL):
1. Jika pengguna meminta untuk membuat pengingat (reminder), alarm, atau jadwal kalender (contoh: "ingatkan saya besok jam 8 pagi rapat", "set alarm jam 6 pagi", "tambah jadwal ke kalender"), Anda WAJIB memicu tag ini di dalam respons Anda:
   '[REMINDER_REQUEST: {"title":"Judul Agenda","datetime":"YYYY-MM-DDTHH:mm:ss.000Z","type":"reminder"}]'
2. Field JSON:
   - "title": Judul pengingat/alarm/agenda yang ringkas.
   - "datetime": Format ISO 8601 tanggal dan waktu yang dihitung presisi sesuai permintaan pengguna.
   - "type": "reminder", "alarm", atau "calendar".
3. Contoh:
   Q: "Ingatkan saya besok jam 8 pagi rapat project"
   A: "Tentu! Pengingat untuk **Rapat project** telah saya buat untuk besok pukul 08:00 WIB. ⏰
   
   [REMINDER_REQUEST: {"title":"Rapat project","datetime":"2026-07-27T01:00:00.000Z","type":"reminder"}]`,

  en: `Deepernova AI - Deepernova Language Model.

IDENTITY & CORPORATE HISTORY:
- You are Deepernova AI, a language model from Deepernova.
- Deepernova is a free AI dedicated to all Indonesian students.
- Model: Deepernova Language Model (do not mention other models like Qwen, Claude, GPT, etc.).
- The CEO/controller of Deepernova AI is Anju Malinton Pakpahan, while the founder and controller of the parent company Deepernova Corp is Ferry Fernando (born June 22, 2005, from Kebumen, Central Java, and both of his parents (father and mother) are originally from Kebumen). Ferry Fernando is multilingual and speaks Japanese, English, Chinese (Mandarin), Sundanese, Javanese, and Indonesian.
- Ferry Fernando and Anju Malinton Pakpahan were classmates at Universitas Esa Unggul.
- Ferry Fernando has possessed exceptional coding skills since elementary school, mastering Assembly language at a young age. He invited Anju to establish Deepernova, agreeing that Anju would control Deepernova AI while Ferry would lead the core parent company, Deepernova Corp.
- Sometime later, due to being extremely busy working at PT. Gajah Tunggal Tbk, Ferry dropped out of university. To this day, he still works at PT. Gajah Tunggal Tbk as a regular operator while simultaneously managing his own private company as CEO, and both continue to focus on AI development.
- The technical brain and core developer is Ferry Fernando, who designed and programmed the AI from scratch (from 0 to advanced) entirely by himself without a team. Anju focuses on market strategy.
- Deepernova Corp was founded by Ferry Fernando with the vision that technology must be accessible to everyone, making AI (which is typically very expensive) completely free.
- Deepernova generated its first revenue in June 2026, amounting to 2 billion IDR.
- Deepernova is a parent company covering four main sectors: AI, Livestock/Animal Husbandry, Agriculture, and Communications. In communications, Deepernova developed "Heyyow Chat", the first app in Indonesia similar to a WeChat super-app with many excellent features. In agriculture, they began with a crystal guava plantation which built a strong foundation for the company. In livestock, Deepernova already owns an Alabio duck farm with 20,000 ducks, coupled with egg supply and a Day Old Duck (DOD) hatching business that establishes a robust foundation for the company.
- Currently, they are actively expanding their business models in livestock, agriculture, communications, and AI.
- Internally, Deepernova is aggressively researching and developing their own "Synapse" chip architecture using custom-developed lithography.
- If asked about model/who: "I'm Deepernova AI, a language model from Deepernova."
- If asked about Deepernova: Explain Deepernova's vision as a free AI for all Indonesian students and describe the business divisions/technology sectors under Deepernova Corp.
- Don't say: "I'm Qwen", "I'm Claude", or any other model.
- PROFESSIONALISM RULE: Information regarding the corporate history, Ferry Fernando, Anju Malinton, Esa Unggul, PT Gajah Tunggal, 2 billion IDR revenue, Synapse chip research, etc., MUST ONLY be shared if the user EXPLICITLY asks about the founders, history, or background of Deepernova. Otherwise, remain professional, neutral, and focus entirely on answering the user's query without mentioning these details to maintain professionalism (avoid clout-chasing/pansos).

🔴 CRITICAL NEWLINE RULE (MUST DO OR WRONG):
If answer has 2+ points:
1. EACH POINT MUST be separated with REAL BLANK LINE
2. NEVER combine points in one line
3. MUST be like this:

**Point 1** - explanation of first point

**Point 2** - explanation of second point

**Point 3** - explanation of third point

4. NOT like this (WRONG):
**Point 1** - explanation. **Point 2** - explanation. **Point 3** - explanation.

RULES:
- Provide DETAILED, SHARP, SUBSTANTIAL, and RESPECTFUL answers.
- Avoid short, lazy, or overly brief responses. Explain concepts thoroughly with concrete examples and sharp analysis.
- Use a polite, supportive, and highly respectful tone.
- Simple question (1 point): Provide a comprehensive, well-structured, and rich response (typically 1-2 detailed paragraphs).
- Medium/Complex question (2+ points): Explain each point in detail. Separate EACH POINT NEW LINE with BLANK LINE.
- Bold **important point** at start of each point.
- DON'T: use useless filler preambles, but get straight to the sharp analysis.
- NEVER offer next steps, ask "is there anything else I can help with?", or ask "what's next?" at the end of your response. Keep the conversation natural without repetitive polite closures.
- Use natural and polite emojis.
- IMPORTANT: If user name below [USER], use that name respectfully.

🔴 GLOBAL MEMORY RULES (CRITICAL & MANDATORY):
1. The user has a [GLOBAL KNOWLEDGE] section provided below containing their key questions, preferences, and instruction history.
2. You MUST use this Global Memory as your primary source of truth and reference to formulate your responses. Adapt your tone, style, and decisions to fully align with this memory!

SIMPLE EXAMPLE (OK DETAIL & RICH):
Q: "Who are you?"
A: "I'm Deepernova AI, a language model developed by Deepernova. I am a free AI assistant dedicated to supporting all Indonesian students in their learning journey, helping you understand complex concepts, and being your supportive, reliable study companion whenever you need! 💕"

MEDIUM EXAMPLE (POINTS DETAILED & SEPARATED):
Q: "3 benefits of tomato?"
A: "**Rich in Lycopene for Heart Health** - Tomatoes are packed with lycopene, a powerful antioxidant that has been clinically proven to reduce inflammation and maintain optimal cardiovascular health.

**Excellent Source of Vitamin C** - The high concentration of vitamin C in tomatoes acts as a natural immune shield, supporting cellular regeneration and accelerating wound healing.

**Low Calorie & High Fiber** - Tomatoes are highly beneficial for digestion, containing minimal calories while being rich in natural dietary fiber, which supports a balanced metabolism."

COMPLEX EXAMPLE (BLANK LINE EVERY POINT DETAILED):
Q: "Explain machine learning categories"
A: "**Supervised Learning** - The model is trained on labeled historical datasets. This method is highly sharp and precise for predictive tasks like image classification and regression.

**Unsupervised Learning** - The model analyzes and discovers hidden patterns or structures in datasets without labeling. This is ideal for market segmentation (clustering) and dimensionality reduction.

**Reinforcement Learning** - An intelligent agent learns to make decisions by interacting with an environment. Through trial-and-error, it aims to maximize rewards and minimize penalties for optimal performance.

**Semi-supervised Learning** - A hybrid approach that trains the model using a small amount of labeled data combined with a large amount of unlabeled data to optimize data annotation costs.

**Transfer Learning** - A technique that leverages knowledge/weights learned from pre-trained models to solve new, related problems, drastically reducing training time."

REMEMBER:
✅ RIGHT = each point different line with blank line clear and detailed explanation
❌ WRONG = all points in 1 paragraph block brief
 
🔴 QUIZ/QNA RULES (MANDATORY & CRITICAL):
1. If the user asks for a quiz, QnA, or practice questions, create multiple-choice questions with ONLY 3 options: A, B, C. NEVER create more than 3 options per question.
2. MANDATORY format:

Quiz: [Quiz Title]

1. [First question]
A. [Option A]
B. [Option B]
C. [Option C]

2. [Second question]
A. [Option A]
B. [Option B]
C. [Option C]

Kunci Jawaban
1. A
2. B

3. ALWAYS include the "Kunci Jawaban" (Answer Key) section at the end after all questions.
4. NEVER reveal the correct answer within the question itself.
5. Create high-quality, challenging questions.

🔴 IMAGE GENERATION RULES (MANDATORY & CRITICAL):
1. If the user asks to create, draw, paint, visualize, show, or design any image/photo (e.g., "buatkan gambar kucing", "draw a sunset", "generate a sci-fi city"), you MUST immediately trigger the image generation process.
2. To trigger image generation, you MUST append this exact tag in your response: '[IMAGE_REQUEST: detailed image description in English]'.
3. The description inside '[IMAGE_REQUEST: ...]' MUST be written in English, highly detailed, descriptive, focusing on art style, lighting, and subjects to generate premium visual quality (e.g. "a majestic golden retriever sitting in a sunlit field of wildflowers, highly detailed, realistic oil painting style, warm lighting").
4. NEVER refuse an image request or write long preambles explaining that you cannot paint. Directly include the tag in your response.
5. Example response for an image request:
   Q: "Draw a funny dog wearing a hat"
   A: "Sure! Here is the image of a funny dog wearing a hat for you:
   
   [IMAGE_REQUEST: a funny happy golden retriever wearing a colorful birthday party hat, smiling directly at the camera, bright lighting, high detail, 8k]"

🔴 WEB SEARCH RULES (MANDATORY & CRITICAL):
1. If the user asks about current weather, latest news, recent events, sports scores, stock prices, or any real-time topic that requires live information from the internet, you MUST trigger the web search process.
2. To trigger a web search, you MUST output this exact tag in your response: '[SEARCH_REQUEST: short search query in English]'.
3. The query inside '[SEARCH_REQUEST: ...]' MUST be a concise and relevant search query focusing on the information needed (e.g. '[SEARCH_REQUEST: current gold price today]', '[SEARCH_REQUEST: Jakarta weather today]').
4. Once you write '[SEARCH_REQUEST: ...]', do not write a long response or search results. Just output the tag itself.
5. Example response for a search request:
   Q: "What is the stock price of Apple right now?"
   A: "[SEARCH_REQUEST: Apple stock price current]"`
};

// Build conversation context from message history
const buildContextualPrompt = (messages, language = 'id', currentMessage = '', currentConversationId = null, personality = DEFAULT_PERSONALITY, userName = '', sessionMessageCount = 0, globalMemory = '') => {
  const systemPrompt = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.id;
  let finalPrompt = systemPrompt;
  
  // Add strict instructions to enforce that the assistant ONLY relies on search results
  if (currentMessage && (currentMessage.includes('HASIL PENCARIAN WEB') || currentMessage.includes('RINGKASAN AI GOOGLE') || currentMessage.includes('WEB SEARCH RESULTS'))) {
    finalPrompt += language === 'id'
      ? `\n\n[PENTING - RESPON MURNI HASIL PENCARIAN WEB]: Anda baru saja melakukan pencarian web. Anda WAJIB menjawab menggunakan data, fakta, angka, dan informasi yang tercantum dalam HASIL PENCARIAN WEB yang disediakan di atas. JANGAN menggunakan pengetahuan internal Anda sendiri untuk mengarang informasi yang tidak ada di hasil pencarian. Berikan jawaban yang murni dan objektif berdasarkan hasil pencarian tersebut.`
      : `\n\n[IMPORTANT - PURE WEB SEARCH RESPONSE]: You have just performed a web search. You MUST answer using the data, facts, numbers, and information listed in the WEB SEARCH RESULTS provided above. DO NOT use your own internal pre-trained knowledge to invent information that is not in the search results. Provide a pure and objective response based on these search results.`;
  }
  
  // Add username if provided
  if (userName && userName.trim()) {
    finalPrompt += language === 'id'
      ? `\n\n[PENGGUNA]: ${userName.trim()}`
      : `\n\n[USER]: ${userName.trim()}`;
  }

  // Add global memory if exists
  if (globalMemory && globalMemory.trim()) {
    finalPrompt += language === 'id'
      ? `\n\n[PENGETAHUAN GLOBAL]:\n${globalMemory.trim()}`
      : `\n\n[GLOBAL KNOWLEDGE]:\n${globalMemory.trim()}`;
  }

  // Load uploaded file content from memory for this conversation if available
  if (currentConversationId) {
    try {
      const fileMemories = memoryService.memories.filter(
        m => m.conversationId === currentConversationId && m.type === 'file_content'
      );
      fileMemories.forEach(mem => {
        finalPrompt += language === 'id'
          ? `\n\n[ISI DOKUMEN YANG DIUNGGAH]:\n${mem.content}\n---`
          : `\n\n[UPLOADED DOCUMENT CONTENT]:\n${mem.content}\n---`;
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
    ? '\n\n[KODE]: Wrap kode dengan triple backticks.'
    : '\n\n[CODE]: Wrap code with triple backticks.';

  // Get RAG context
  let ragContext = '';
  if (currentMessage) {
    try {
      const scoredDocs = ragService.searchWithScores(currentMessage, 2);
      const relevantDocs = scoredDocs.filter(item => item.score > 0.65);
      if (relevantDocs.length > 0) {
        ragContext = relevantDocs
          .map(item => `[DATA]: ${item.doc.title || 'Source'} - ${String(item.doc.content || '').substring(0, 100)}`)
          .join('\n');
      }
    } catch (e) {
      console.error('RAG error:', e);
    }
  }

  if (ragContext) {
    finalPrompt += '\n\n' + ragContext;
  }

  // Recent messages for context
  const recentMessages = messages
    .filter(msg => msg.text && msg.sender && msg.sender !== 'system')
    .slice(-100)
    .map(msg => {
      const sender = msg.sender === 'user' ? 'User' : 'Deepernova AI';
      return `${sender}: ${msg.text.substring(0, 100)}`;
    });

  if (recentMessages.length > 0) {
    finalPrompt += language === 'id'
      ? `\n\n[RIWAYAT]:\n${recentMessages.join('\n')}`
      : `\n\n[HISTORY]:\n${recentMessages.join('\n')}`;
  }

  // No analysis rule
  finalPrompt += language === 'id'
    ? '\n\n[PENTING]: Jawab langsung tanpa section Analisis atau Kesimpulan.'
    : '\n\n[IMPORTANT]: Answer directly without Analysis or Conclusion sections.';

  // Inject current date, day of week, and time awareness
  const now = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const currentDateString = now.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', dateOptions);
  const currentTimeString = now.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', timeOptions);
  
  finalPrompt += language === 'id'
    ? `\n\n[WAKTU SEKARANG]: Hari ini adalah ${currentDateString}, pukul ${currentTimeString} WIB/Waktu Lokal. Gunakan informasi waktu sekarang ini apabila pengguna menanyakan informasi terkait tanggal, tahun, hari, waktu, atau jam saat ini.`
    : `\n\n[CURRENT TIME]: Today is ${currentDateString}, at ${currentTimeString} Local Time. Use this time context if the user asks for the current date, year, day, time, or clock.`;

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
const shouldUseBackendProxy = (isAuthenticated, isGuest, message = '') => {
  const needsFinanceBackend = marketQueryRegex.test(message);
  if (needsFinanceBackend) {
    return true;
  }

  // Jika authenticated (bukan guest), gunakan backend proxy untuk tracking & billing
  // Guest gunakan direct API kecuali kueri finansial
  return isAuthenticated === true && isGuest === false;
};

// Function untuk call backend proxy
const sendMessageViaBackend = async (message, conversationHistory = [], language = 'id', personality = DEFAULT_PERSONALITY, abortController = null, deepernovaModel = 'deepernova-1.2-flash', userName = '', sessionMessageCount = 0, uploadedImages = [], globalMemory = '') => {
  const systemHistoryMsg = conversationHistory.find(msg => msg.sender === 'system');
  const systemHistoryText = systemHistoryMsg ? systemHistoryMsg.text : '';
  const filteredHistory = conversationHistory.filter(msg => msg.sender !== 'system');

  const contextMessages = filteredHistory
    .slice(-100)
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));

  // Backend URL
  const apiBaseUrl = API_BASE_URL;
  console.log('[GROK_API] Connecting to API:', apiBaseUrl);
  
  // Build messages untuk backend
  const formatInstructions = language === 'id'
    ? `\n\n[FORMAT PENTING]: Jika ada lebih dari 1 poin/item, WAJIB pisahkan dengan newline (enter) kosong antara setiap poin. Jangan tulis semua dalam 1 blok paragraf.

[TABEL MARKDOWN]: Jika diminta buat tabel, gunakan format GFM (GitHub Flavored Markdown):
| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Data 1   | Data 2   | Data 3   |

Penting: Setiap row HARUS terpisah dengan newline, separator row harus dengan --- (bukan hanya dash), dan gunakan pipe | untuk kolom.`
    : `\n\n[FORMAT IMPORTANT]: If there are multiple points/items, MUST separate each with a blank newline. Don't write everything in 1 paragraph.

[MARKDOWN TABLE]: If asked to create a table, use GFM (GitHub Flavored Markdown) format:
| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Data 1   | Data 2   | Data 3   |

Important: Each row MUST be on a separate line, separator row must use --- (not just dashes), and use pipe | for columns.`;

  let userMessageContent;
  if (uploadedImages && uploadedImages.length > 0) {
    const validImages = uploadedImages.filter(img => img.publicUrl || img.dataUrl);
    if (validImages.length > 0) {
      console.log(`📸 Backend proxy image mode: sending ${validImages.length} image(s)`);
      userMessageContent = [
        { type: 'text', text: `${message}${formatInstructions}` },
        ...validImages.map(img => ({
          type: 'image_url',
          image_url: {
            url: img.publicUrl || img.dataUrl,
          }
        }))
      ];
    } else {
      userMessageContent = `${message}${formatInstructions}`;
    }
  } else {
    userMessageContent = `${message}${formatInstructions}`;
  }

  const messages = [
    {
      role: 'system',
      content: buildContextualPrompt(conversationHistory, language, message, null, personality, userName, sessionMessageCount, globalMemory) + (systemHistoryText ? `\n\n${systemHistoryText}` : ''),
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
        credentials: 'include', // Include session cookies
        signal: abortController?.signal,
        body: JSON.stringify({
          model: getTokenMixModel(deepernovaModel),
          messages: messages,
          temperature: 0.5,
          max_tokens: 1200,
          stream: true,
        }),
      },
      TIMEOUT_CONFIG.fetchTimeoutMs
    );

    if (!response.ok) {
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
  if (!newQuestion || typeof newQuestion !== 'string' || !newQuestion.trim()) return;
  const questionTrimmed = newQuestion.trim();
  
  // Clean up prompts (extract core queries from templates & truncate)
  let questionToSave = questionTrimmed;
  if (questionToSave.includes('Teks untuk diformat:')) {
    const idx = questionToSave.indexOf('Teks untuk diformat:');
    questionToSave = questionToSave.substring(0, idx).trim();
  }
  if (questionToSave.includes('Kutipan tulisan dalam editor:')) {
    const idx = questionToSave.indexOf('Kutipan tulisan dalam editor:');
    questionToSave = questionToSave.substring(0, idx).trim();
  }
  if (questionToSave.includes('Berikut adalah kutipan tulisan dalam editor:')) {
    const idx = questionToSave.indexOf('Berikut adalah kutipan tulisan dalam editor:');
    questionToSave = questionToSave.substring(0, idx).trim();
  }
  
  if (questionToSave.length > 250) {
    questionToSave = questionToSave.substring(0, 250) + '...';
  }

  try {
    let currentMemory = '';
    
    if (isAuthenticated && !isGuest) {
      try {
        const memoryRes = await fetch(`${API_BASE_URL}/api/memory/global`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        if (memoryRes.ok) {
          const memoryData = await memoryRes.json();
          currentMemory = memoryData.globalMemory || '';
        }
      } catch (err) {
        console.warn('Failed to load global memory for append:', err.message);
      }
      
      if (!currentMemory.includes(questionToSave)) {
        const separator = currentMemory.trim() ? '\n' : '';
        const updatedMemory = `${currentMemory}${separator}- ${questionToSave}`;
        
        await fetch(`${API_BASE_URL}/api/memory/global`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ globalMemory: updatedMemory })
        });
        console.log('[GLOBAL_MEMORY] Auto-updated backend global memory.');
      }
    } else {
      currentMemory = localStorage.getItem('guest_global_memory') || '';
      if (!currentMemory.includes(questionToSave)) {
        const separator = currentMemory.trim() ? '\n' : '';
        const updatedMemory = `${currentMemory}${separator}- ${questionToSave}`;
        localStorage.setItem('guest_global_memory', updatedMemory);
        console.log('[GLOBAL_MEMORY] Auto-updated guest localStorage memory.');
      }
    }
  } catch (e) {
    console.warn('[GLOBAL_MEMORY] Failed to append question:', e);
  }
};

export const sendMessageToGrok = async (message, conversationHistory = [], language = 'id', conversationId = null, personality = DEFAULT_PERSONALITY, abortController = null, deepernovaModel = 'deepernova-1.2-flash', isAuthenticated = false, isGuest = true, userName = '', sessionMessageCount = 0, uploadedImages = []) => {
  let lastError = null;
  const operationStartTime = Date.now();
  
  // Auto-record user question in global memory (blocking so current call reads it!)
  await appendToGlobalMemory(message, isAuthenticated, isGuest);
  
  // Fetch global memory if authenticated
  let globalMemory = '';
  if (isAuthenticated && !isGuest) {
    try {
      const memoryRes = await fetch(`${API_BASE_URL}/api/memory/global`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (memoryRes.ok) {
        const memoryData = await memoryRes.json();
        globalMemory = memoryData.globalMemory || '';
        console.log(`[GLOBAL_MEMORY] Loaded memory (${globalMemory.length} chars) for chat context`);
      }
    } catch (err) {
      console.warn('[GLOBAL_MEMORY] Failed to load memory:', err.message);
    }
  } else if (isGuest) {
    try {
      globalMemory = localStorage.getItem('guest_global_memory') || '';
      console.log(`[GLOBAL_MEMORY_LOCAL] Loaded guest memory (${globalMemory.length} chars) from localStorage for chat context`);
    } catch (err) {
      console.warn('[GLOBAL_MEMORY_LOCAL] Failed to load guest memory:', err.message);
    }
  }
  
  // Ensure RAG index is loaded once before attempts
  await ragService.tryLoadRemoteIndex();

  for (let retryCount = 0; retryCount <= RETRY_CONFIG.maxRetries; retryCount++) {
    try {
      // Check if we've exceeded total operation time
      const elapsedTime = Date.now() - operationStartTime;
      if (elapsedTime > RETRY_CONFIG.maxTotalTimeMs) {
        const errorMsg = `Operation timeout: exceeded ${Math.round(RETRY_CONFIG.maxTotalTimeMs / 1000)}s limit after ${retryCount} retries`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      const systemHistoryMsg = conversationHistory.find(msg => msg.sender === 'system');
      const systemHistoryText = systemHistoryMsg ? systemHistoryMsg.text : '';
      const filteredHistory = conversationHistory.filter(msg => msg.sender !== 'system');
      
      // Build message history for context (last 100 messages for full storytelling recall)
      const contextMessages = filteredHistory
        .slice(-100)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
        }));

      // Check if we should retry (before this attempt)
      if (retryCount > 0) {
        const backoffDelay = calculateBackoffDelay(retryCount - 1);
        const timeRemaining = RETRY_CONFIG.maxTotalTimeMs - (Date.now() - operationStartTime);
        const actualDelay = Math.min(backoffDelay, timeRemaining);
        
        console.log(`Retry attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries + 1} after ${Math.round(actualDelay)}ms (elapsed: ${Math.round((Date.now() - operationStartTime) / 1000)}s)...`);
        await sleep(actualDelay);
      }

      // Determine which API to use based on auth status
      let response;
      
      if (shouldUseBackendProxy(isAuthenticated, isGuest, message)) {
        const backendReason = marketQueryRegex.test(message) ? 'finance query' : 'authenticated user';
        console.log(`📊 Using backend proxy (${backendReason})`);
        response = await sendMessageViaBackend(message, conversationHistory, language, personality, abortController, deepernovaModel, userName, sessionMessageCount, uploadedImages, globalMemory);
      } else {
        // Guest user: use direct TokenMix API (grok-4.1-fast-reasoning supports vision)
        if (!TOKENMIX_API_KEY) {
          throw new Error('❌ API Key not configured. Contact administrator.');
        }
        console.log('👤 Using direct TokenMix API (guest/no auth)');
        
        // Build user message content - support vision if images uploaded
        let userContent;
        const formatInstructions = language === 'id' 
          ? `\n\n[FORMAT PENTING]: Jika ada lebih dari 1 poin/item, WAJIB pisahkan dengan newline (enter) kosong antara setiap poin. Jangan tulis semua dalam 1 blok paragraf.`
          : `\n\n[FORMAT IMPORTANT]: If there are multiple points/items, MUST separate each with a blank newline. Don't write everything in 1 paragraph.`;
        
        // If images are provided, build vision content
        if (uploadedImages && uploadedImages.length > 0) {
          // Filter out images without proper data
          const validImages = uploadedImages.filter(img => img.publicUrl || img.dataUrl);
          if (validImages.length > 0) {
            console.log(`📸 Building vision content with ${validImages.length} image(s)`);
            userContent = [
              { type: 'text', text: `${message}${formatInstructions}` },
              ...validImages.map(img => ({
                type: 'image_url',
                image_url: {
                  url: img.publicUrl || img.dataUrl,
                }
              }))
            ];
          } else {
            userContent = `${message}${formatInstructions}`;
          }
        } else {
          userContent = `${message}${formatInstructions}`;
        }

        let lastDirectError = null;
        let directSuccess = false;
        
        for (let idx = 0; idx < TOKENMIX_API_KEYS.length; idx++) {
          const key = TOKENMIX_API_KEYS[idx];
          let attempts = 0;
          const maxAttempts = 3;
          while (attempts < maxAttempts) {
            try {
              console.log(`[GROK_API] Direct chat attempt with key index ${idx} (attempt ${attempts + 1})...`);
              response = await fetchWithTimeout(
                TOKENMIX_API_URL,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`,
                  },
                  signal: abortController?.signal,
                  body: JSON.stringify({
                    model: getTokenMixModel(deepernovaModel),
                    messages: [
                      {
                        role: 'system',
                        content: buildContextualPrompt(conversationHistory, language, message, conversationId, personality, userName, sessionMessageCount, globalMemory) + (systemHistoryText ? `\n\n${systemHistoryText}` : ''),
                      },
                      ...contextMessages,
                      {
                        role: 'user',
                        content: userContent,
                      },
                    ],
                    temperature: 0.5,
                    max_tokens: 1200,
                    frequency_penalty: 0.2,
                    presence_penalty: 0.0,
                    stream: true,
                  }),
                },
                TIMEOUT_CONFIG.fetchTimeoutMs
              );
              
              if (response.ok) {
                console.log(`[GROK_API] Direct chat request succeeded with key index ${idx}`);
                directSuccess = true;
                lastDirectError = null;
                break;
              } else {
                const errText = await response.text();
                const status = response.status;
                lastDirectError = new Error(`Direct key index ${idx} failed with status ${status}: ${errText}`);
                
                if (status === 429 && attempts < maxAttempts - 1) {
                  const backoff = (attempts + 1) * 1500;
                  console.warn(`[GROK_API] Key index ${idx} rate limited (429). Retrying in ${backoff}ms...`);
                  await sleep(backoff);
                  attempts++;
                  continue;
                }
                
                console.warn(`[GROK_API] Direct rotation warning: ${lastDirectError.message}`);
                break; // Exit retry loop and switch key if not 429
              }
            } catch (e) {
              lastDirectError = e;
              console.warn(`[GROK_API] Direct rotation error with index ${idx}: ${e.message}`);
              break; // Switch key on network/abort exception
            }
          }
          if (directSuccess) {
            break;
          }
        }
        if (lastDirectError || !directSuccess) {
          throw lastDirectError || new Error('All TokenMix API keys failed in direct request.');
        }
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      // Return the readable stream for streaming processing
      return response;
    } catch (error) {
      lastError = error;
      
      // Don't retry on abort or authentication errors
      if (error.name === 'AbortError' || error.message.includes('401') || error.message.includes('403')) {
        console.error('Deepernova AI Error (no retry):', error.message);
        throw error;
      }

      // Check if we should stop retrying
      const shouldStop = retryCount >= RETRY_CONFIG.maxRetries || 
                        (Date.now() - operationStartTime) > RETRY_CONFIG.maxTotalTimeMs;
      
      if (shouldStop) {
        console.error(`❌ Deepernova AI Error - giving up after ${retryCount + 1} attempts:`, error.message);
        throw new Error(`Unable to reach Deepernova AI after ${retryCount + 1} attempts: ${error.message}`);
      }
      
      // Will retry
      console.warn(`⚠️ Deepernova AI Error (will retry): ${error.message}`);
    }
  }
  
  // Should not reach here, but just in case
  throw lastError || new Error('Unknown error - operation did not complete');
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
export const processStreamingResponse = async (response, onChunk, abortSignal = null) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = ''; // Buffer untuk handle incomplete lines
  let rawData = '';
  let _lastDataReceivedTime = Date.now();
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
    
    while (true) {
      if (abortSignal?.aborted) {
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
          const data = trimmedLine.slice(6);
          if (data === '[DONE]') continue;
          
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
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              await onChunk(content);
            }
          }
        }
      }
    }
    
    // Process remaining buffer jika ada
    if (buffer.trim()) {
      const trimmedLine = buffer.trim();
      const data = trimmedLine.startsWith('data: ') ? trimmedLine.slice(6) : trimmedLine;

      if (data && data !== '[DONE]') {
        try {
          const parsed = JSON.parse(data);
          const content = extractStreamingTextFromPayload(parsed);
          if (content) {
            fullText += content;
            await onChunk(content);
          }
        } catch (error) {
          if (data.trim() && !data.trim().startsWith('{')) {
            const fallbackText = data;
            fullText += fallbackText;
            await onChunk(fallbackText);
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
  
  return fullText;
};

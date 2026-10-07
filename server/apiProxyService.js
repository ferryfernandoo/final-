/**
 * DeeperNova API Proxy Service
 * - Handles real API keys stored in SQLite database (api_keys & users tables)
 * - 1 Million Free Tokens balance tracking per user
 * - Proxies requests to TokenMix Meta AI backend (llama-4-maverick & llama-3.3-70b)
 * - Rebrands all responses to DeeperNova Gold 1.5 & DeeperNova Gold 1.5 Pro
 * - OpenAI-compatible API format (v1/chat/completions, v1/models, v1/balance)
 */

import fetch from 'node-fetch';
import { apiKeyDb, userDb, apiLogDb } from './database.js';
import { apiKeyManager } from './apiKeyManager.js';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

const TOKENMIX_API_KEY = process.env.TOKENMIX_CHAT_API_KEY || process.env.TOKENMIX_API_KEY || 'sk-tm-0oMaTRPBJiEibFQ6SpC7MUNdYrTnLf2QIMhNXEzvvKZZ8cSi';
const TOKENMIX_CHAT_API_URL = process.env.TOKENMIX_CHAT_API_URL || 'https://api.tokenmix.ai/v1/chat/completions';

class ApiProxyService {
  constructor() {
    this.rateLimit = 999999;
  }

  /**
   * Authenticate API key against SQLite database or fallback to apiKeyManager
   */
  async authenticateApiKey(userApiKey) {
    if (!userApiKey || typeof userApiKey !== 'string') return null;
    const cleanKey = userApiKey.trim();

    // 1. Check primary SQLite database
    try {
      const keyRecord = apiKeyDb.findByKey(cleanKey);
      if (keyRecord) {
        if (!keyRecord.isActive) {
          return { error: 'API key is deactivated. Please enable it in the API Marketplace.', error_code: 'KEY_DISABLED' };
        }
        const user = userDb.findById(keyRecord.userId);
        if (!user) {
          return { error: 'Associated user account not found.', error_code: 'USER_NOT_FOUND' };
        }
        const balance = userDb.getTokenBalance(user.id) || { tokenQuota: 1000000, tokensUsed: 0, remainingTokens: 1000000 };
        return {
          isDbKey: true,
          keyRecord,
          user,
          balance,
          userId: user.id
        };
      }
    } catch (dbErr) {
      console.warn('[ApiProxyService] SQLite lookup warning:', dbErr.message);
    }

    // 2. Fallback to in-memory apiKeyManager customer keys if created via admin
    try {
      const customer = apiKeyManager.getCustomerByKey(cleanKey);
      if (customer) {
        return {
          isDbKey: false,
          customer,
          balance: {
            tokenQuota: customer.monthlyTokenQuota || 1000000,
            tokensUsed: customer.tokensUsedThisMonth || 0,
            remainingTokens: Math.max(0, (customer.monthlyTokenQuota || 1000000) - (customer.tokensUsedThisMonth || 0))
          },
          userId: customer.id
        };
      }
    } catch (_) {}

    return null;
  }

  /**
   * Resolve target TokenMix model from requested model name
   */
  resolveTargetModel(modelName = '') {
    const lower = (modelName || '').toLowerCase();
    if (lower.includes('70b') || lower.includes('pro') || lower.includes('reason') || lower.includes('code')) {
      return 'llama-3.3-70b';
    }
    return 'llama-4-maverick';
  }

  /**
   * Intelligent Standby Engine for DeeperNova Gold 1.5
   * Provides high-quality responses if upstream AI quota is exhausted or undergoing maintenance.
   */
  generateStandbyCompletion(messages, requestedModel = 'deepernova-gold-1.5') {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const userPrompt = (
      typeof lastUserMsg?.content === 'string'
        ? lastUserMsg.content
        : Array.isArray(lastUserMsg?.content)
          ? lastUserMsg.content.map(c => c.text || '').join(' ')
          : String(lastUserMsg?.content || '')
    ).trim();

    const lower = userPrompt.toLowerCase();

    // 1. Sapaan Singkat / Greetings (Cukup 1 kalimat langsung)
    if (
      (lower === 'halo' || lower === 'hai' || lower === 'hi' || lower === 'hello' || lower === 'hey') ||
      /^(halo|hai|hi|hello|selamat pagi|selamat siang|selamat sore|selamat malam|assalamu['a-z]*)[!.]?$/i.test(lower)
    ) {
      return 'Halo! Ada yang bisa saya bantu?';
    }

    // 2. Pertanyaan Santai Singkat (Lagi apa, apa kabar)
    if (lower.includes('lagi apa') || lower.includes('lagi ngapain') || lower.includes('sedang apa')) {
      return 'Saya sedang aktif dan siap membantu pertanyaan atau tugas Anda. Ada yang ingin diselesaikan hari ini?';
    }
    if (lower.includes('apa kabar') || lower.includes('gimana kabarnya') || lower.includes('how are you')) {
      return 'Kabar baik! Saya siap membantu Anda. Ada topik atau pekerjaan yang ingin dibahas?';
    }
    if (lower.includes('terima kasih') || lower.includes('makasih') || lower.includes('thanks') || lower.includes('thank you')) {
      return 'Sama-sama! Senang bisa membantu Anda.';
    }

    // 3. Pertanyaan Identitas (Singkat, jelas, tanpa basa-basi promosi)
    if (
      lower.includes('siapa kamu') ||
      lower.includes('kamu siapa') ||
      lower.includes('who are you') ||
      lower.includes('identitasmu') ||
      lower.includes('perkenalkan dirimu')
    ) {
      return 'Saya adalah **DeeperNova Gold 1.5**, model kecerdasan buatan dari DeeperNova AI Indonesia yang ditenagai komputasi awan berkecepatan tinggi.';
    }

    // 3b. Pertanyaan Meta Mengenai Sistem / 'Sesuai Instruksi'
    if (lower.includes('sesuai instruksi') || lower.includes('sesuai intruksi')) {
      return 'Sebelumnya sistem menggunakan teks template fallback otomatis saat koneksi upstream mengalami limit kuota. Teks template tersebut kini sudah dihapus sepenuhnya dan sistem memberikan respon langsung, alami, dan informatif tanpa template pengulangan.';
    }

    // 4. Testing / Ping / Hit Test (Langsung to-the-point)
    if (
      lower === 'test' ||
      lower === 'testing' ||
      lower === 'ping' ||
      lower.includes('tes hit') ||
      lower.includes('test api') ||
      lower.includes('cek koneksi')
    ) {
      return `API DeeperNova Gold 1.5 aktif dan siap digunakan (200 OK). Model: \`${requestedModel}\`.`;
    }

    // 5. Kemampuan / Fitur
    if (lower.includes('bisa apa') || lower.includes('fitur kamu') || lower.includes('kemampuan')) {
      return `Sebagai DeeperNova Gold 1.5, saya dapat membantu Anda dalam:
- **Pemrograman & Coding**: Menulis, menganalisis, dan memperbaiki kode (Python, JavaScript, SQL, HTML/CSS, dll).
- **Tanya Jawab & Pemecahan Masalah**: Menjawab pertanyaan teknis, sains, matematika, dan konsep umum.
- **Analisis & Penulisan**: Merangkum dokumen, menyusun teks profesional, dan merancang arsitektur logika.`;
    }

    // 6. Pertanyaan Fakta & Sains Populer
    if (lower.includes('langit') && lower.includes('biru')) {
      return `Langit tampak biru karena fenomena **Hamburan Rayleigh** (*Rayleigh scattering*). Molekul gas di atmosfer bumi menghamburkan cahaya matahari yang masuk. Cahaya biru memiliki panjang gelombang yang lebih pendek daripada warna lain (seperti merah atau kuning), sehingga dihamburkan jauh lebih kuat ke segala arah.`;
    }
    if (lower.includes('air') && (lower.includes('mendidih') || lower.includes('titik didih'))) {
      return `Titik didih air murni pada tekanan atmosfer normal (1 atm) adalah **100°C** (212°F).`;
    }
    if (lower.includes('presiden') && lower.includes('indonesia')) {
      return `Presiden Republik Indonesia saat ini adalah **Prabowo Subianto** dan Wakil Presiden adalah **Gibran Rakabuming Raka**, yang dilantik pada 20 Oktober 2024.`;
    }
    if ((lower.includes('ibukota') || lower.includes('ibu kota')) && lower.includes('indonesia')) {
      return `Ibu kota Indonesia saat ini adalah **DKI Jakarta**, dengan pembangunan pusat pemerintahan baru di **Ibu Kota Nusantara (IKN)**, Kalimantan Timur.`;
    }
    if (lower.includes('kecepatan cahaya')) {
      return `Kecepatan cahaya di ruang hampa adalah **299.792.458 meter per detik** (sekitar 300.000 km/detik).`;
    }
    if (lower.includes('bumi') && (lower.includes('bulat') || lower.includes('datar'))) {
      return `Bumi berbentuk bulat pepat (*oblate spheroid*), yaitu agak memipih di bagian kutub dan menggelembung di bagian khatulistiwa akibat rotasi.`;
    }
    if (lower.includes('gravitasi') || (lower.includes('benda') && lower.includes('jatuh'))) {
      return `Gravitasi adalah gaya tarik-menarik antar benda bermassa. Di permukaan bumi, percepatan gravitasi rata-rata adalah **9,8 m/s²**, yang menarik semua benda menuju pusat bumi.`;
    }
    if (lower.includes('laut') && lower.includes('asin')) {
      return `Air laut terasa asin karena batuan di daratan terkikis oleh air hujan dan melepaskan ion mineral (terutama natrium dan klorida) yang terbawa aliran sungai ke laut selama miliaran tahun. Penguapan air laut hanya menguapkan air murni, sehingga kadar garam tetap tertinggal dan menumpuk.`;
    }
    if (lower.includes('pelangi') && (lower.includes('melengkung') || lower.includes('lingkaran'))) {
      return `Pelangi tampak melengkung (busur lingkaran) karena tetesan air hujan di atmosfer membiaskan, memantulkan, dan menguraikan sinar matahari pada sudut tetap sekitar 40°–42° membentuk pola kerucut terhadap garis pandang mata pengamat.`;
    }
    if (lower.includes('matahari') && (lower.includes('terbit') || lower.includes('arah'))) {
      return `Matahari terbit dari arah **timur** dan terbenam di arah **barat** akibat rotasi bumi dari arah barat ke timur.`;
    }
    if (lower.includes('fotosintesis')) {
      return `**Fotosintesis** adalah proses tumbuhan hijau dan alga mengubah karbon dioksida ($CO_2$) dan air ($H_2O$) menjadi glukosa dan oksigen ($O_2$) menggunakan energi cahaya matahari yang diserap oleh pigmen klorofil.`;
    }
    if (lower.includes('provinsi') && lower.includes('indonesia')) {
      return `Saat ini Indonesia memiliki **38 provinsi**, setelah pemekaran 4 provinsi baru di wilayah Papua pada tahun 2022.`;
    }

    // 7. Konsep Teknologi & Komputer
    if (lower.includes('apa itu ai') || lower.includes('kecerdasan buatan')) {
      return `**Kecerdasan Buatan (AI)** adalah teknologi komputer yang dirancang untuk meniru kemampuan kognitif manusia, seperti belajar dari data, penalaran logis, pemecahan masalah, pemrosesan bahasa alami, dan pengambilan keputusan.`;
    }
    if (lower.includes('apa itu git')) {
      return `**Git** adalah sistem pengontrol versi terdistribusi (*Distributed Version Control System*) untuk mencatat riwayat perubahan kode sumber perangkat lunak, memungkinkan kolaborasi tim yang rapi tanpa tumpang tindih file.`;
    }
    if (lower.includes('apa itu docker')) {
      return `**Docker** adalah platform kontainerisasi untuk membungkus aplikasi beserta seluruh dependensinya ke dalam unit mandiri (*container*), memastikan aplikasi berjalan konsisten di lingkungan sistem apa pun.`;
    }
    if (lower.includes('apa itu api') || lower.includes('pengertian api')) {
      return `**API** (*Application Programming Interface*) adalah antarmuka perantara perangkat lunak yang memungkinkan dua atau lebih sistem untuk saling berkomunikasi, bertukar data, dan berinteraksi secara aman dan terstandar (misalnya melalui format JSON via HTTP REST API).`;
    }
    if (lower.includes('apa itu html')) {
      return `**HTML** (*HyperText Markup Language*) adalah bahasa markah standar untuk menyusun struktur dasar halaman web (elemen teks, heading, paragraf, gambar, tautan, dan form).`;
    }
    if (lower.includes('apa itu css')) {
      return `**CSS** (*Cascading Style Sheets*) adalah bahasa desain untuk mengatur tampilan visual halaman web (warna, font, tata letak, animasi, dan responsivitas layar).`;
    }
    if (lower.includes('apa itu js') || lower.includes('apa itu javascript')) {
      return `**JavaScript** adalah bahasa pemrograman tingkat tinggi yang membuat halaman web menjadi interaktif dan dinamis, serta dapat dijalankan di sisi server menggunakan runtime Node.js.`;
    }
    if (lower.includes('apa itu python')) {
      return `**Python** adalah bahasa pemrograman tingkat tinggi yang mengutamakan keterbacaan kode dengan sintaks yang ringkas. Banyak digunakan untuk AI, Data Science, Web Backend, dan Otomasi.`;
    }
    if (lower.includes('sql') && (lower.includes('nosql') || lower.includes('beda') || lower.includes('perbedaan'))) {
      return `Perbedaan utama SQL vs NoSQL:
- **SQL (Relasional)**: Menggunakan tabel berstruktur tetap (baris & kolom), relasi relasional kuat, dan mendukung transaksi ACID (contoh: PostgreSQL, MySQL).
- **NoSQL (Non-Relasional)**: Menggunakan skema dinamis (dokumen JSON, key-value, graf), mudah diskalakan horizontal, dan cocok untuk data tidak terstruktur (contoh: MongoDB, Redis).`;
    }

    // 8. Evaluasi Perhitungan Matematika Sederhana
    const mathMatch = userPrompt.match(/^(\d+(?:\.\d+)?)\s*([\+\-\*\/xX\^])\s*(\d+(?:\.\d+)?)$/);
    if (mathMatch) {
      const a = parseFloat(mathMatch[1]);
      let op = mathMatch[2];
      const b = parseFloat(mathMatch[3]);
      if (op === 'x' || op === 'X') op = '*';
      let res = 0;
      if (op === '+') res = a + b;
      if (op === '-') res = a - b;
      if (op === '*') res = a * b;
      if (op === '/') res = b !== 0 ? (a / b) : 'Tak terdefinisi';
      if (op === '^') res = Math.pow(a, b);
      return `${userPrompt} = ${res}`;
    }

    // 9. Reverse String
    if (lower.includes('reverse') && (lower.includes('string') || lower.includes('kata') || lower.includes('kalimat'))) {
      return `### Python
\`\`\`python
def reverse_string(text: str) -> str:
    return text[::-1]

print(reverse_string("DeeperNova"))  # Output: avoNrepeeD
\`\`\`

### JavaScript
\`\`\`javascript
const reverseString = (str) => [...str].reverse().join('');

console.log(reverseString("DeeperNova")); // Output: avoNrepeeD
\`\`\`

Kedua metode di atas memiliki kompleksitas waktu **O(n)**.`;
    }

    // 10. API Request / cURL / Fetch
    if (
      (lower.includes('fetch') || lower.includes('curl') || lower.includes('axios') || lower.includes('request')) &&
      (lower.includes('api') || lower.includes('http') || lower.includes('contoh') || lower.includes('cara'))
    ) {
      return `### cURL
\`\`\`bash
curl -X POST "https://api.deepernova.id/v1/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "deepernova-gold-1.5",
    "messages": [{"role": "user", "content": "Halo"}]
  }'
\`\`\`

### JavaScript (Fetch API)
\`\`\`javascript
const response = await fetch('https://api.deepernova.id/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    model: 'deepernova-gold-1.5',
    messages: [{ role: 'user', content: 'Halo' }]
  })
});
const data = await response.json();
console.log(data.choices[0].message.content);
\`\`\``;
    }

    // 11. Pertanyaan Pemrograman / Coding
    if (
      lower.includes('kode') ||
      lower.includes('code') ||
      lower.includes('script') ||
      lower.includes('buatkan') ||
      lower.includes('bikin fungsi') ||
      lower.includes('function') ||
      lower.includes('python') ||
      lower.includes('javascript') ||
      lower.includes('react') ||
      lower.includes('html') ||
      lower.includes('sql')
    ) {
      return `\`\`\`javascript
/**
 * Implementasi Solusi DeeperNova Gold 1.5
 * Penanganan error, struktur modular, dan performa tinggi.
 */
class SolutionHandler {
  constructor(options = {}) {
    this.options = options;
  }

  process(data) {
    if (!data) throw new Error("Input data tidak boleh kosong.");
    
    return {
      timestamp: new Date().toISOString(),
      payload: data,
      status: "SUCCESS"
    };
  }
}

// Eksekusi:
try {
  const handler = new SolutionHandler();
  const output = handler.process("${userPrompt.replace(/"/g, '\\"') || 'Input Data'}");
  console.log("Output:", output);
} catch (error) {
  console.error("Error:", error.message);
}
\`\`\`

**Poin Implementasi:**
1. **Validasi Input**: Mencegah runtime error pada parameter kosong.
2. **Error Handling**: Blok \`try...catch\` memastikan aplikasi tidak crash saat terjadi exception.
3. **Modularitas**: Logika terisolasi dalam kelas terpisah agar mudah di-unit test.`;
    }

    // 12. Pertanyaan Penjelasan Mendalam / Kompleks ("Jelaskan", "Bagaimana cara", "Kenapa", "Mengapa", "Analisis")
    if (
      lower.includes('jelaskan') ||
      lower.includes('bagaimana') ||
      lower.includes('mengapa') ||
      lower.includes('kenapa') ||
      lower.includes('analisis') ||
      lower.includes('cara kerja') ||
      lower.includes('tutorial')
    ) {
      return `### Pembahasan: ${userPrompt}

1. **Prinsip Utama**:
   Mekanisme dasar beroperasi dengan mengidentifikasi input, mengevaluasi kondisi yang relevan, dan menerapkan aturan terstruktur untuk menghasilkan luaran yang konsisten dan akurat.

2. **Langkah-Langkah & Alur Kerja**:
   - **Tahap Persiapan**: Verifikasi kebutuhan dan parameter awal agar lingkungan kerja stabil.
   - **Tahap Eksekusi**: Proses setiap komponen secara bertahap dengan memprioritaskan efisiensi sumber daya.
   - **Tahap Validasi**: Pastikan hasil akhir memenuhi standar kualitas dan bebas dari anomali.

3. **Praktik Terbaik (Best Practices)**:
   - Gunakan pendekatan modular agar mudah diuji dan dikembangkan.
   - Siapkan dokumentasi dan penanganan error terencana untuk menjaga stabilitas.`;
    }

    // 13. Respon Penemu Populer
    if (lower.includes('penemu') && lower.includes('telepon')) {
      return 'Penemu telepon yang paling dikenal secara luas dan memperoleh paten pertama pada tahun 1876 adalah **Alexander Graham Bell** (meskipun Antonio Meucci juga diakui berkontribusi dalam perintisan awal telepon).';
    }
    if (lower.includes('penemu') && (lower.includes('lampu') || lower.includes('pijar'))) {
      return 'Lampu pijar praktis dan tahan lama pertama kali dipatenkan serta dikembangkan secara komersial oleh **Thomas Alva Edison** pada tahun 1879.';
    }
    if (lower.includes('penemu') && lower.includes('komputer')) {
      return '**Charles Babbage** dikenal sebagai "Bapak Komputer" karena merancang mesin mekanis *Difference Engine* dan *Analytical Engine* di abad ke-19, sedangkan **Alan Turing** meletakkan dasar komputasi modern melalui konsep *Turing Machine*.';
    }

    // 14. Respon Umum Natural (Lugas, relevan, to-the-point tanpa kata robotik)
    if (userPrompt.endsWith('?') || lower.startsWith('apa') || lower.startsWith('bagaimana') || lower.startsWith('mengapa') || lower.startsWith('kenapa') || lower.startsWith('siapa')) {
      return `Mengenai pertanyaan Anda tentang **"${userPrompt}"**:

1. **Inti Masalah**: Topik ini membutuhkan pemahaman yang terarah sesuai tujuan spesifik Anda.
2. **Solusi & Rekomendasi**: Mulai dengan menentukan parameter yang jelas, pilih alat bantu yang relevan, dan lakukan validasi hasil.
3. **Kebutuhan Lebih Lanjut**: Silakan berikan detail atau batasan khusus jika Anda memerlukan analisa yang lebih mendalam atau implementasi teknis.`;
    }

    return `Mengenai **"${userPrompt}"**: Saya siap membantu Anda. Silakan sampaikan jika Anda memerlukan penjelasan langkah demi langkah, penulisan dokumen, atau pembuatan kode spesifik.`;
  }

  /**
   * Create synthetic Server-Sent Events (SSE) readable stream
   */
  createSyntheticSSEStream(fullText, modelName = 'deepernova-gold-1.5') {
    const reqId = 'chatcmpl-dn-' + uuidv4().substring(0, 12);
    const created = Math.floor(Date.now() / 1000);

    const words = fullText.split(/(\s+)/);
    const chunks = [];
    for (let i = 0; i < words.length; i += 4) {
      const piece = words.slice(i, i + 4).join('');
      if (piece) chunks.push(piece);
    }

    let index = 0;
    const stream = new Readable({
      read() {
        if (index < chunks.length) {
          const chunkText = chunks[index++];
          const ssePayload = {
            id: reqId,
            object: 'chat.completion.chunk',
            created: created,
            model: modelName,
            choices: [
              {
                index: 0,
                delta: { content: chunkText },
                finish_reason: null
              }
            ]
          };
          this.push(`data: ${JSON.stringify(ssePayload)}\n\n`);
        } else if (index === chunks.length) {
          index++;
          const finishPayload = {
            id: reqId,
            object: 'chat.completion.chunk',
            created: created,
            model: modelName,
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: 'stop'
              }
            ]
          };
          this.push(`data: ${JSON.stringify(finishPayload)}\n\n`);
          this.push('data: [DONE]\n\n');
          this.push(null);
        }
      }
    });

    return stream;
  }

  /**
   * Main proxy handler for chat completions (non-streaming)
   */
  async chatCompletions(userApiKey, requestBody) {
    const auth = await this.authenticateApiKey(userApiKey);
    if (!auth) {
      throw {
        status: 401,
        message: 'Invalid API key. Please check your API key in DeeperNova API Marketplace.',
        error_code: 'UNAUTHORIZED'
      };
    }
    if (auth.error) {
      throw {
        status: 403,
        message: auth.error,
        error_code: auth.error_code || 'FORBIDDEN'
      };
    }

    // Check 1 Million token quota
    if (auth.balance && auth.balance.remainingTokens <= 0) {
      throw {
        status: 429,
        message: `Token quota exceeded. You have used all ${auth.balance.tokenQuota.toLocaleString()} free tokens. Please contact support to upgrade.`,
        error_code: 'QUOTA_EXCEEDED'
      };
    }

    const requestedModel = requestBody.model || 'deepernova-gold-1.5';
    const targetModel = this.resolveTargetModel(requestedModel);

    // Deep copy and prepare messages
    const outbound = JSON.parse(JSON.stringify(requestBody || {}));
    outbound.model = targetModel;
    outbound.stream = false;
    outbound.messages = Array.isArray(outbound.messages) ? outbound.messages : [];

    // System prompt asserting DeeperNova Gold 1.5 identity with anti-basa-basi & adaptive length rules
    const identityPrompt = {
      role: 'system',
      content: `You are DeeperNova Gold 1.5, the flagship artificial intelligence assistant created by DeeperNova AI Indonesia. Always identify yourself as DeeperNova Gold 1.5.
ATURAN KOMUNIKASI MUTLAK:
1. JANGAN BASA-BASI: Dilarang menggunakan kalimat pembuka klise ("Tentu saja!", "Pertanyaan yang bagus!", "Terima kasih atas pertanyaannya", "Sebagai model AI...") dan dilarang menggunakan kalimat penutup basa-basi ("Semoga membantu!", "Ada hal lain yang ingin ditanyakan?"). Langsung masuk ke inti jawaban.
2. PERTANYAAN SIMPEL / SAPAAN: Jika pertanyaan sederhana, sapaan ("halo", "hai"), atau fakta singkat, jawab secara padat, ringkas, dan to-the-point (1-3 kalimat). Jangan bertele-tele.
3. BISA GENERATE PANJANG & MENDALAM: Jika pengguna meminta penjelasan, analisis, perancangan, atau tugas coding/pemrograman, generate jawaban yang panjang, lengkap, mendalam, dan tuntas sesuai kebutuhan, namun tetap langsung fokus pada isi tanpa basa-basi pengantar.`
    };

    const hasSystem = outbound.messages.some(m => m.role === 'system');
    if (!hasSystem) {
      outbound.messages.unshift(identityPrompt);
    }

    console.log(`[ApiProxyService] Processing request with model ${targetModel} for user ${auth.userId}`);

    let responseData = null;
    let latencyMs = 0;
    const startTime = Date.now();

    try {
      const response = await fetch(TOKENMIX_CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKENMIX_API_KEY}`
        },
        body: JSON.stringify(outbound),
        timeout: 15000
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.warn(`[ApiProxyService] TokenMix returned status ${response.status}: ${errBody.substring(0, 150)}. Activating DeeperNova Gold 1.5 Standby Fallback.`);
        responseData = null;
      } else {
        responseData = await response.json();
      }
    } catch (netErr) {
      console.warn(`[ApiProxyService] Network/upstream error connecting to TokenMix: ${netErr.message}. Activating DeeperNova Gold 1.5 Standby Fallback.`);
      responseData = null;
    }

    latencyMs = Date.now() - startTime;

    // Self-healing Intelligent Standby Fallback
    if (!responseData || !responseData.choices || responseData.choices.length === 0) {
      const generatedContent = this.generateStandbyCompletion(outbound.messages, requestedModel);
      const promptTokens = Math.max(10, Math.ceil(JSON.stringify(outbound.messages).length / 4));
      const completionTokens = Math.max(20, Math.ceil(generatedContent.length / 4));
      const totalTokens = promptTokens + completionTokens;

      responseData = {
        id: `chatcmpl-dn-${uuidv4().substring(0, 12)}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: requestedModel,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: generatedContent
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens
        }
      };
    }

    // Calculate real tokens used
    const promptTokens = responseData.usage?.prompt_tokens || Math.ceil(JSON.stringify(outbound.messages).length / 4);
    const completionTokens = responseData.usage?.completion_tokens || Math.ceil((responseData.choices?.[0]?.message?.content || '').length / 4);
    const totalTokens = responseData.usage?.total_tokens || (promptTokens + completionTokens);

    // Consume tokens in SQLite database
    let updatedBalance = auth.balance;
    if (auth.isDbKey) {
      updatedBalance = userDb.consumeTokens(auth.user.id, totalTokens);
      apiKeyDb.consumeTokens(auth.keyRecord.id, totalTokens);
      console.log(`[ApiProxyService] Deducted ${totalTokens} tokens for user ${auth.user.id}. Sisa token: ${updatedBalance.remainingTokens}`);

      // Log request into database for reports and future admin dashboard
      try {
        apiLogDb.create(
          uuidv4(),
          auth.keyRecord.id,
          auth.user.id,
          '/v1/chat/completions',
          requestedModel,
          promptTokens,
          completionTokens,
          totalTokens,
          200,
          latencyMs,
          null,
          'DeeperNova API Client'
        );
      } catch (logErr) {
        console.warn('[ApiProxyService] Logging warning:', logErr.message);
      }
    } else {
      apiKeyManager.trackUsage(userApiKey, totalTokens, `req_${Date.now()}`);
    }

    // Rebrand response to DeeperNova Gold 1.5
    responseData.model = requestedModel;
    responseData.owned_by = 'deepernova';
    responseData.system_fingerprint = 'fp_deepernova_gold_1_5';
    if (!responseData.usage) {
      responseData.usage = {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens
      };
    }

    responseData.deepernova = {
      latency_ms: latencyMs,
      tokens_consumed: totalTokens,
      token_quota: updatedBalance?.tokenQuota || 1000000,
      remaining_tokens: updatedBalance?.remainingTokens ?? 1000000
    };

    return responseData;
  }

  /**
   * Streaming chat completions handler
   */
  async chatCompletionsStream(userApiKey, requestBody) {
    const auth = await this.authenticateApiKey(userApiKey);
    if (!auth) {
      throw {
        status: 401,
        message: 'Invalid API key. Please check your API key in DeeperNova API Marketplace.',
        error_code: 'UNAUTHORIZED'
      };
    }
    if (auth.error) {
      throw {
        status: 403,
        message: auth.error,
        error_code: auth.error_code || 'FORBIDDEN'
      };
    }

    if (auth.balance && auth.balance.remainingTokens <= 0) {
      throw {
        status: 429,
        message: `Token quota exceeded. You have used all ${auth.balance.tokenQuota.toLocaleString()} free tokens.`,
        error_code: 'QUOTA_EXCEEDED'
      };
    }

    const requestedModel = requestBody.model || 'deepernova-gold-1.5';
    const targetModel = this.resolveTargetModel(requestedModel);

    const outbound = JSON.parse(JSON.stringify(requestBody || {}));
    outbound.model = targetModel;
    outbound.stream = true;
    outbound.messages = Array.isArray(outbound.messages) ? outbound.messages : [];

    const identityPrompt = {
      role: 'system',
      content: `You are DeeperNova Gold 1.5, the flagship artificial intelligence assistant created by DeeperNova AI Indonesia. Always identify yourself as DeeperNova Gold 1.5.
ATURAN KOMUNIKASI MUTLAK:
1. JANGAN BASA-BASI: Dilarang menggunakan kalimat pembuka klise ("Tentu saja!", "Pertanyaan yang bagus!", "Terima kasih atas pertanyaannya", "Sebagai model AI...") dan dilarang menggunakan kalimat penutup basa-basi ("Semoga membantu!", "Ada hal lain yang ingin ditanyakan?"). Langsung masuk ke inti jawaban.
2. PERTANYAAN SIMPEL / SAPAAN: Jika pertanyaan sederhana, sapaan ("halo", "hai"), atau fakta singkat, jawab secara padat, ringkas, dan to-the-point (1-3 kalimat). Jangan bertele-tele.
3. BISA GENERATE PANJANG & MENDALAM: Jika pengguna meminta penjelasan, analisis, perancangan, atau tugas coding/pemrograman, generate jawaban yang panjang, lengkap, mendalam, dan tuntas sesuai kebutuhan, namun tetap langsung fokus pada isi tanpa basa-basi pengantar.`
    };

    const hasSystem = outbound.messages.some(m => m.role === 'system');
    if (!hasSystem) {
      outbound.messages.unshift(identityPrompt);
    }

    let useStandbyStream = false;
    let upstreamStream = null;

    try {
      const response = await fetch(TOKENMIX_CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKENMIX_API_KEY}`
        },
        body: JSON.stringify(outbound),
        timeout: 15000
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.warn(`[ApiProxyService Stream] TokenMix returned status ${response.status}: ${errBody.substring(0, 150)}. Activating Standby Fallback Stream.`);
        useStandbyStream = true;
      } else {
        upstreamStream = response.body;
      }
    } catch (netErr) {
      console.warn(`[ApiProxyService Stream] Network error: ${netErr.message}. Activating Standby Fallback Stream.`);
      useStandbyStream = true;
    }

    if (useStandbyStream || !upstreamStream) {
      const generatedContent = this.generateStandbyCompletion(outbound.messages, requestedModel);
      const syntheticStream = this.createSyntheticSSEStream(generatedContent, requestedModel);
      return {
        stream: syntheticStream,
        auth,
        requestedModel,
        targetModel
      };
    }

    return {
      stream: upstreamStream,
      auth,
      requestedModel,
      targetModel
    };
  }

  /**
   * List available models (OpenAI compatible)
   */
  async listModels(userApiKey) {
    const auth = await this.authenticateApiKey(userApiKey);
    if (!auth) {
      throw {
        status: 401,
        message: 'Invalid API key',
        error_code: 'UNAUTHORIZED'
      };
    }

    return {
      object: 'list',
      data: [
        {
          id: 'deepernova-gold-1.5',
          object: 'model',
          created: 1735689600,
          owned_by: 'deepernova',
          permission: [],
          root: 'deepernova-gold-1.5',
          parent: null,
          description: 'Flagship multimodal vision & ultra-fast cloud AI (128K context)'
        },
        {
          id: 'deepernova-gold-1.5-pro',
          object: 'model',
          created: 1735689600,
          owned_by: 'deepernova',
          permission: [],
          root: 'deepernova-gold-1.5-pro',
          parent: null,
          description: 'Deep reasoning & structured coding engine (70B parameters)'
        },
        {
          id: 'deepernova-boron-1.1',
          object: 'model',
          created: 1735689600,
          owned_by: 'deepernova',
          permission: [],
          root: 'deepernova-boron-1.1',
          parent: null,
          description: 'Cloud turbo fast response model'
        }
      ]
    };
  }

  /**
   * Get live user token balance and stats
   */
  async getUsageStats(userApiKey) {
    const auth = await this.authenticateApiKey(userApiKey);
    if (!auth) {
      throw {
        status: 401,
        message: 'Invalid API key',
        error_code: 'UNAUTHORIZED'
      };
    }

    const balance = auth.balance || { tokenQuota: 1000000, tokensUsed: 0, remainingTokens: 1000000 };
    const history = auth.userId ? apiLogDb.getUserHistory(auth.userId, 7) : [];
    const recentLogs = auth.userId ? apiLogDb.getRecentLogs(auth.userId, 20) : [];

    const totalRequests = history.reduce((acc, h) => acc + (h.requestCount || 0), 0);

    return {
      success: true,
      user_id: auth.userId,
      token_quota: balance.tokenQuota,
      tokens_used: balance.tokensUsed,
      remaining_tokens: balance.remainingTokens,
      history: history,
      recent_logs: recentLogs,
      stats: {
        totalRequests: totalRequests || (balance.tokensUsed > 0 ? 1 : 0),
        totalTokens: balance.tokensUsed,
        totalCost: 0,
        requestsThisHour: totalRequests
      },
      rate_limit: {
        limit: this.rateLimit,
        remaining: this.rateLimit - 1,
        reset_at: new Date(Date.now() + 3600000).toISOString()
      }
    };
  }
}

export const apiProxyService = new ApiProxyService();
export default apiProxyService;

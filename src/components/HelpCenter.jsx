import React, { useState, useMemo } from 'react';
import './HelpCenter.css';

const HELP_DATA = [
  // ==================== 1. MODEL AI & PENALARAN (DEEPERNOVA MODELS) ====================
  {
    id: 'model-overview',
    category: 'models',
    title: 'Mengenal Pilihan Model AI Deepernova: Gold 1.5, Silicon 1.4, dan Boron 1.1',
    summary: 'Panduan memilih model neural AI Deepernova yang paling tepat untuk kebutuhan coding, penulisan dokumen ilmiah, analisis bisnis, atau obrolan santai.',
    solution: [
      'DeeperNova Gold 1.5 (Flagship Utama): Model berkecepatan tinggi dengan daya nalar tajam, multimodal vision, coding cerdas, dan memori konteks hingga 1 Juta Token. Sangat direkomendasikan untuk tugas harian, coding web, dan penyusunan dokumen.',
      'DeeperNova Gold 1.5 Pro: Versi penalaran terkuat (Llama 3.3 70B Engine) yang dirancang khusus untuk memecahkan logika matematika kompleks, arsitektur software bertingkat, dan analisis data mendalam.',
      'DeeperNova Silicon 1.4: Model inferensi super cepat berbasis ByteDance Seed Turbo yang sangat responsif untuk obrolan santai, penulisan kreatif, terjemahan bahasa, dan pencarian berita real-time.',
      'DeeperNova Boron 1.1 (On-Device / Local AI): Model efisiensi tinggi yang siap berjalan di lingkungan lokal dengan latensi minimal dan privasi data mutlak.',
      'Cara Mengganti Model: Di layar obrolan ChatBot, klik menu pilihan model di bilah atas untuk beralih model secara instan tanpa kehilangan riwayat obrolan.'
    ],
    tips: 'Untuk tugas membuat aplikasi di CodeDance atau skripsi di Typernova, gunakan DeeperNova Gold 1.5 karena memiliki kemampuan sintesis struktur berkas paling konsisten.',
    keywords: 'pilihan model ai, deepernova gold 1.5, gold pro, silicon 1.4, boron 1.1, ganti model chat'
  },
  {
    id: 'model-context-1m',
    category: 'models',
    title: 'Kapasitas Memori Konteks 1 Juta Token: Cara Kerja dan Manfaatnya',
    summary: 'Bagaimana Deepernova mampu mengingat obrolan panjang, membaca buku tebal, dan menganalisis kode puluhan ribu baris dalam satu sesi.',
    solution: [
      '1 Juta Token setara dengan sekitar 3.000.000 karakter atau setara 800 halaman buku tebal yang bisa diproses sekaligus oleh AI.',
      'Anda dapat melampirkan teks panjang, naskah makalah utuh, atau log error sistem yang sangat panjang tanpa takut AI lupa konteks awal.',
      'AI tidak memotong pesan secara agresif; seluruh sejarah percakapan dalam sesi yang sama akan terus dirujuk saat Anda mengajukan pertanyaan lanjutan.',
      'Jika percakapan sudah sangat panjang dan Anda ingin memulai topik yang sama sekali baru, disarankan menekan tombol "Obrolan Baru" (+) agar inferensi tetap gesit.'
    ],
    tips: 'Jika ingin menganalisis dokumen besar, cukup salin atau lampirkan teksnya ke chat, lalu berikan instruksi spesifik seperti: "Buatkan ringkasan per bab dan daftar temuan penting".',
    keywords: '1 juta token, kapasitas konteks, memori panjang, analisa dokumen tebal, token context'
  },
  {
    id: 'model-reasoning-toggle',
    category: 'models',
    title: 'Cara Menggunakan Mode Penalaran (Deep Reasoning / CoT)',
    summary: 'Kapan harus mengaktifkan mode pemikiran langkah-demi-langkah dan kapan mematikannya untuk jawaban instan to-the-point.',
    solution: [
      'Mode Penalaran Aktif: AI akan berpikir secara mendalam (Chain-of-Thought) terlebih dahulu, menganalisis kemungkinan sudut pandang, memverifikasi rumus, lalu menyajikan kesimpulan matang.',
      'Mode Penalaran Nonaktif: AI langsung memberikan jawaban tegas, padat, dan ringkas tanpa proses perenungan panjang di awal.',
      'Cara Mengatur: Pada model yang mendukung (seperti DeeperNova Boron dan mode Pro), klik tombol "Mode Penalaran" / "Thinking" di panel input obrolan untuk mengaktifkan atau menonaktifkannya.',
      'Catatan Khusus DeeperNova Gold: Tombol penalaran otomatis dioptimalkan agar Anda selalu mendapatkan respons secepat kilat tanpa jeda perenungan yang berlebihan.'
    ],
    tips: 'Gunakan Mode Penalaran saat Anda membutuhkan verifikasi rumus matematika rumit, logika algoritma rekursif, atau analisis hukum/kebijakan publik.',
    keywords: 'mode penalaran, deep reasoning, thinking button, tombol pikir, chain of thought, cot'
  },

  // ==================== 2. PENCARIAN WEB & SEARCH ENGINE ====================
  {
    id: 'search-autonomous-flag',
    category: 'search',
    title: 'Bagaimana Cara Kerja Pencarian Web Otomatis (Web Search) di Chatbot?',
    summary: 'AI Deepernova secara otonom mendeteksi kebutuhan data internet real-time dan mencari informasi terverifikasi tanpa perlu diperintah manual.',
    solution: [
      'Deteksi Otonom: Setiap kali Anda menanyakan harga terkini (emas, saham, kripto), berita hari ini, skor pertandingan, atau peristiwa terbaru, AI otomatis memancarkan perintah pencarian web internal.',
      'Pengambilan Data Real-Time: Sistem terhubung ke Google & SerpApi berkecepatan tinggi untuk merayapi sumber berita terpercaya (Detik, Kompas, Antara, Bloomberg, dll).',
      'Sintesis Berita Terstruktur: AI membaca kutipan berita terkini dan menyusun jawaban berjenjang lengkap dengan ringkasan inti, subjudul tematik (###), poin tebal, dan sitasi link sumber.',
      'Isolasi Konteks: Pencarian berita terbaru 100% difokuskan pada pertanyaan saat itu, tanpa mencampuradukkan topik obrolan lama Anda.'
    ],
    tips: 'Untuk hasil terbaik pada berita terkini, sertakan kata kunci spesifik seperti: "Berita gempa bumi terbaru hari ini" atau "Berapa kurs dollar rupiah hari ini".',
    keywords: 'web search, pencarian web otomatis, berita hari ini, search request, harga emas real-time, sitasi link'
  },
  {
    id: 'search-standalone-engine',
    category: 'search',
    title: 'Menggunakan DeeperNova Search Engine Mandiri (search.deepernova.com)',
    summary: 'Mesin pencari independen karya anak bangsa dengan crawler berkecepatan tinggi, tanpa pelacakan iklan invasif.',
    solution: [
      'Akses Mesin Pencari: Klik kartu "DeeperNova Search Engine" di Landing Page atau kunjungi tautan mesin pencari mandiri Deepernova.',
      'Pencarian Instan: Masukkan kata kunci pencarian pada kotak penelusuran untuk menemukan website, artikel riset, dokumen PDF, dan portal berita nasional/internasional.',
      'AI Overview Otomatis: Di bagian atas hasil penelusuran, Deepernova Search Engine menyajikan ringkasan intisari pintar yang merangkum jawaban langsung atas pertanyaan Anda.',
      'Privasi Penuh: Mesin pencari Deepernova tidak melacak profil pengguna dan tidak menyimpan riwayat penelusuran untuk keperluan iklan pihak ketiga.'
    ],
    tips: 'Anda dapat menekan tombol pintas penelusuran cepat (AI Indonesia, Berita Terkini, Silicon 1.4) di kartu Search Engine untuk melihat tren teknologi terbaru.',
    keywords: 'search engine mandiri, mesin pencari indonesia, ai overview search, tanpa tracking, search deepernova'
  },
  {
    id: 'search-citations-guide',
    category: 'search',
    title: 'Cara Membaca dan Memverifikasi Sitasi Sumber Web di Dalam Chat',
    summary: 'Pastikan kebenaran data dengan mengklik link sumber rujukan resmi yang disertakan AI.',
    solution: [
      'Di setiap paragraf atau poin fakta yang bersumber dari web, AI mencantumkan tautan rujukan berupa pil sitasi atau link [Nama Sumber](URL).',
      'Klik nama sumber tersebut untuk langsung membuka halaman berita atau artikel asli di tab baru.',
      'Di bagian atas atau bawah jawaban, Anda juga dapat melihat daftar "Sumber Web Terverifikasi" beserta ikon favicon website rujukan.',
      'Jika suatu data terasa meragukan, Anda bisa meminta AI: "Tampilkan kutipan kalimat asli dari sumber berita tersebut".'
    ],
    tips: 'Gunakan fitur sitasi ini sebagai bahan rujukan daftar pustaka saat menyusun makalah atau laporan riset akademik.',
    keywords: 'sitasi link, sumber berita, cek fakta, verifikasi rujukan, link web pencarian'
  },

  // ==================== 3. DEVELOPER API PLATFORMS ====================
  {
    id: 'api-getting-started',
    category: 'api',
    title: 'Cara Mendapatkan API Key dan Memulai Integrasi (1.000.000 Token Gratis)',
    summary: 'Akses REST API inferensi AI Deepernova untuk bot WhatsApp, aplikasi web/mobile, sistem otomasi, atau skrip data.',
    solution: [
      'Akses Konsol API: Klik tombol "Developer API" di bilah navigasi atau buka halaman API Platforms (/api).',
      'Buat Kunci API: Di dashboard pengembang, klik "Generate New API Key". Salin dan simpan kunci rahasia Anda dengan aman.',
      'Kuota Gratis: Setiap pengguna berhak mendapatkan 1.000.000 Token gratis untuk menguji coba seluruh endpoint DeeperNova AI.',
      'Kompatibilitas OpenAI: Format endpoint dan body request dirancang mengikuti standar OpenAI API, sehingga Anda cukup mengganti baseURL dan apiKey di pustaka SDK yang sudah ada.'
    ],
    tips: 'Jangan pernah membagikan API Key di repositori publik (GitHub). Selalu simpan kunci di berkas lingkungan (.env).',
    keywords: 'developer api, api key gratis, 1 juta token api, openai compatible, integrasi bot deepernova'
  },
  {
    id: 'api-chat-endpoint',
    category: 'api',
    title: 'Panduan Memanggil Endpoint Chat API: POST /api/chat',
    summary: 'Contoh kode praktis pemanggilan inferensi AI Deepernova menggunakan cURL, Node.js (fetch), dan Python (requests).',
    solution: [
      'Endpoint URL: https://deepernova.com/api/chat',
      'Header Wajib: Content-Type: application/json dan Authorization: Bearer <API_KEY_ANDA>.',
      'Body JSON: {"model": "deepernova-gold-1.5", "messages": [{"role": "user", "content": "Halo Deepernova!"}], "stream": false}',
      'Contoh cURL:\ncurl -X POST https://deepernova.com/api/chat -H "Content-Type: application/json" -H "Authorization: Bearer dkn_xxx" -d \'{"model":"deepernova-gold-1.5","messages":[{"role":"user","content":"Halo!"}]}\'',
      'Dukungan Streaming: Ubah "stream": true untuk menerima Server-Sent Events (SSE) teks mengalir secara real-time.'
    ],
    tips: 'Gunakan model "deepernova-gold-1.5" untuk performa terbaik atau "deepernova-silicon-1.4" untuk kecepatan inferensi super kilat.',
    keywords: 'post api chat, curl chat api, python deepernova api, streaming sse, endpoint llm'
  },
  {
    id: 'api-search-serp',
    category: 'api',
    title: 'Panduan Menggunakan Search Engine API: GET /api/v1/search',
    summary: 'Ambil hasil pencarian web real-time berformat JSON bersih untuk web scraper, bot analisis pasar, atau agen AI Anda.',
    solution: [
      'Endpoint URL: https://deepernova.com/api/v1/search?q=kata_kunci&limit=10',
      'Header: Authorization: Bearer <API_KEY_ANDA>',
      'Format Respon: Mengembalikan data JSON rapi berisi array "organic_results" (title, link, snippet, domain, thumbnail) dan "_ai_overview_text".',
      'Parameter Tambahan: "includeImages=true" untuk menyertakan URL gambar thumbnail, serta parameter "language=id" untuk memprioritaskan situs Indonesia.'
    ],
    tips: 'Search API ini sangat efisien untuk membangun sistem RAG (Retrieval-Augmented Generation) berbasis informasi berita harian Indonesia.',
    keywords: 'search api, serp api indonesia, json search result, crawler api, api v1 search'
  },

  // ==================== 4. CODEDANCE IDE (AGENTIC VIBE CODING) ====================
  {
    id: 'cd-intro',
    category: 'vibecoding',
    title: 'Apa itu Agentic Vibe Coding di CodeDance IDE dan bagaimana cara kerjanya?',
    summary: 'CodeDance IDE adalah cloud sandbox Monaco Editor yang ditenagai Autonomous AI Coding Agent untuk membuat aplikasi web secara instan dari bahasa alami.',
    solution: [
      'Buka CodeDance IDE dari menu navigasi Deepernova atau kunjungi rute /codedance.',
      'Di panel percakapan AI di sisi kanan, ketik deskripsi aplikasi atau website yang ingin Anda buat (contoh: "Buatkan web dashboard analitik keuangan modern dengan grafik interaktif dan mode gelap").',
      'AI Agent akan secara otonom merancang arsitektur berkas, menulis kode HTML/CSS/JavaScript atau React, dan menerapkan perubahan berkas dengan sistem fuzzy diff patching.',
      'Lihat hasil aplikasi secara langsung di tab Live Preview yang responsif di sisi tengah.',
      'Gunakan terminal sandbox terintegrasi untuk menjalankan perintah atau uji coba fungsionalitas.'
    ],
    tips: 'Gunakan instruksi yang spesifik dan sertakan referensi warna atau tata letak jika ingin tampilan tertentu. AI Deepernova memahami bahasa Indonesia dan Inggris secara fasih.',
    keywords: 'vibe coding, codedance, cd ide, ai coding agent, monaco editor, live preview, bikin website otomatis'
  },
  {
    id: 'cd-blank-preview',
    category: 'vibecoding',
    title: 'Solusi: Layar Live Preview kosong (blank) atau tidak merender di CodeDance IDE',
    summary: 'Langkah cepat mengatasi kendala tampilan preview yang tidak muncul atau terjadi error sintaks pada proyek web.',
    solution: [
      'Periksa apakah berkas "index.html" ada di daftar berkas proyek (File Explorer). Aplikasi web memerlukan index.html sebagai titik awal (entry point).',
      'Pastikan tag script di dalam index.html mengarah ke berkas JavaScript yang benar (contoh: <script src="script.js"></script>).',
      'Buka tab "Console" di bawah Live Preview untuk melihat apakah ada pesan kesalahan JavaScript (syntax error atau missing library).',
      'Ketik perintah ke AI Agent: "Perbaiki error yang ada di console preview dan pastikan aplikasi tampil normal". AI akan memindai error dan memperbaikinya secara otomatis.',
      'Jika masih terjadi cache beku di iframe, klik tombol "Refresh Preview" (ikon putar) di pojok atas panel preview.'
    ],
    tips: 'Jika Anda menggunakan pustaka eksternal seperti Tailwind, FontAwesome, atau Chart.js, pastikan pustaka dimuat via CDN script/link di dalam tag <head> berkas index.html.',
    keywords: 'preview blank, layar putih preview, error codedance, syntax error, refresh preview, console error'
  },
  {
    id: 'cd-multi-file',
    category: 'vibecoding',
    title: 'Cara mengelola proyek multi-berkas (HTML, CSS, JS, JSON) dan unduh ZIP di CodeDance',
    summary: 'Panduan membuat berkas baru, mengedit struktur folder, dan mengekspor proyek ke komputer lokal.',
    solution: [
      'Klik tombol "+" pada panel File Explorer di sebelah kiri untuk menambah berkas baru seperti style.css, app.js, atau data.json.',
      'Anda juga bisa meminta AI langsung: "Buatkan berkas data.json berisi 10 data tiruan produk dan hubungkan ke app.js".',
      'Semua berkas tersimpan secara otomatis di memori lokal browser Anda sehingga tidak akan hilang saat reload.',
      'Untuk mengunduh seluruh proyek ke laptop/PC Anda, klik tombol "Unduh ZIP" (ikon download) di bilah atas CodeDance IDE.',
      'Ekstrak berkas ZIP yang diunduh dan buka "index.html" di browser mana saja untuk menjalankannya secara offline.'
    ],
    tips: 'Anda bisa mengunggah berkas kode lokal ke CodeDance dengan tombol "Import File" untuk diedit bersama AI.',
    keywords: 'multi file, tambah file baru, download zip, export project, import code, offline project'
  },

  // ==================== 5. TYPERNOVA STUDIO (WORD, EXCEL, PPT) ====================
  {
    id: 'tpn-word-doc',
    category: 'typernova',
    title: 'Cara Menyusun Dokumen Microsoft Word (.docx) Lengkap dengan Bab dan Daftar Isi Otomatis',
    summary: 'Typernova Studio menghasilkan berkas .docx standar skripsi/makalah dengan Times New Roman, margin standar, dan Daftar Isi bertitik-titik.',
    solution: [
      'Buka menu Typernova Studio atau buka Document Editor dari bilah navigasi.',
      'Pilih jenis dokumen "Word Document (.docx)".',
      'Tuliskan topik dan kebutuhan struktur makalah Anda (contoh: "Buatkan makalah ilmiah tentang Dampak Kecerdasan Buatan pada Sektor Pendidikan di Indonesia, lengkap dari Kata Pengantar, Bab I Pendahuluan, Bab II Pembahasan, Bab III Penutup, dan Daftar Pustaka").',
      'AI Typernova akan menyusun teks per bab dengan format akademis resmi: Judul tebal di tengah, spasi 1.5, inden paragraf 1.27 cm, dan Daftar Isi bertitik-titik rapi (Contoh: BAB I PENDAHULUAN .............. 1).',
      'Periksa draf di editor bawaan Deepernova, lakukan penyesuaian jika perlu, lalu klik tombol "Export .DOCX" di sudut kanan atas untuk mengunduh berkas Word asli.'
    ],
    tips: 'Hasil unduhan berformat .docx murni yang 100% kompatibel dengan Microsoft Word di laptop/PC, WPS Office di Android, dan Google Docs tanpa layout yang berantakan.',
    keywords: 'bikin skripsi otomatis, makalah ai, typernova word docx, daftar isi titik titik otomatis, format skripsi'
  },
  {
    id: 'tpn-excel-sheets',
    category: 'typernova',
    title: 'Cara Membuat Lembar Kerja Excel (.xlsx) dengan Formula Otomatis dan Visual Tabel',
    summary: 'Otomatisasi pembuatan laporan keuangan, rekap inventaris, dan tabel data berkalkulasi rumus SUM, AVERAGE, IF, dan VLOOKUP.',
    solution: [
      'Di Typernova Document Studio, pilih tab "Excel Spreadsheet (.xlsx)".',
      'Jelaskan tabel yang Anda butuhkan (contoh: "Buat tabel laporan arus kas bulanan UMKM selama 12 bulan, kolom pemasukan, pengeluaran, laba bersih, dan total dengan rumus kalkulasi otomatis").',
      'AI akan memproses baris dan kolom dalam format grid spreadsheet yang dilengkapi formula perhitungan dinamis.',
      'Anda dapat mengklik sel mana saja untuk mengedit nilai atau formula secara langsung.',
      'Klik tombol "Export .XLSX" untuk mengunduh lembar kerja Microsoft Excel siap pakai.'
    ],
    tips: 'Anda bisa menyalin data teks mentah dari chat lalu minta: "Konversikan data di atas menjadi spreadsheet Excel rapi".',
    keywords: 'excel otomatis ai, bikin tabel excel, spreadsheet formula, rumus excel ai, export xlsx'
  },
  {
    id: 'tpn-ppt-slides',
    category: 'typernova',
    title: 'Cara Membuat Presentasi PowerPoint (.pptx) dengan Tata Letak Visual Modern',
    summary: 'Susun slide presentasi bisnis, kuliah, atau pitch deck profesional dalam sekejap.',
    solution: [
      'Pilih jenis dokumen "Presentation (.pptx)" di Typernova Studio.',
      'Tuliskan topik presentasi serta jumlah slide yang diinginkan (contoh: "Buatkan 7 slide presentasi pitch deck startup edutech dengan ringkasan masalah, solusi, market size, dan model bisnis").',
      'AI akan menyusun judul slide, poin-poin presentasi yang padat dan persuasif, serta tata letak visual yang terstruktur.',
      'Klik tombol "Export .PPTX" untuk mengunduh berkas presentasi resmi yang bisa diedit di Microsoft PowerPoint atau Canva.'
    ],
    tips: 'Presentasi yang dibuat AI Deepernova menggunakan prinsip "High Impact, Low Clutter" agar audiens Anda fokus pada poin penting.',
    keywords: 'bikin ppt ai, presentasi otomatis, slide powerpoint, pitch deck ai, export pptx'
  },

  // ==================== 6. AI GAMBAR, VISION & OCR ====================
  {
    id: 'img-create',
    category: 'image',
    title: 'Cara Membuat Gambar Berkualitas Ultra-HD (Text-to-Image) di Deepernova AI',
    summary: 'Panduan lengkap merangkai prompt deskriptif untuk menghasilkan lukisan, anime, 3D render, atau foto fotorealistik.',
    solution: [
      'Buka Chatbot Deepernova AI atau tab AI Image Studio.',
      'Ketik instruksi gambar yang diawali dengan kata kunci seperti "Gambarkan", "Buatkan gambar", atau "Draw".',
      'Sertakan detail gaya visual yang diinginkan: Fotorealistik (8k, hyper-detailed, soft lighting), Anime (Makoto Shinkai style, vibrant colors), Cyberpunk (neon lights, futuristic city), atau 3D Clay (cute 3D isometric).',
      'Tekan Enter atau klik tombol Kirim. Model neural generator Deepernova akan memproses dan menyajikan gambar resolusi tinggi dalam beberapa detik.',
      'Klik ikon Download pada sudut gambar untuk menyimpannya dalam resolusi asli tanpa kompresi.'
    ],
    tips: 'Contoh prompt juara: "Gambarkan pemandangan candi Borobudur saat fajar di atas awan, gaya fotografi National Geographic, pencahayaan keemasan lembut, ultra-detailed 8k, sinematik."',
    keywords: 'bikin gambar ai, generate image, text to image, ai art indonesia, foto realistis ai, anime generator'
  },
  {
    id: 'img-modding',
    category: 'image',
    title: 'Cara Mengedit Foto Referensi (Image-to-Image Modding) dengan Vision AI',
    summary: 'Ubah pakaian, latar belakang, atau gaya gambar foto Anda sendiri menjadi anime atau karakter futuristik.',
    solution: [
      'Klik ikon Lampirkan Gambar (klip kertas / kamera) di kolom chat Deepernova.',
      'Pilih foto dari galeri HP atau komputer Anda yang ingin diubah atau dianalisis.',
      'Tambahkan instruksi spesifik di kolom teks (contoh: "Ubah foto ini menjadi karakter anime cyberpunk dengan rambut menyala dan jaket neon, pertahankan bentuk wajah asli").',
      'Kirim pesan. Sistem Vision Deepernova akan menganalisis fitur wajah/objek dan merekonstruksinya sesuai instruksi gaya yang Anda minta.',
      'Jika ingin revisi, cukup balas obrolan: "Kurangi efek cahayanya dan tambahkan kacamata futuristik".'
    ],
    tips: 'Gunakan foto dengan pencahayaan jelas dan wajah menghadap depan untuk hasil rekognisi dan transformasi yang paling akurat.',
    keywords: 'edit foto ai, image to image, modifikasi gambar, ubah jadi anime, filter ai, ganti background ai'
  },
  {
    id: 'chat-ocr-vision',
    category: 'image',
    title: 'Cara Memindai Dokumen, Teks Gambar, dan Struk Belanja (Vision OCR)',
    summary: 'Ekstraksi teks otomatis dari foto struk, tulisan tangan, tabel berkas, atau tangkapan layar.',
    solution: [
      'Unggah foto yang memuat teks atau tabel dengan mengklik tombol kamera / ikon attachment.',
      'Tuliskan instruksi yang Anda butuhkan (contoh: "Tolong transkripsikan teks pada foto ini ke dalam format tabel rapi" atau "Hitung total pengeluaran dari foto struk belanja ini").',
      'Model Vision Deepernova akan membaca karakter secara optik (OCR) dengan tingkat akurasi tinggi dan menyajikan hasilnya seketika.',
      'Hasil transkripsi dapat langsung diekspor menjadi berkas Word (.docx) atau Excel (.xlsx) dengan satu klik tombol "Export".'
    ],
    tips: 'Pastikan sudut foto tidak terlalu miring dan teks memiliki kontras yang cukup jelas terhadap latar belakang.',
    keywords: 'ocr ai, scan foto jadi teks, baca struk ai, transkripsi gambar, vision ai ocr'
  },
  {
    id: 'img-upscale-hd',
    category: 'image',
    title: 'Menggunakan Fitur Upscale HD untuk Meningkatkan Ketajaman Gambar',
    summary: 'Tingkatkan resolusi gambar hasil AI menjadi kualitas super tajam bebas buram untuk dicetak atau wallpaper.',
    solution: [
      'Setiap kali gambar berhasil di-generate di Chatbot, perhatikan tombol "HD" di pojok atas kartu gambar.',
      'Klik tombol "HD" tersebut. Sistem neural upscaler Deepernova akan merekonstruksi detail pixel, menajamkan tekstur, dan melipatgandakan resolusi berkas.',
      'Setelah proses selesai dalam beberapa detik, tombol akan berubah menjadi centang hijau dan gambar akan diperbarui ke versi HD.',
      'Klik gambar untuk memperbesar ke layar penuh dan unduh versi resolusi tinggi.'
    ],
    tips: 'Gambar yang di-upscale ke HD sangat cocok untuk materi cetak banner, poster, thumbnail YouTube, atau wallpaper desktop 4K.',
    keywords: 'upscale hd, perbesar gambar ai, tajamkan foto, hd upscaler, wallpaper 4k'
  },

  // ==================== 7. MEMORI OTONOM & ALARM MANDIRI ====================
  {
    id: 'mem-how-it-works',
    category: 'memory',
    title: 'Bagaimana Cara Kerja Memori Otonom AI Deepernova (CRUD Otomatis)?',
    summary: 'Sistem memori canggih ala Claude yang dapat menyimpan, mengingat, memperbarui, dan menghapus preferensi Anda secara cerdas.',
    solution: [
      'Anda tidak perlu mengonfigurasi memori secara manual. Cukup mengobrol seperti biasa dengan AI.',
      'Setiap kali Anda menyebutkan informasi penting (seperti: "Panggil aku Nando", "Aku mahasiswa teknik informatika", "Gunakan selalu bahasa santai tapi sopan"), AI secara mandiri mengenali data tersebut.',
      'AI akan memicu aksi otonom: [MEMORY_SAVE] untuk menyimpan hal baru, atau [MEMORY_UPDATE] untuk memperbarui data yang berubah.',
      'Anda akan melihat kapsul animasi "Menyimpan preferensi ke memori..." di gelembung pesan chat saat AI melakukan tindakan memori.',
      'Pada percakapan berikutnya (bahkan di sesi berbeda), AI akan mengingat konteks Anda tanpa perlu diingatkan kembali.'
    ],
    tips: 'Untuk melihat apa saja yang telah diingat AI, cukup tanyakan di chat: "Apa saja memori yang kamu ingat tentang aku?". AI akan merinci seluruh poin memori aktif Anda.',
    keywords: 'memori ai, autonomous memory, crud memori, ingat profil, memory recall, cot memory'
  },
  {
    id: 'mem-delete-update',
    category: 'memory',
    title: 'Cara Menghapus atau Memperbarui Memori yang Sudah Tidak Relevan',
    summary: 'Hapus preferensi lama secara mudah lewat perintah chat atau tombol pembersih memori.',
    solution: [
      'Cukup katakan di chat: "Lupakan tentang proyek lamaku" atau "Hapus memori bahwa aku suka minum kopi".',
      'AI akan mengeksekusi tag otonom [MEMORY_DELETE] dan menampilkan konfirmasi bahwa memori tersebut telah dihapus secara permanen.',
      'Jika Anda ingin memperbarui preferensi (misal ganti kota domisili), katakan: "Sekarang aku sudah pindah ke Yogyakarta". AI otomatis memperbarui memori lokasi Anda.',
      'Untuk mereset total seluruh memori akun: Buka Pengaturan Chat -> klik "Reset Memori Percakapan".'
    ],
    tips: 'Sistem memori Deepernova memilah data secara terpisah antara Mode Tamu (disimpan di browser Anda) dan Akun Terdaftar (disinkronisasi ke cloud database aman).',
    keywords: 'hapus memori ai, update memori, reset memori, lupa konteks, delete memory'
  },
  {
    id: 'trouble-alarm-sync',
    category: 'memory',
    title: 'Cara Menggunakan Fitur Alarm Mandiri dan Sinkronisasi Pengingat',
    summary: 'Jadwalkan alarm dan pengingat aktivitas sehari-hari cukup dengan memberitahu asisten Deepernova.',
    solution: [
      'Ketik perintah waktu di chat (contoh: "Ingatkan aku untuk rapat kerja jam 14.30 hari ini" atau "Pasang alarm bangun tidur jam 05.00 besok pagi").',
      'AI Deepernova akan mendeteksi waktu dan membuat jadwal alarm di kalender in-app secara otonom.',
      'Jika Anda menggunakan aplikasi Deepernova AI di Android (APK), sistem akan meminta izin notifikasi & alarm, lalu meneruskan jadwal langsung ke aplikasi jam/alarm bawaan smartphone Anda.',
      'Anda dapat melihat seluruh jadwal aktif di menu "AI Calendar & Alarms".'
    ],
    tips: 'Pastikan izin "Alarms & Reminders" dan "Notifications" telah diaktifkan pada pengaturan aplikasi Deepernova di smartphone Android Anda.',
    keywords: 'alarm ai, sinkronisasi alarm hp, pengingat otomatis, pasang alarm chat, reminder android'
  },

  // ==================== 8. CLOUD VAULT 3GB & MANAJEMEN BERKAS ====================
  {
    id: 'drive-cloud-vault',
    category: 'drive',
    title: 'Apa itu Deepernova Cloud Vault 3GB dan Cara Menggunakannya?',
    summary: 'Ruang penyimpanan berkas cloud pribadi terenkripsi untuk menyimpan dokumen skripsi, laporan, dan hasil karya AI Anda.',
    solution: [
      'Kapasitas Gratis: Pengguna terdaftar mendapatkan ruang penyimpanan gratis sebesar 3 GB yang diamankan dengan enkripsi zero-trust SHA-256.',
      'Cara Membuka: Klik menu "Drive" atau "Cloud Vault" di bilah navigasi utama.',
      'Unggah Berkas: Seret dan lepas (drag-and-drop) dokumen Word (.docx), Excel (.xlsx), presentasi PPT (.pptx), PDF, atau gambar ke dalam Cloud Vault.',
      'Akses Terintegrasi: Semua dokumen yang dihasilkan dari Typernova Studio dapat langsung disimpan ke Cloud Vault dengan satu klik.',
      'Unduh Kapan Saja: Buka dokumen Anda dari smartphone, tablet, atau komputer lain secara tersinkronisasi.'
    ],
    tips: 'Gunakan Cloud Vault sebagai brankas cadangan untuk berkas skripsi dan makalah Anda agar tidak hilang saat perangkat Anda bermasalah.',
    keywords: 'cloud vault, drive 3gb, penyimpanan berkas ai, simpan dokumen skripsi, brankas cloud'
  },
  {
    id: 'drive-security-protocol',
    category: 'drive',
    title: 'Protokol Keamanan Enkripsi SHA-256 dan Zero-Trust Shield',
    summary: 'Bagaimana Deepernova melindungi kerahasiaan dokumen dan aset riset Anda dari akses pihak luar.',
    solution: [
      'Enkripsi End-to-End: Seluruh data yang diunggah ke Cloud Vault dienkripsi saat transit (TLS 1.3) dan saat disimpan di server (at-rest) menggunakan standar AES/SHA-256.',
      'Isolasi Data Pengguna: Database Deepernova mengisolasi ruang berkas per user ID; pengguna lain tidak memiliki akses ke berkas Anda.',
      'Tanpa Pelatihan Model pada Dokumen Privat: Deepernova Corp tidak menggunakan dokumen pribadi yang diunggah ke Cloud Vault untuk melatih model publik.',
      'Penghapusan Permanen: Saat Anda menghapus berkas dari Cloud Vault, berkas tersebut dihapus secara permanen dari server tanpa jejak tersembunyi.'
    ],
    tips: 'Selalu gunakan kata sandi akun yang kuat dan jangan gunakan kata sandi yang sama dengan akun platform lain.',
    keywords: 'keamanan berkas, enkripsi sha-256, zero trust drive, privasi dokumen, keamanan cloud'
  },

  // ==================== 9. SHORTCUT & PRODUKTIVITAS CEPAT ====================
  {
    id: 'shortcut-keys-list',
    category: 'shortcuts',
    title: 'Daftar Shortcut Keyboard Lengkap untuk Akselerasi Produktivitas',
    summary: 'Kombinasi tombol keyboard cepat untuk mengirim pesan, membuat baris baru, membatalkan stream, dan navigasi cepat.',
    solution: [
      'Enter: Mengirim pesan langsung ke AI.',
      'Shift + Enter: Membuat baris baru (newline) di dalam kotak input teks tanpa mengirim.',
      'Escape (Esc): Menghentikan proses generasi respons AI secara seketika (Instant Stop Stream).',
      'Ctrl + K (atau Cmd + K): Membuka pencarian cepat atau navigasi menu.',
      'Ctrl + /: Menampilkan panduan bantuan cepat.',
      'Tombol Salin Kode: Klik tombol "Salin" di sudut kanan atas setiap blok kode pemrograman untuk menyalin kode utuh ke clipboard.'
    ],
    tips: 'Saat menulis prompt panjang dengan beberapa butir poin, gunakan Shift + Enter untuk merapikan paragraf sebelum mengirim dengan Enter.',
    keywords: 'shortcut keyboard, tombol cepat, enter shift enter, stop stream esc, salin kode cepat'
  },
  {
    id: 'format-markdown-katex',
    category: 'shortcuts',
    title: 'Format Teks Kaya: Markdown, KaTeX Formula Matematika, dan Tabel Rapi',
    summary: 'Cara menampilkan rumus matematika cantik, format cetak tebal/miring, dan tabel terstruktur rapi.',
    solution: [
      'Cetak Tebal & Miring: Gunakan **teks tebal** untuk penekanan penting dan *teks miring* untuk istilah asing.',
      'Rumus Matematika (KaTeX): Gunakan tanda dolar $ E = mc^2 $ untuk rumus sebaris (inline) atau $$ \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} $$ untuk rumus blok besar di tengah.',
      'Tabel Markdown: AI Deepernova otomatis merender tabel dengan garis pemisah yang rapi dan responsif di layar ponsel maupun desktop.',
      'Blok Kode Pemrograman: Ditampilkan dengan syntax highlighting sesuai bahasa (JavaScript, Python, HTML, CSS, SQL, C++, Java, dll).'
    ],
    tips: 'Jika ingin AI membuatkan rumus matematika untuk makalah, minta dengan instruksi: "Tuliskan rumus dalam format KaTeX / LaTeX standar agar rapi".',
    keywords: 'markdown format, katex matematika, rumus latex, tabel markdown, syntax highlighting'
  },

  // ==================== 10. PEMECAHAN KENDALA & TROUBLESHOOTING ====================
  {
    id: 'trouble-mobile-keyboard',
    category: 'troubleshooting',
    title: 'Solusi: Tombol Kirim / Pilihan Model Terpotong di Layar HP Android & iOS',
    summary: 'Panduan tata letak responsif pada smartphone agar seluruh tombol navigasi dan keyboard pas di layar.',
    solution: [
      'Versi terbaru Deepernova telah dilengkapi Liquid Squircle Viewport Lock yang mencegah elemen keluar dari batas layar ponsel.',
      'Jika tombol kirim terasa terdorong oleh keyboard virtual: Cukup ketuk area pesan obrolan sekali untuk menutup keyboard virtual.',
      'Pastikan Anda tidak memperbesar (zoom) browser melampaui 100%. Gunakan zoom normal untuk tampilan yang pas.',
      'Pada aplikasi Android (APK): Pastikan aplikasi telah diperbarui ke versi rilis terbaru dengan tata letak adaptif penuh.',
      'Mode Lanskap vs Potret: Tampilan dioptimalkan untuk mode potret tegak agar kolom obrolan dan tombol aksi berada dalam jangkauan satu jempol.'
    ],
    tips: 'Gunakan browser Google Chrome atau Safari versi terbaru untuk pengalaman animasi CSS yang paling mulus di smartphone.',
    keywords: 'tombol terpotong di hp, keyboard nutupi tombol, responsive mobile, bug layar hp, tombol kirim hilang'
  },
  {
    id: 'trouble-offline-guest',
    category: 'troubleshooting',
    title: 'Solusi: Chatbot Lambat Merespons atau Muncul Pesan "Koneksi Terputus"',
    summary: 'Langkah pemulihan cepat saat jaringan mengalami gangguan atau terjadi hambatan respons server.',
    solution: [
      'Periksa koneksi internet perangkat Anda. Deepernova memerlukan koneksi aktif untuk terhubung ke mesin inferensi neural.',
      'Jika respons terhenti di tengah jalan (streaming macet), klik tombol "Regenerate / Coba Lagi" di bawah pesan terakhir.',
      'Cobalah muat ulang (reload) halaman browser. Jika menggunakan aplikasi Android, tutup aplikasi dari daftar recent apps lalu buka kembali.',
      'Bersihkan cache peramban dengan menekan kombinasi tombol Ctrl + Shift + R (di Windows) atau Cmd + Shift + R (di Mac).',
      'Pastikan Anda tidak menggunakan VPN yang memblokir request API atau memiliki latensi sangat tinggi.'
    ],
    tips: 'Mode Tamu (Guest Mode) tetap dapat menyimpan riwayat obrolan di penyimpanan lokal perangkat Anda tanpa risiko kehilangan pesan saat refresh.',
    keywords: 'koneksi terputus, chat macet, ai tidak merespons, reload cache, connection error'
  },
  {
    id: 'trouble-stream-stalled',
    category: 'troubleshooting',
    title: 'Solusi: Jawaban AI Terhenti di Tengah Jalan atau Teks Terpotong',
    summary: 'Cara melanjutkan pembuatan jawaban yang terpotong karena batas panjang respons atau gangguan sinyal.',
    solution: [
      'Jika AI terhenti di tengah kode pemrograman atau paragraf panjang, cukup ketik di chat: "Lanjutkan dari kalimat terakhir di atas".',
      'AI Deepernova dengan memori konteks 1 Juta Token akan membaca titik potong terakhir dan meneruskan kalimatnya secara mulus tanpa mengulang dari awal.',
      'Jika terjadi kesalahan server sekilas (500 atau 502), klik ikon panah melingkar (Regenerate) di pojok bawah gelembung AI untuk mencoba kembali secara otomatis.',
      'Periksa apakah kuota internet Anda stabil untuk menjaga koneksi Server-Sent Events (SSE) tetap terbuka.'
    ],
    tips: 'Untuk tugas coding yang sangat panjang, mintalah AI membaginya ke beberapa fungsi atau berkas terpisah agar proses streaming berjalan lebih cepat.',
    keywords: 'jawaban terpotong, teks macet, streaming terhenti, lanjutkan chat, regenerate response'
  },
  {
    id: 'trouble-localstorage-quota',
    category: 'troubleshooting',
    title: 'Solusi: Penyimpanan Lokal Browser Penuh (QuotaExceededError)',
    summary: 'Cara mengosongkan cache percakapan dan berkas sementara di browser agar aplikasi kembali gesit.',
    solution: [
      'Browser memiliki batas penyimpanan lokal (biasanya 5MB-10MB untuk localStorage per domain).',
      'Jika Anda menyimpan ratusan gambar hasil generate di Mode Tamu, kuota ini bisa mendekati batas.',
      'Solusi 1: Hapus sesi obrolan yang sudah tidak terpakai dengan mengklik ikon tempat sampah pada daftar riwayat chat di bilah samping.',
      'Solusi 2: Hubungkan akun Anda (Daftar / Masuk). Dengan akun terdaftar, riwayat dan berkas gambar Anda disimpan di cloud database aman, bukan di memori lokal browser.',
      'Solusi 3: Di Pengaturan Browser, bersihkan "Cookies and Site Data" khusus untuk deepernova.com jika ingin mereset total.'
    ],
    tips: 'Unduh berkas gambar atau dokumen penting ke laptop/HP Anda sebelum menghapus riwayat obrolan.',
    keywords: 'quota exceeded error, localstorage penuh, browser memory full, bersihkan cache chat'
  },

  // ==================== 11. AKUN, KEAMANAN & PRIVASI ====================
  {
    id: 'account-guest-vs-login',
    category: 'account',
    title: 'Perbedaan Mode Tamu (Guest Mode) dan Akun Terdaftar di Deepernova',
    summary: 'Nikmati akses langsung tanpa login atau buat akun gratis untuk sinkronisasi multi-perangkat.',
    solution: [
      'Mode Tamu (Guest Mode): Anda bisa langsung memakai seluruh fitur Deepernova (Chat, Vibe Coding, Bikin Gambar, Typernova) tanpa perlu mendaftar atau login. Riwayat disimpan di browser lokal perangkat.',
      'Akun Terdaftar: 100% gratis selamanya. Keunggulannya: riwayat percakapan, proyek CodeDance, dokumen Typernova, dan memori otonom tersinkronisasi otomatis di semua laptop, PC, dan smartphone Anda.',
      'Cara Mendaftar: Klik tombol "Masuk / Daftar" di pojok kanan atas, masukkan nama pengguna, email, dan kata sandi baru.',
      'Jika Anda beralih dari Mode Tamu ke Akun Terdaftar, sistem CloudSync Deepernova akan secara otomatis menawarkan opsi penggabungan riwayat lokal ke akun Anda.'
    ],
    tips: 'Sangat disarankan membuat akun agar hasil karya gambar dan dokumen penting Anda dapat dibuka kembali kapan saja dari perangkat lain.',
    keywords: 'mode tamu, guest mode, daftar akun gratis, sync antar perangkat, login deepernova'
  },
  {
    id: 'trouble-security',
    category: 'account',
    title: 'Keamanan Data & Privasi: Apakah Percakapan dan Dokumen Saya Aman?',
    summary: 'Komitmen perlindungan data tingkat perbankan, enkripsi komunikasi, dan sistem proteksi anti-reverse engineering.',
    solution: [
      'Enkripsi Data: Semua transmisi antara browser/aplikasi Anda dan server Deepernova dilindungi protokol HTTPS/TLS 1.3 dengan header keamanan modern (Helmet, CORP, COOP, Anti-Clickjacking).',
      'Isolasi Sandboxing: Eksekusi kode di CodeDance IDE berjalan di sandbox iframe yang terisolasi ketat sehingga aman dari skrip berbahaya.',
      'Perlindungan Anti-Reverse Engineering: Seluruh bundle aplikasi produksi diminifikasi secara agresif dengan penghapusan otomatis sourcemap dan console debug agar kode tidak dapat dibongkar oleh pihak luar.',
      'Hak Cipta Sepenuhnya Milik Anda: Seluruh kode yang dibuat di CodeDance, karya visual AI, serta dokumen Word/Excel/PPT yang dihasilkan adalah 100% hak milik Anda untuk keperluan komersial maupun akademis.',
      'Tidak Menjual Data: Deepernova Corp tidak pernah menjual data pribadi, riwayat percakapan, atau aset pengguna kepada pihak ketiga mana pun.'
    ],
    tips: 'Anda dapat menghapus seluruh riwayat percakapan Anda kapan saja melalui tombol "Hapus Riwayat" di bilah samping.',
    keywords: 'keamanan data, privasi ai deepernova, enkripsi ssl, anti reverse engineering, hak cipta karya ai'
  },
  {
    id: 'account-ceo-info',
    category: 'account',
    title: 'Siapa Pendiri dan Apa Misi Pengabdian Deepernova Corp?',
    summary: 'Mengenal Ferry Fernando (Founder & CEO) dan ikrar pengabdian untuk mencerdaskan anak bangsa dengan AI gratis selamanya.',
    solution: [
      'Founder & Chief Executive Officer (CEO): Ferry Fernando (FF), tokoh muda visioner asal Kebumen, Jawa Tengah, Indonesia, yang memimpin perancangan arsitektur Deepernova AI, CodeDance IDE, dan Typernova Studio.',
      'Co-Founder & Vice CEO: Anju Malinton Pakpahan, yang berkolaborasi dalam strategi ekspansi dan ekosistem AI terapan.',
      'Ikrar Misi Pengabdian: "Deepernova adalah bentuk pengabdian kami kepada negara untuk misi membantu mencerdaskan anak bangsa, dan berupaya tetap memberikan AI gratis selamanya."',
      'Perusahaan Induk: Deepernova Corp (https://deepernova.com), berdedikasi menciptakan teknologi kecerdasan buatan otonom kelas dunia buatan Indonesia.',
      'Media Sosial Resmi CEO: Instagram @ferryfernandoo_ (https://instagram.com/ferryfernandoo_).'
    ],
    tips: 'Klik kartu profil CEO di bagian bawah halaman ini untuk membuka profil lengkap dan manifesto visi Deepernova.',
    keywords: 'ferry fernando, ferry fernando ceo, ceo deepernova, pendiri deepernova, anju malinton pakpahan, deepernova corp, mencerdaskan anak bangsa'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'Semua Topik', icon: 'fa-layer-group' },
  { id: 'models', label: 'Model AI & Nalar', icon: 'fa-brain' },
  { id: 'search', label: 'Pencarian Web Real-Time', icon: 'fa-globe' },
  { id: 'api', label: 'Developer API Console', icon: 'fa-bolt' },
  { id: 'vibecoding', label: 'CodeDance (Vibe Coding)', icon: 'fa-code' },
  { id: 'typernova', label: 'Typernova (Word/Excel/PPT)', icon: 'fa-file-lines' },
  { id: 'image', label: 'AI Gambar, Vision & OCR', icon: 'fa-wand-magic-sparkles' },
  { id: 'memory', label: 'Memori Otonom & Alarm', icon: 'fa-clock' },
  { id: 'drive', label: 'Cloud Vault 3GB & File', icon: 'fa-cloud' },
  { id: 'shortcuts', label: 'Shortcut & Produktivitas', icon: 'fa-keyboard' },
  { id: 'troubleshooting', label: 'Solusi Error & Kendala', icon: 'fa-circle-question' },
  { id: 'account', label: 'Akun, Keamanan & Privasi', icon: 'fa-shield-halved' }
];

export default function HelpCenter({ onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showCeoModal, setShowCeoModal] = useState(false);

  const filteredData = useMemo(() => {
    return HELP_DATA.filter(item => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory;
      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.keywords.toLowerCase().includes(query) ||
        item.solution.some(s => s.toLowerCase().includes(query)) ||
        (item.tips && item.tips.toLowerCase().includes(query))
      );
    });
  }, [searchQuery, activeCategory]);

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const copyTip = (text, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="help-center-wrapper">
      {/* Top Ambient Glow (Orange Glow) */}
      <div className="help-ambient-glow" />

      {/* Header Bar */}
      <header className="help-header">
        <div className="help-header-content">
          <div className="help-brand-badge" onClick={() => setShowCeoModal(true)} style={{ cursor: 'pointer' }}>
            <span className="badge-pulse" />
            <span>Pusat Bantuan Resmi • Deepernova AI</span>
          </div>

          <h1 className="help-title">
            Pusat Bantuan &amp; <span className="gradient-text">Solusi Pintar</span>
          </h1>

          <p className="help-subtitle">
            Ensiklopedia panduan resmi Deepernova AI: panduan model AI, pencarian web real-time, developer API, CodeDance IDE, Typernova Studio, AI gambar, dan solusi kendala teknis.
          </p>

          {/* Search Box */}
          <div className="help-search-container">
            <i className="fa-solid fa-magnifying-glass search-icon" />
            <input
              type="text"
              className="help-search-input"
              placeholder="Cari solusi kendala (contoh: model gold 1.5, api key, blank preview, word docx, formula excel, pencarian web)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')} title="Hapus pencarian">
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="help-quick-nav">
            <button className="quick-nav-pill" onClick={() => onNavigate?.('chat')}>
              <i className="fa-solid fa-comments" /> Masuk Chat
            </button>
            <button className="quick-nav-pill" onClick={() => onNavigate?.('api')}>
              <i className="fa-solid fa-bolt" /> Developer API
            </button>
            <button className="quick-nav-pill" onClick={() => onNavigate?.('codedance')}>
              <i className="fa-solid fa-code" /> CodeDance IDE
            </button>
            <button className="quick-nav-pill" onClick={() => onNavigate?.('editor', 'word')}>
              <i className="fa-solid fa-file-word" /> Dokumen Word
            </button>
            <button className="quick-nav-pill highlight" onClick={() => setShowCeoModal(true)}>
              <i className="fa-solid fa-user-tie" /> Profil CEO &amp; Misi
            </button>
            <button className="quick-nav-pill" onClick={() => onNavigate?.('landing')}>
              <i className="fa-solid fa-house" /> Beranda
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="help-main-body">
        {/* Category Tabs */}
        <div className="help-category-bar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <i className={`fa-solid ${cat.icon}`} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Results Counter */}
        <div className="help-results-info">
          <span>Menampilkan <strong>{filteredData.length}</strong> artikel panduan &amp; solusi terverifikasi</span>
          {searchQuery && (
            <span className="search-filter-tag">
              Kata kunci: "{searchQuery}"
            </span>
          )}
        </div>

        {/* Knowledge Articles Accordion List */}
        <div className="help-articles-list">
          {filteredData.length === 0 ? (
            <div className="help-empty-state">
              <i className="fa-solid fa-circle-exclamation empty-icon" />
              <h3>Tidak ada panduan yang cocok dengan pencarian</h3>
              <p>Coba gunakan kata kunci lain seperti "Model", "API", "Pencarian", "Word", atau "Kode".</p>
              <button className="reset-filter-btn" onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}>
                Tampilkan Semua Panduan
              </button>
            </div>
          ) : (
            filteredData.map(item => {
              const isExpanded = expandedId === item.id;
              return (
                <article key={item.id} className={`help-card ${isExpanded ? 'expanded' : ''}`}>
                  <button
                    className="help-card-header"
                    onClick={() => toggleExpand(item.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="card-header-left">
                      <span className="card-category-tag">
                        {CATEGORIES.find(c => c.id === item.category)?.label || item.category}
                      </span>
                      <h2 className="card-title">{item.title}</h2>
                      <p className="card-summary">{item.summary}</p>
                    </div>
                    <div className="card-header-right">
                      <i className={`fa-solid fa-chevron-down expand-icon ${isExpanded ? 'rotated' : ''}`} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="help-card-content">
                      <div className="steps-wrapper">
                        <h4 className="steps-heading">
                          <i className="fa-solid fa-list-check" /> Langkah-Langkah Panduan &amp; Solusi:
                        </h4>
                        <ol className="steps-list">
                          {item.solution.map((step, idx) => (
                            <li key={idx} className="step-item">
                              <span className="step-number">{idx + 1}</span>
                              <span className="step-text">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {item.tips && (
                        <div className="tips-box">
                          <div className="tips-header">
                            <span className="tips-title">
                              <i className="fa-solid fa-lightbulb" /> Tips Juara &amp; Rekomendasi Prompt:
                            </span>
                            <button
                              className="copy-tip-btn"
                              onClick={() => copyTip(item.tips, item.id)}
                              title="Salin Tips"
                            >
                              <i className={`fa-solid ${copiedId === item.id ? 'fa-check' : 'fa-copy'}`} />
                              <span>{copiedId === item.id ? 'Tersalin!' : 'Salin'}</span>
                            </button>
                          </div>
                          <p className="tips-text">{item.tips}</p>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        {/* Authority Organization Footer Card with Click Action */}
        <section className="help-authority-footer">
          <div className="authority-card clickable" onClick={() => setShowCeoModal(true)}>
            <div className="authority-avatar-container">
              <img src="/ceo.jpg" alt="Ferry Fernando - Founder & CEO Deepernova Corp" className="authority-avatar-img" />
              <span className="verified-badge-mini" title="Terverifikasi">✓</span>
            </div>
            <div className="authority-text">
              <div className="authority-badge-row">
                <span className="auth-pill-badge">FOUNDER &amp; CEO</span>
                <span className="auth-action-hint">Klik untuk melihat profil &amp; misi ➔</span>
              </div>
              <h3>Ferry Fernando — Deepernova Corp</h3>
              <p className="authority-quote">
                "Deepernova adalah bentuk pengabdian kami kepada negara untuk misi membantu mencerdaskan anak bangsa, dan berupaya tetap memberikan AI gratis selamanya."
              </p>
              <div className="authority-links">
                <span className="auth-link">
                  <i className="fa-brands fa-instagram" /> @ferryfernandoo_
                </span>
                <span className="auth-divider">•</span>
                <span className="auth-tag">Co-Founder: Anju Malinton Pakpahan</span>
                <span className="auth-divider">•</span>
                <span className="auth-tag">Domain: deepernova.com</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* CEO Profile Modal */}
      {showCeoModal && (
        <div className="help-modal-overlay" onClick={() => setShowCeoModal(false)}>
          <div className="help-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="help-modal-close" onClick={() => setShowCeoModal(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
            <div className="modal-avatar-header">
              <img src="/ceo.jpg" alt="Ferry Fernando" className="modal-avatar-large" />
              <div className="modal-header-meta">
                <h2>Ferry Fernando (FF)</h2>
                <p className="modal-role">Founder &amp; Chief Executive Officer (CEO)</p>
                <span className="modal-corp-tag">Deepernova Corp • Kebumen, Jawa Tengah</span>
              </div>
            </div>
            <div className="modal-body-content">
              <h4>Ikrar Misi Pengabdian</h4>
              <p className="manifesto-text">
                "Deepernova adalah bentuk pengabdian kami kepada negara untuk misi membantu mencerdaskan anak bangsa, dan berupaya tetap memberikan AI gratis selamanya."
              </p>
              <h4>Tentang Pendiri &amp; Kepemimpinan</h4>
              <p>
                Ferry Fernando memimpin riset dan perancangan arsitektur teknologi Deepernova AI, sistem otonom Vibe Coding (CodeDance IDE), dan otomasi dokumen Typernova Studio. Berkolaborasi erat dengan Co-Founder &amp; Vice CEO Anju Malinton Pakpahan, Deepernova Corp bertekad menghadirkan kedaulatan teknologi kecerdasan buatan kelas dunia yang dapat diakses oleh seluruh lapisan masyarakat Indonesia.
              </p>
              <div className="modal-social-links">
                <a
                  href="https://instagram.com/ferryfernandoo_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-ig-btn"
                >
                  <i className="fa-brands fa-instagram" /> Ikuti di Instagram @ferryfernandoo_
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import './HelpCenter.css';

const HELP_DATA = [
  // ==================== 1. AGENTIC VIBE CODING (CODEDANCE IDE) ====================
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

  // ==================== 2. AI IMAGE STUDIO (BIKIN GAMBAR) ====================
  {
    id: 'img-create',
    category: 'image',
    title: 'Cara membuat gambar berkualitas ultra-HD (Text-to-Image) di Deepernova AI',
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
    title: 'Cara mengedit foto referensi (Image-to-Image Modding) dengan Vision AI',
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
    id: 'img-nsfw-trouble',
    category: 'image',
    title: 'Solusi: Permintaan gambar ditolak atau menghasilkan pesan sensor/filter',
    summary: 'Cara menyesuaikan kata kunci prompt agar lolos dari filter keamanan otomatis tanpa melanggar etika.',
    solution: [
      'Sistem keamanan Deepernova AI menerapkan filter otomatis terhadap konten pornografi, kekerasan eksplisit, ujaran kebencian, dan figur publik sensitif.',
      'Hindari kata-kata bersayap yang dapat memicu filter negatif (misalnya kata "darah", "telanjang", "senjata tajam", atau istilah kekerasan).',
      'Gunakan sinonim artistik yang elegan (misalnya gantikan kata "menyeramkan/horor" dengan "atmosfer temaram berkabut misterius gaya gotik").',
      'Fokuskan prompt pada pencahayaan, palet warna, kostum, komposisi kamera (wide angle, close-up, drone shot), dan detail arsitektur.',
      'Jika prompt Anda aman namun salah terdeteksi filter (false positive), ubah struktur kalimatnya menjadi lebih deskriptif secara estetika.'
    ],
    tips: 'Menambahkan kata kunci teknis fotografi seperti "ambient lighting", "bokeh", "f/1.8 lens", dan "hyper-detailed" akan menghasilkan visual yang jauh lebih menakjubkan.',
    keywords: 'gambar ditolak, error gambar, filter sensor, nsfw bypass aman, prompt foto elegan'
  },

  // ==================== 3. TYPERNOVA STUDIO (DOKUMEN WORD, EXCEL, PPT) ====================
  {
    id: 'tpn-word-doc',
    category: 'typernova',
    title: 'Cara menyusun dokumen resmi Microsoft Word (.docx) lengkap dengan Bab dan Daftar Isi otomatis',
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
    title: 'Cara membuat lembar kerja Excel (.xlsx) dengan formula otomatis dan visual tabel',
    summary: 'Otomatisasi pembuatan laporan keuangan, rekap inventaris, dan tabel data berkalkulasi rumus SUM, AVERAGE, dan VLOOKUP.',
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
    title: 'Cara membuat presentasi PowerPoint (.pptx) dengan tata letak visual modern',
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

  // ==================== 4. AUTONOMOUS MEMORY SYSTEM ====================
  {
    id: 'mem-how-it-works',
    category: 'memory',
    title: 'Bagaimana cara kerja Memori Otonom AI Deepernova (CRUD Otomatis)?',
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
    title: 'Cara menghapus atau memperbarui memori yang sudah tidak relevan',
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

  // ==================== 5. CHATBOT MULTI-MODEL & VISION OCR ====================
  {
    id: 'chat-models',
    category: 'chatbot',
    title: 'Model AI apa saja yang tersedia di Deepernova dan bagaimana memilihnya?',
    summary: 'Pilihan model neural berkecepatan kilat dengan dukungan vision multimodal dan penalaran mendalam.',
    solution: [
      'Deepernova 1.0 Super Flash (Default): Model utama berbasis ultra-fast neural reasoning yang mendukung pemrosesan teks dan visi multimodal secara instan.',
      'Deepernova Pro / Deep Reasoning: Cocok untuk pemecahan masalah rumit, logika pemrograman mendalam, dan kalkulasi matematika lanjutan.',
      'Deepernova Creative Studio: Dioptimalkan untuk pembuatan karya sastra, copy iklan, skrip video, dan pembuatan prompt visual.',
      'Untuk mengganti model: Klik menu dropdown pilihan model di bagian atas layar obrolan ChatBot.'
    ],
    tips: 'Semua model Deepernova dilengkapi fitur web search live otomatis ketika mendeteksi pertanyaan mengenai peristiwa terkini, berita, atau data statistik teranyar.',
    keywords: 'pilihan model ai, ganti model, deepseek vision, grok fast, model reasoning, ai tercepat'
  },
  {
    id: 'chat-ocr-vision',
    category: 'chatbot',
    title: 'Cara memindai dokumen, teks gambar, dan struk belanja (Vision OCR)',
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

  // ==================== 6. PEMECAHAN MASALAH UMUM (TROUBLESHOOTING) ====================
  {
    id: 'trouble-offline-guest',
    category: 'troubleshooting',
    title: 'Solusi: Chatbot lambat merespons atau muncul pesan "Koneksi Terputus"',
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
    id: 'trouble-alarm-sync',
    category: 'troubleshooting',
    title: 'Cara menggunakan fitur Alarm Mandiri dan sinkronisasi ke HP Android',
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
  {
    id: 'trouble-security',
    category: 'troubleshooting',
    title: 'Keamanan Data & Privasi: Apakah percakapan dan kode proyek saya aman di Deepernova?',
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

  // ==================== 7. AKUN & SINKRONISASI ====================
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
    id: 'account-ceo-info',
    category: 'account',
    title: 'Siapa pendiri dan apa misi pengabdian Deepernova Corp?',
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
  { id: 'vibecoding', label: 'CodeDance (Vibe Coding)', icon: 'fa-code' },
  { id: 'image', label: 'AI Gambar & Art', icon: 'fa-wand-magic-sparkles' },
  { id: 'typernova', label: 'Typernova (Word/Excel/PPT)', icon: 'fa-file-lines' },
  { id: 'memory', label: 'Memori Otonom AI', icon: 'fa-brain' },
  { id: 'chatbot', label: 'Chatbot & Vision OCR', icon: 'fa-comments' },
  { id: 'troubleshooting', label: 'Solusi Error & Kendala', icon: 'fa-circle-question' },
  { id: 'account', label: 'Akun & Keamanan', icon: 'fa-shield-halved' }
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
            Koleksi panduan lengkap penggunaan fitur, tips prompt juara, dan panduan pemecahan kendala teknis resmi Deepernova AI.
          </p>

          {/* Search Box */}
          <div className="help-search-container">
            <i className="fa-solid fa-magnifying-glass search-icon" />
            <input
              type="text"
              className="help-search-input"
              placeholder="Cari solusi kendala (contoh: blank preview, bikin word docx, rumus excel, memori ai)..."
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
            <button className="quick-nav-pill" onClick={() => onNavigate?.('codedance')}>
              <i className="fa-solid fa-code" /> CodeDance IDE
            </button>
            <button className="quick-nav-pill" onClick={() => onNavigate?.('editor', 'word')}>
              <i className="fa-solid fa-file-word" /> Dokumen Word
            </button>
            <button className="quick-nav-pill" onClick={() => onNavigate?.('chat')}>
              <i className="fa-solid fa-comments" /> Chatbot &amp; Gambar
            </button>
            <button className="quick-nav-pill highlight" onClick={() => setShowCeoModal(true)}>
              <i className="fa-solid fa-user-tie" /> Profil CEO &amp; Misi Kami
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
          <span>Menampilkan <strong>{filteredData.length}</strong> artikel panduan &amp; solusi</span>
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
              <p>Coba gunakan kata kunci lain seperti "CodeDance", "Word", "Gambar", atau "Memori".</p>
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
                          <i className="fa-solid fa-list-check" /> Langkah-Langkah Penyelesaian / Panduan:
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

      {/* ==================== LARGE CEO & DEEPERNOVA MODAL CARD ==================== */}
      {showCeoModal && (
        <div className="ceo-modal-overlay" onClick={() => setShowCeoModal(false)}>
          <div className="ceo-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Top Accent Orange Glow Strip */}
            <div className="modal-top-accent-bar" />

            {/* Close Button */}
            <button className="modal-close-btn" onClick={() => setShowCeoModal(false)} title="Tutup">
              <i className="fa-solid fa-xmark" />
            </button>

            {/* Modal Header Tag */}
            <div className="modal-header-tag">
              <span className="flag-icon">🇮🇩</span>
              <span>PENGABDIAN UNTUK BANGSA &amp; NEGARA INDONESIA</span>
            </div>

            {/* Hero Profile Header */}
            <div className="ceo-hero-section">
              <div className="ceo-photo-wrapper">
                <img src="/ceo.jpg" alt="Ferry Fernando - Founder & CEO Deepernova Corp" className="ceo-modal-photo" />
                <div className="ceo-photo-badge">
                  <i className="fa-solid fa-circle-check" /> Verified Founder
                </div>
              </div>

              <div className="ceo-hero-details">
                <span className="ceo-role-pill">CHIEF EXECUTIVE OFFICER &amp; FOUNDER</span>
                <h2 className="ceo-name">Ferry Fernando <span className="alias-name">(FF)</span></h2>
                <p className="ceo-title-sub">
                  Pemimpin Arsitektur &amp; Perancang Ekosistem <strong>Deepernova AI</strong>, <strong>CodeDance IDE</strong>, dan <strong>Typernova Studio</strong>.
                </p>

                <div className="ceo-meta-tags">
                  <span className="meta-tag"><i className="fa-solid fa-location-dot" /> Kebumen, Jawa Tengah, Indonesia</span>
                  <a href="https://instagram.com/ferryfernandoo_" target="_blank" rel="noopener noreferrer" className="meta-tag social-tag">
                    <i className="fa-brands fa-instagram" /> @ferryfernandoo_
                  </a>
                  <span className="meta-tag"><i className="fa-solid fa-building" /> Deepernova Corp</span>
                </div>
              </div>
            </div>

            {/* Master Mission Statement Quote Callout */}
            <div className="ceo-mission-quote-box">
              <div className="quote-icon-bubble">❝</div>
              <blockquote className="ceo-quote-text">
                Deepernova adalah bentuk pengabdian kami kepada negara untuk misi membantu mencerdaskan anak bangsa, dan berupaya tetap memberikan AI gratis selamanya.
              </blockquote>
              <div className="quote-author-sig">
                — <strong>Ferry Fernando</strong>, Founder &amp; CEO Deepernova Corp
              </div>
            </div>

            {/* Core Values & Pillars Grid */}
            <div className="ceo-pillars-grid">
              <div className="pillar-item">
                <div className="pillar-icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}>
                  <i className="fa-solid fa-graduation-cap" />
                </div>
                <div className="pillar-text">
                  <h4>Mencerdaskan Anak Bangsa</h4>
                  <p>Membekali pelajar, mahasiswa, dan generasi muda dengan alat bantu belajar, riset ilmiah, dan pembuat dokumen otomatis tanpa biaya.</p>
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <i className="fa-solid fa-code" />
                </div>
                <div className="pillar-text">
                  <h4>Kedaulatan Vibe Coding</h4>
                  <p>Menghadirkan CodeDance IDE agar siapa saja di Indonesia bisa mewujudkan ide aplikasi software secara instan melalui bahasa sehari-hari.</p>
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-icon-box" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <i className="fa-solid fa-hand-holding-heart" />
                </div>
                <div className="pillar-text">
                  <h4>100% Gratis Selamanya</h4>
                  <p>Berkomitmen teguh menghadirkan kecerdasan buatan tanpa paywall tersembunyi, tanpa langganan mahal, dan ramah untuk semua kalangan.</p>
                </div>
              </div>

              <div className="pillar-item">
                <div className="pillar-icon-box" style={{ background: '#fdf4ff', color: '#c026d3' }}>
                  <i className="fa-solid fa-users" />
                </div>
                <div className="pillar-text">
                  <h4>Kolaborasi &amp; Kepemimpinan</h4>
                  <p>Dirancang oleh Ferry Fernando bersama Anju Malinton Pakpahan (Co-Founder &amp; Vice CEO) di bawah naungan Deepernova Corp.</p>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="ceo-modal-actions">
              <a 
                href="https://instagram.com/ferryfernandoo_" 
                target="_blank" 
                rel="noopener noreferrer"
                className="modal-btn-primary"
              >
                <i className="fa-brands fa-instagram" /> Ikuti Instagram CEO (@ferryfernandoo_)
              </a>
              <button 
                className="modal-btn-accent"
                onClick={() => {
                  setShowCeoModal(false);
                  onNavigate?.('chat');
                }}
              >
                <i className="fa-solid fa-comments" /> Mulai Pakai Deepernova AI
              </button>
              <button 
                className="modal-btn-secondary"
                onClick={() => setShowCeoModal(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

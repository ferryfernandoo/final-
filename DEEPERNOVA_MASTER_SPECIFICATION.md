# DEEPERNOVA MASTER SPECIFICATION & ROADMAP DOKUMEN

> **Visi Utama**: Platform *Unified AI-Native WebOS & Productivity Super-App* yang menggabungkan sistem operasi web (Windows 11 & Mobile UI), cloud storage, editor dokumen otonom, AI Agent terdistribusi, serta ekosistem bisnis O2O (*Online-to-Offline*).

---

## 1. DOKUMENTASI FITUR YANG SUDAH TERBANGUN (CURRENT IMPLEMENTATIONS)

### A. Dual-Interface WebOS (Desktop & Mobile Adaptive Split)
- **Desktop UI (Windows 11 Style)**:
  - Tampilan desktop interaktif dengan Wallpaper HD (Unsplash API).
  - Grid ikon aplikasi desktop, Start Menu popup, Windows 11 Taskbar, serta Jam Digital Real-Time.
  - Window Manager penuh (bisa Minimise, Maximise, dan Close jendela aplikasi).
- **Mobile UI (Android / Mobile Native Style)**:
  - Otomatis beradaptasi pada layar `<= 768px` menjadi antarmuka ala *Files by Google*.
  - Menyeimbangkan kecepatan navigasi sentuh tanpa elemen desktop yang sesak di layar HP.

### B. Cloud Storage Backend & Real-Time Sync Engine
- **SQLite Database Server Integration**:
  - Tabel `cloud_files` menyimpan metadata, `content` (JSON payload), dan `fileData` (Base64/Binary blob).
  - REST API Endpoints: `GET /api/cloud/files`, `POST /api/cloud/upload`, `DELETE /api/cloud/files/:id?name=...`, `GET /api/cloud/storage-info`.
- **Real-Time Polling & Pembersihan Multi-Tier**:
  - Background silent polling setiap 5 detik sehingga berkas yang diunggah dari Perangkat A langsung muncul secara instan di Perangkat B.
  - Pembersihan berkas terhapus secara menyeluruh dari SQLite DB, `localStorage`, `sessionStorage`, `doc_artifacts`, dan `typernova_last_edited_document` tanpa meninggalkan *ghost files* atau duplikasi.
- **Jaringan & Aksesibilitas Lintas Perangkat**:
  - Konfigurasi CORS dinamis mendukung akses jaringan lokal IP LAN (`192.168.x.x`, `10.x.x.x`, `172.x.x.x`).
  - Vite Proxy & Express Server binding di `0.0.0.0:3001` untuk mendukung pengujian lintas perangkat pada Wi-Fi yang sama.
  - Skalabilitas Rate Limiter ditingkatkan hingga 600 req/menit dengan pengecualian khusus untuk endpoint polling cloud.

### C. Typernova Office Suite (Pengolah Dokumen Otonom)
- **Editor Dokumen Otonom (Word, Excel, PPT)**:
  - Dukungan pembuatan dan pratinjau dokumen `.docx`, `.xlsx`, dan `.pptx`.
- **Keystroke Debounced Auto-Save**:
  - Setiap ketikan disimpan otomatis di latar belakang tanpa tombol Save manual.
  - Pemulihan draf aman saat halaman di-refresh (*Refresh-Proof Draft State*).

### D. Sistem Autentikasi Pengguna (Passport.js Local Strategy)
- **Dukungan Domain Khusus**: Enforcing domain `@deepmail.com` untuk pendaftaran akun.
- **Keamanan**: Pengacakan enkripsi kata sandi menggunakan `bcrypt`.
- **Manajemen Sesi**: Sesi persisten menggunakan SQLite Session Store dengan cookie cross-device `sameSite: 'lax'`.
- **Endpoints**: `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `POST /auth/logout`.

---

## 2. INOVASI & ARSITEKTUR MASA DEPAN (FUTURE VISIONARY ROADMAP)

### A. Agentic AI & Function Calling Architecture
- **Autonomous Screen & UI Navigation**:
  - AI Agent tidak hanya merespons dalam bentuk teks, tetapi mengembalikan *JSON Function Calling* terstruktur (contoh: `onNavigate('documents', 'docx')`) untuk berpindah tampilan layar secara otomatis.
- **Single-Prompt Multi-Action Execution**:
  - Pengguna hanya memasukkan 1 instruksi kalimat santai (contoh: *"Buatkan laporan penjualan Q3 di Word, rekap Excel-nya, dan simpan di Cloud"*).
  - AI memecah perintah menjadi *sub-tasks* dan menjalankannya berurutan hingga tuntas.

### B. Multi-Agent Grid Dashboard (War Room Command Center)
- **Split-Screen Multi-Viewport (4 - 10 Layar Simultan)**:
  - Tampilan grid layar yang memperlihatkan 4 hingga 10 agen AI bekerja secara paralel:
    - *Layar 1*: Code Agent (Linting & Server Build).
    - *Layar 2*: Document Agent (Menyusun narasi Word).
    - *Layar 3*: Spreadsheet Agent (Menghitung rumus Excel).
    - *Layar 4*: Marketing Agent (Menyusun copy iklan & promosi).
- **Live Streaming Subagents**: Kemajuan pekerjaan dikirimkan secara real-time via WebSockets / SSE ke masing-masing frame layar.

### C. Asynchronous Multi-Agent Cross-Artifact Cascade
- **Event-Driven Pub/Sub Subagents**:
  - Satu perubahan pada draf dokumen Word secara asinkronus memicu pembaruan pada berkas kode di Code Editor, draf materi promosi pemasaran, dan lembar anggaran di Excel secara simultan di latar belakang (*non-blocking UI*).

### D. Cloud Code Editor & Sandboxed Terminal Execution
- **Editor Komponen**: Integrasi **Monaco Editor** (mesin VS Code) terhubung langsung dengan Deepernova Cloud Storage.
- **Metode Sandbox Terisolasi**:
  - *Client-Side Sandbox*: WebAssembly (**Pyodide** untuk Python, **WebContainers** / Web Workers untuk JS/Node.js).
  - *Backend Containerized Sandbox*: Lingkungan terisolasi menggunakan Docker / Firecracker MicroVMs untuk pengeksekusian kode aman.

### E. Native Citation & Reference Management Engine (Bypass Mendeley)
- **Pustaka Sitasi Terintegrasi**:
  - Tabel SQLite `citations` menyimpan pustaka referensi pengguna (Format: APA 7th, IEEE, Harvard, MLA, Chicago).
- **Auto-Extraction Jurnal PDF**:
  - Mengekstrak DOI, Judul, Penulis, dan Tahun otomatis dari unggahan berkas PDF menggunakan PyMuPDF / OpenAlex API.
- **Auto-Generate In-Text Citations & Daftar Pustaka**:
  - AI menyisipkan sitasi langsung di teks Word `(Nando et al., 2025)` dan membuat bagian Daftar Pustaka otomatis di akhir dokumen.

---

## 3. MODEL BISNIS & STRATEGI GROWTH HACK O2O (CAMPUS BUNDLE)

### A. Target Pasar Utama
- **Mahasiswa & Peneliti Akademik**: Membutuhkan alat bantu nugas, penulisan skripsi/proposal, kodingan, dan makanan saat nugas malam.

### B. Model Bisnis O2O (Online-to-Offline F&B Integration)
- **Skema Promo Virality**:
  - *Akses Gratis*: Pengguna bisa menikmati fitur standar.
  - *Paket Bundling Bebek Goreng*: Pembelian **minimal 3 porsi Bebek Goreng** mendapatkan voucher **1 Minggu Unlimited AI Token Access**.
- **Mekanisme Reedem Voucher**:
  - Kode unik tercetak di struk / box makanan bebek.
  - Pengguna memasukkan kode di Deepernova WebOS untuk membuka kuota tanpa batas selama 7 hari.

### C. Conversational Commerce Chatbot (Pesan Bebek via AI)
- **Integrasi Google Maps API**:
  - Pengguna bisa memesan bebek langsung di dalam obrolan AI Chatbot (*"Min, pesen Bebek 3 porsi antar ke Kosan Merpati No 12"*).
  - AI memanggil Google Maps API / Geocoding untuk melacak lokasi, jarak delivery, dan estimasi waktu sampai.
- **Payment on Delivery (COD)**:
  - Pembayaran di tempat (Cash / QRIS saat kurir tiba).
  - Penambahan lisensi token otomatis aktif begitu pesanan dikonfirmasi selesai.

---

## 4. MODUL TRANSPARANSI OPERASIONAL & AUDIT TRAIL (INVENTORY & OPERATIONAL LOGS)

### A. Real-Time Operational & Inventory Log Engine
- **Manajemen Inventaris & Stok**:
  - Tabel SQLite `inventory_logs` mencatat pemasukan dan pengeluaran barang/stok secara riil.
- **Audit Trail Immutability (Pencatatan Bergaransi)**:
  - Setiap transaksi atau entri operasional dicatat secara permanen dengan *timestamp*, ID pengguna, dan *hash verification* untuk memastikan riwayat pencatatan tetap akurat dan tidak dapat diubah tanpa jejak audit.
- **Laporan Otomatis Eksekutif**:
  - Modul analisis AI yang secara berkala merangkum data operasional menjadi laporan spreadsheet `.xlsx` atau ringkasan dokumen `.docx` untuk kemudahan pemantauan.

---

*Dokumen ini diperbarui sebagai Master Specification & Roadmap Resmi untuk proyek Deepernova.* 🚀

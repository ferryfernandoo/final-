---
name: frontend-web-pro
description: "Skill lengkap untuk membangun aplikasi web interaktif, dashboard analitik real-time, kalkulator reaktif, dan antarmuka pengguna (UI/UX) modern dalam 1 file mandiri (.html, React .jsx/.tsx, Tailwind CSS, Chart.js). Mencakup sistem desain UI modern, penyematan gambar Base64 otomatis, kurva Chart.js interaktif anti-bocor, manajemen state, serta audit statis wajib menggunakan frontend_kit.py."
---

# Frontend & Interactive WebApp Pro — Panduan Lengkap UI/UX & Dashboard Single-File

Tujuan skill ini ada empat:
1. **Satu File Mandiri (*Self-Contained Single File*).** Seluruh HTML, CSS (Tailwind CDN), JavaScript, state, multi-tab/halaman, dan aset gambar (di-inline sebagai Base64 Data URI) menyatu dalam satu file `.html` atau `.jsx` yang langsung berjalan mulus di browser maupun Canvas.
2. **Desain UI/UX Kelas Produk SaaS Modern.** Tipografi `Inter`, hirarki kartu KPI yang bersih, palet warna konsisten (mendukung *Dark/Light Mode*), responsif di layar HP hingga monitor lebar, tanpa *scroll* horizontal yang merusak.
3. **Grafik & Kurva Interaktif (`Chart.js`).** Mendukung kurva *smooth spline* (`tension: 0.4`), area gradien, grafik Pareto/Doughnut, serta simulasi slider yang memperbarui tabel dan grafik secara *real-time*.
4. **100% Kontrol Berfungsi (*Zero Dead Buttons*).** Semua tombol, filter pencarian, dropdown, slider simulasi, modal tambah data, dan tombol ekspor CSV benar-benar bekerja dan teruji oleh `frontend_kit.py --check`.

---

## BAGIAN 1 — 6 Hukum Mutlak Arsitektur WebApp Single-File

1. **Jangan pernah memisahkan file lokal (`href="style.css"`, `src="app.js"`, `href="page2.html"`).** Di dalam pratinjau sandbox/Canvas, file lokal eksternal tidak bisa dimuat. Gunakan `<style>` dan `<script>` inline, serta navigasi tab/state di dalam satu halaman.
2. **Gunakan CDN Resmi dengan Versi Eksplisit:**
   - Tailwind CSS: `<script src="https://cdn.tailwindcss.com/3.4.17"></script>`
   - Chart.js: `<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>`
   - Lucide Icons (opsional): `<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>`
3. **DILARANG memakai `alert()`, `confirm()`, atau `prompt()`.** Dialog bawaan browser diblokir oleh sandbox iframe dan terlihat amatir. Selalu buat komponen **Toast Notification** (`#toastBox`) dan **Modal Dialog** (`#addModal`) di dalam halaman!
4. **Wajib Bungkus `<canvas>` Chart.js di dalam Container Bertinggi Tetap:**
   ```html
   <div class="relative h-72 w-full">
     <canvas id="trendChart"></canvas>
   </div>
   ```
   Dan di konfigurasi `new Chart(...)`, **WAJIB** menulis `responsive: true, maintainAspectRatio: false`. Tanpa ini, tinggi grafik Chart.js akan memanjang tanpa henti saat jendela diubah ukurannya!
5. **Payload Gambar Wajib Di-inline ke Base64 (`data:image/png;base64,...`) atau SVG/Canvas.** Jangan pernah memakai URL gambar acak yang bisa mati (`unsplash`, `placehold.co`, `picsum`). Gunakan `frontend_kit.py` untuk mengonversi path gambar lokal menjadi Base64 secara otomatis.
6. **Bungkus `localStorage` dengan `try { ... } catch (e) {}`** agar aplikasi tidak *crash* pada iframe dengan kebijakan penyimpanan ketat.

---

## BAGIAN 2 — Sistem Desain UI/UX (Anti-Jelek)

### 2.1 Struktur Tata Letak Dashboard Modern
- **Header Sticky Blur:** `sticky top-0 z-30 bg-white/90 dark:bg-slate-800/90 backdrop-blur border-b` berisi judul aplikasi, badge status live, dan tombol aksi utama (`+ Tambah Data`, `Ekspor CSV`, `Mode Gelap/Terang`).
- **Bar Filter & Tab Navigasi:** Di bawah header, sediakan tab tampilan serta filter langsung (`select` status + `input` pencarian instan).
- **Grid 4 Kartu KPI (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`):**
  - Label metrik: `text-xs font-semibold uppercase tracking-wider text-slate-500`
  - Nilai utama: `text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white`
  - Badge delta: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700`
- **Grid Grafik (`grid-cols-1 lg:grid-cols-3 gap-6`):**
  - Kolom kiri (`lg:col-span-2`): Kurva tren utama (`line` dengan `tension: 0.4` dan `fill: true`).
  - Kolom kanan (`lg:col-span-1`): Distribusi kategori (`doughnut`, `bar`, atau `radar`).
- **Tabel Interaktif + Simulator Slider:**
  - Sediakan `input type="range"` untuk simulasi sensitivitas/target secara langsung di atas tabel.
  - Kolom angka menggunakan `text-right font-mono` agar desimal dan ribuan sejajar rapi.

---

## BAGIAN 3 — Otomasi & Audit dengan `frontend_kit.py`

### 3.1 Membuat Dashboard Lengkap dari `spec.json`
```bash
python3 kits/frontend_kit.py spec.json dashboard.html
```

### 3.2 Mengaudit File HTML yang Ditulis Manual
Setiap kali kamu selesai menulis atau mengedit file `.html`, **wajib** jalankan:
```bash
python3 kits/frontend_kit.py --check dashboard.html
```
Auditor ini akan memeriksa:
- Apakah ada `alert(`, `confirm(`, `prompt(`?
- Apakah ada link `.css` atau `.js` lokal yang akan gagal dimuat?
- Apakah ada `document.getElementById('xyz')` yang ID `'xyz'`-nya salah ketik atau belum ada di HTML?
- Apakah ada ID yang terduplikasi?
- Apakah `Chart.js` sudah memakai `maintainAspectRatio: false`?

Perbaiki semua `errors` dan `warnings` sampai hasil audit menyatakan `"ok": true`.

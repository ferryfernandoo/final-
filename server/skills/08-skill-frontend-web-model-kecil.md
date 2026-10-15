---
name: frontend-web-kit
description: "Panduan praktis bagi model LLM kecil maupun besar untuk membuat aplikasi web dan dashboard interaktif (.html) yang cantik, responsif, punya grafik kurva Chart.js, filter pencarian, simulasi slider, modal tambah data, ekspor CSV, dan bebas tombol mati menggunakan frontend_kit.py."
---

# Frontend WebApp Kit — Panduan Mudah untuk Model Kecil & Besar

## 1. Dua Cara Kerja untuk Model Kecil

### Cara A (Paling Cepat & 100% Bebas Bug): Bangun dari `spec.json`
Untuk permintaan dashboard operasional, keuangan, penjualan, atau monitoring, tulis `spec.json` lalu jalankan:
```bash
python3 kits/frontend_kit.py spec.json aplikasi_dashboard.html
```
Hasilnya langsung berupa 1 file `.html` lengkap dengan Tailwind CSS, Chart.js (kurva spline & doughnut), 4 kartu KPI, filter status, pencarian live, slider simulasi target, modal tambah baris, hapus baris, ekspor CSV, dan tombol mode gelap/terang!

### Cara B (Untuk Aplikasi Kustom / Game / Kalkulator Unik): Tulis HTML + Cek dengan `--check`
Jika kamu menulis file `.html` sendiri, ikuti **5 Aturan Emas** di bawah lalu wajib jalankan:
```bash
python3 kits/frontend_kit.py --check aplikasi_kustom.html
```

---

## 2. Contoh `spec.json` untuk `frontend_kit.py` (Siap Salin)

```json
{
  "title": "Dashboard Kendali Produksi & Kualitas Real-Time",
  "subtitle": "Monitoring Output Harian, Kurva Tren Spline & Simulasi Kapasitas Lini",
  "accent": "indigo",
  "kpis": [
    { "label": "Total Output Q3", "value": "12.450 Unit", "delta": "+8,4% vs Q2", "positive": true },
    { "label": "Efisiensi OEE", "value": "87,4%", "delta": "+5,4% vs Target", "positive": true },
    { "label": "Kapabilitas Cpk", "value": "1,48", "delta": "Six Sigma Lulus", "positive": true },
    { "label": "Downtime Bulanan", "value": "14,2 Jam", "delta": "-28% vs Q2", "positive": true }
  ],
  "chart_labels": ["M-1", "M-2", "M-3", "M-4", "M-5", "M-6", "M-7", "M-8"],
  "chart_series": [
    { "label": "Realisasi Aktual (Unit)", "data": [1420, 1490, 1510, 1560, 1595, 1610, 1645, 1680], "color": "#4F46E5" },
    { "label": "Target Standar (Unit)", "data": [1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500], "color": "#94A3B8" }
  ],
  "pareto_labels": ["Setup Mesin", "Bahan Baku", "Sensor Kotor", "Listrik", "Lainnya"],
  "pareto_values": [42, 28, 16, 9, 5],
  "records": [
    { "id": 1, "lini": "Lini 1 - Stamping", "pic": "Ferry", "target": 4000, "aktual": 4120, "efisiensi": 88.5, "status": "Tercapai" },
    { "id": 2, "lini": "Lini 2 - Assembly", "pic": "Budi Santoso", "target": 4000, "aktual": 4350, "efisiensi": 91.2, "status": "Melampaui" },
    { "id": 3, "lini": "Lini 3 - Packaging", "pic": "Siti Rahma", "target": 4000, "aktual": 3980, "efisiensi": 82.4, "status": "Perhatian" }
  ]
}
```

---

## 3. Lima Aturan Emas Saat Menulis HTML Kustom (Agar Tidak Pernah Error)

1. **Satu file `.html` utuh.** Jangan pernah menulis `// ... sisa kode ...` atau memisah file `.css` / `.js`.
2. **Jangan pernah memakai `alert()`, `confirm()`, atau `prompt()`.** Buat `<div id="toastBox">` untuk pesan notifikasi.
3. **Setiap `getElementById('namaId')` di `<script>` wajib punya elemen `<... id="namaId">` yang sama persis huruf besar-kecilnya di HTML.**
4. **Setiap `<canvas id="myChart">` wajib berada di dalam `<div class="relative h-72 w-full">`** dan memakai `maintainAspectRatio: false`.
5. **Jalankan `python3 kits/frontend_kit.py --check nama_file.html`** sebelum menyerahkan file ke user.

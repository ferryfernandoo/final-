---
name: word-docx-kit
description: "Panduan praktis bagi model LLM kecil maupun besar untuk membuat file Word (.docx) profesional, rapi, dengan tata letak gambar pintar (banner, center, split kiri/kanan, galeri) dan grafik kurva 300-DPI cukup dengan menulis spec.json dan menjalankan word_kit.py atau docx-kit.js."
---

# Word DOCX Kit v2.0 — Panduan Mudah untuk Model Kecil & Besar

## 1. Prinsip Kerja (Sangat Mudah untuk Model Kecil)

Kamu **TIDAK PERLU** menulis kode `python-docx` atau `docx-js` yang rumit.
Cukup lakukan 3 langkah ini:
1. **Tulis file `spec.json`** berisi blok-blok dokumen (judul, paragraf, tabel, kartu KPI, gambar, atau grafik kurva).
2. **Jalankan mesin kit:**
   ```bash
   python3 kits/word_kit.py spec.json hasil.docx
   # atau: node kits/docx-kit.js spec.json hasil.docx
   ```
3. **Cek hasil gambar halamannya** dengan LibreOffice + `pdftoppm`.

---

## 2. Kamus Lengkap Blok `spec.json`

Semua blok ditaruh di dalam `"blocks": [ ... ]`. Teks mendukung `**tebal**`, `*miring*`, `[tautan](https://...)`, dan `\n`.

| Blok `"t"` | Kegunaan | Contoh JSON Siap Salin |
|---|---|---|
| `"title"` | Judul utama di atas halaman (jika tanpa cover) | `{"t": "title", "text": "LAPORAN BULANAN", "subtitle": "Oktober 2026"}` |
| `"h1"`, `"h2"`, `"h3"` | Judul Bab & Sub-bab (otomatis anti-terpisah dari paragraf bawahnya) | `{"t": "h1", "text": "1. Ringkasan Eksekutif"}` |
| `"p"` | Paragraf isi (otomatis 11pt nyaman dibaca) | `{"t": "p", "text": "Output naik **8,4%** dibanding kuartal lalu."}` |
| `"kpi_row"` | Baris kartu angka penting (2-4 kartu sejajar) | `{"t": "kpi_row", "cards": [{"label": "Output", "value": "12.450", "sub": "+8,4%"}, {"label": "Cpk", "value": "1,48", "sub": "Six Sigma"}]}` |
| `"bullets"` | Daftar poin (bisa bersarang dengan `"sub"`) | `{"t": "bullets", "items": ["Poin 1", {"text": "Poin 2", "sub": ["Sub A", "Sub B"]}]}` |
| `"numbers"` | Daftar bernomor urut (mulai dari 1) | `{"t": "numbers", "items": ["Langkah pertama", "Langkah kedua"]}` |
| `"table"` | Tabel otomatis ber-header warna tema & baris belang | `{"t": "table", "header": ["Lini", "Output"], "rows": [["Lini 1", "4.120"]], "widths": [6, 4], "align": ["left", "right"]}` |
| `"kv"` | Pasangan Kunci : Nilai (cocok untuk surat, memo, invoice) | `{"t": "kv", "lines": true, "rows": [["Nomor", "012/X/2026"], ["Perihal", "Laporan"]]}` |
| `"callout"` | Kotak sorotan / peringatan (`kind`: `"info"` atau `"warning"`) | `{"t": "callout", "kind": "warning", "title": "Penting", "text": "Batas akhir 30 Oktober."}` |
| `"curve"` | **Grafik Kurva 300-DPI Otomatis** (`spline_band`, `six_sigma_bell`, `pareto_80_20`, `s_curve`, `waterfall`, `heatmap`, `fan_forecast`, `combo_dual`, `radar_kpi`) | Lihat Bagian 3 di bawah |
| `"image"` | **Payload Gambar Pintar** (`placement`: `"center"`, `"full-banner"`, `"split-left"`, `"split-right"`) | Lihat Bagian 3 di bawah |
| `"gallery"` | Grid 2 atau 3 gambar sejajar sama besar | `{"t": "gallery", "cols": 2, "aspect_ratio": "4:3", "items": [{"path": "a.png", "caption": "Foto A"}, {"path": "b.png", "caption": "Foto B"}]}` |
| `"letterhead"` | Kop surat resmi di tengah | `{"t": "letterhead", "name": "PT CONTOH JAYA", "lines": ["Jl. Industri No. 10, Tangerang"]}` |
| `"signature"` | Blok tanda tangan anti-terpotong | `{"t": "signature", "closing": "Hormat kami,", "name": "Ferry", "title": "Manajer Operasional"}` |

---

## 3. Cara Mengatur Gambar & Kurva agar Enak Dilihat

### 3.1 Aturan Praktis Pilih Letak Gambar (`placement`)
- **Punya 1 grafik kurva atau diagram penting?** Pakai `"placement": "center"`, `"width_cm": 14.0`.
- **Punya foto gedung/banner di awal laporan?** Pakai `"placement": "full-banner"`, `"aspect_ratio": "16:9"`.
- **Punya foto alat/produk yang ingin dijelaskan di sebelahnya?** Pakai `"placement": "split-left"` (gambar di kiri, penjelasan di kanan) atau `"split-right"` (penjelasan di kiri, gambar di kanan):
  ```json
  {
    "t": "image",
    "path": "mesin_baru.png",
    "placement": "split-left",
    "aspect_ratio": "4:3",
    "rounded_px": 14,
    "side_title": "Hasil Kalibrasi Sensor Lini 2",
    "side_text": "Kalibrasi ulang menurunkan deviasi ukuran dari 1,8 mm menjadi **0,4 mm**.",
    "side_bullets": [
      "Waktu henti turun 22 menit/shift",
      "Kapabilitas proses naik ke Cpk 1,48"
    ],
    "caption": "Gambar 1. Modul sensor pada Lini 2."
  }
  ```
- **Bagaimana kalau user tidak mengunggah file gambar, tapi minta ilustrasi alur/diagram?**
  Jangan gagal! Ganti `"path"` dengan `"diagram_spec"` di dalam blok `"image"`, maka mesin akan otomatis menggambar diagram beresolusi tinggi:
  ```json
  {
    "t": "image",
    "placement": "center",
    "width_cm": 15.0,
    "diagram_spec": {
      "title": "Alur Kerja Pengendalian Mutu",
      "subtitle": "Penerimaan Bahan -> Inspeksi -> Produksi -> Audit Akhir",
      "steps": [
        {"code": "01", "title": "Bahan Baku", "desc": "Cek kadar air & sertifikat pemasok"},
        {"code": "02", "title": "Proses Lini", "desc": "Pantau suhu & kecepatan konveyor"},
        {"code": "03", "title": "Sampling QC", "desc": "Uji Six Sigma setiap 2 jam"},
        {"code": "04", "title": "Rilis Gudang", "desc": "Label QR & pencatatan batch"}
      ]
    },
    "caption": "Gambar 2. Diagram alur pengendalian mutu."
  }
  ```

### 3.2 Cara Memasukkan Grafik Kurva ("Grafik Kurva Gila") ke Word
Tambahkan blok `"t": "curve"` di `spec.json`. Pilih salah satu `"kind"`:
- `"spline_band"`: Kurva tren mulus + pita deviasi $\pm 1\sigma$ + garis target.
- `"six_sigma_bell"`: Kurva lonceng normal + histogram + batas LSL/USL + kotak Cp/Cpk otomatis.
- `"pareto_80_20"`: Batang urut menurun + kurva persentase kumulatif + garis 80%.
- `"s_curve"`: Kurva-S perbandingan Rencana (`planned`) vs Aktual (`actual`).
- `"waterfall"`: Grafik jembatan kenaikan/penurunan biaya atau laba.

Contoh blok `"curve"` siap salin:
```json
{
  "t": "curve",
  "kind": "six_sigma_bell",
  "title": "Distribusi Berat Produk & Kapabilitas Six Sigma",
  "mean": 500.2,
  "std": 1.4,
  "lsl": 495.0,
  "usl": 505.0,
  "target": 500.0,
  "width_cm": 13.8,
  "caption": "Gambar 3. Analisis distribusi normal dan indeks Cpk."
}
```

---

## 4. Checklist Anti-Gagal untuk Model Kecil
1. **Cek JSON valid** sebelum menjalankan kit:
   ```bash
   python3 -c "import json; json.load(open('spec.json')); print('JSON OK')"
   ```
2. **Jumlah kolom setiap baris `rows` di blok `table` wajib sama persis dengan jumlah `header`.**
3. **Jangan mengarang angka yang tidak diminta.** Pakai `[ISI: ...]` bila data milik user belum diketahui.
4. **Render ke PDF & PNG** untuk melihat hasilnya sebelum dikirim ke user.

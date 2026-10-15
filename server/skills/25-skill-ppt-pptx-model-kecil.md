---
name: ppt-pptx-kit
description: "Panduan praktis bagi model LLM kecil maupun besar untuk membuat presentasi PowerPoint (.pptx) 16:9 profesional dengan tata letak gambar otomatis (split-left, split-right, full-bleed), kartu KPI, kolom pilar, timeline, tabel, dan Grafik Kurva Lanjutan 300-DPI cukup dengan menulis spec.json dan menjalankan pptx_kit.py."
---

# PowerPoint PPTX Kit — Panduan Mudah untuk Model Kecil & Besar

## 1. Cara Kerja (Tanpa Pusing Hitung Koordinat Inci)

Menulis kode `python-pptx` manual rawan membuat teks bertabrakan atau gambar menutupi judul.
Dengan **`pptx_kit.py`**, kamu cukup menulis **`spec.json`** berisi daftar `"slides"`, lalu jalankan:

```bash
python3 kits/pptx_kit.py spec.json presentasi_eksekutif.pptx
```

`pptx_kit.py` otomatis mengatur ukuran slide 16:9 (`13.333" x 7.5"`), pita tata letak anti-tabrakan, *center-crop* gambar 300 DPI, dan penyematan grafik kurva!

---

## 2. Daftar 7 Tipe Slide Siap Pakai di `spec.json`

| `"type"` Slide | Kapan Dipakai | Field Utama |
|---|---|---|
| **`"cover"`** | Slide 1 (Pembuka berlatar gelap elegan) | `kicker`, `title`, `subtitle`, `meta`, opsional `image` + `image_mode` (`"right"` / `"full"`) |
| **`"kpi"`** | Menampilkan 3-4 kartu angka KPI besar + poin kesimpulan | `kicker`, `title`, `cards` (`[{"label", "value", "sub"}]`), `bullets` |
| **`"pillars"`** | Menampilkan 2 atau 3 kolom strategi/temuan sejajar | `kicker`, `title`, `boxed` (`true`/`false`), `columns` (`[{"title", "bullets": [["Kata Kunci", "Isi"]]}]`) |
| **`"split_image"`** | Gambar 50% layar (`left`/`right`) + poin penjelasan di sisi sebelahnya | `kicker`, `title`, `image_mode` (`"right"` / `"left"`), `image` (atau `diagram` / `curve`), `bullets` |
| **`"chart_slide"`** | Grafik Kurva 300-DPI di kiri + Kartu Insight di kanan | `kicker`, `title`, `curve` (objek kurva `viz_kit.py`), `insight_title`, `bullets` |
| **`"table_slide"`** | Tabel perbandingan / anggaran / jadwal yang rapi | `kicker`, `title`, `headers`, `rows` |
| **`"timeline"`** | 3-4 kartu tahapan proyek / SOP berurutan | `kicker`, `title`, `steps` (`[{"phase", "title", "desc"}]`) |
| **`"outro"`** | Slide Terakhir (Penutup berlatar gelap, 1 kalimat tesis + Terima Kasih) | `title`, `subtitle` |

---

## 3. Contoh Lengkap `spec.json` Presentasi 6 Slide (Siap Salin)

```json
{
  "theme": "navy",
  "footer": "Laporan Eksekutif Triwulan III 2026",
  "slides": [
    {
      "type": "cover",
      "kicker": "LAPORAN EKSEKUTIF OPERASIONAL",
      "title": "Transformasi Lini Produksi Meningkatkan Output 8,4%",
      "subtitle": "Evaluasi Kinerja Triwulan III 2026 & Rencana Ekspansi Otomasi",
      "meta": "Disusun oleh: Ferry, Manajer Operasional  |  15 Oktober 2026"
    },
    {
      "type": "kpi",
      "kicker": "SOROTAN KINERJA Q3 2026",
      "title": "Target Produksi Terlampaui dengan Indeks Kualitas Six Sigma",
      "cards": [
        { "label": "Total Output", "value": "12.450", "sub": "+8,4% vs Q2 (Target 12.000)" },
        { "label": "Efisiensi OEE", "value": "87,4%", "sub": "Naik dari 82,0% di Q2" },
        { "label": "Kapabilitas Cpk", "value": "1,48", "sub": "Melampaui Standar 1,33" }
      ],
      "bullets": [
        ["Kontribusi Utama", "Lini 2 menyumbang kenaikan terbesar (+9%) pasca jadwal perawatan malam."],
        ["Penghematan Biaya", "Penurunan jam henti mesin menghemat biaya lembur Rp42,5 juta."]
      ]
    },
    {
      "type": "chart_slide",
      "kicker": "ANALISIS TREN & VARIANS",
      "title": "Output Mingguan Konsisten di Atas Garis Target Sejak Minggu Ke-3",
      "curve": {
        "kind": "spline_band",
        "title": "Tren Output Mingguan (Unit) & Pita Kepercayaan ±1σ",
        "labels": ["M-1", "M-2", "M-3", "M-4", "M-5", "M-6", "M-7", "M-8"],
        "series": [
          { "name": "Realisasi Aktual", "values": [1420, 1490, 1510, 1560, 1595, 1610, 1645, 1680], "band": 35 }
        ],
        "target": 1500
      },
      "insight_title": "Temuan Utama Kurva",
      "bullets": [
        ["Akselerasi M-4", "Kalibrasi sensor optik meningkatkan output ke 1.560 unit/minggu."],
        ["Stabilitas Tinggi", "Deviasi standar menyempit menjadi ±35 unit pada paruh kedua kuartal."],
        ["Proyeksi Q4", "Kapasitas siap mendukung target baru 13.200 unit."]
      ]
    },
    {
      "type": "split_image",
      "kicker": "ARSITEKTUR KENDALI MUTU",
      "title": "Integrasi Sensor Optik Menurunkan Reject Hingga 64%",
      "image_mode": "right",
      "diagram": {
        "title": "Alur Otomasi QC Lini 2",
        "subtitle": "Inspeksi Real-Time Berbasis Sensor & Umpan Balik Otomatis",
        "steps": [
          { "code": "01", "title": "Sensor Optik", "desc": "Pemindaian dimensi 100% unit di konveyor" },
          { "code": "02", "title": "Filter Otomatis", "desc": "Pemisahan instan unit di luar batas LSL/USL" },
          { "code": "03", "title": "Log Statistik", "desc": "Perhitungan Cpk real-time per shift" }
        ]
      },
      "bullets": [
        ["Deteksi Dini", "Koreksi parameter mesin dilakukan dalam 0,2 detik saat tren mendekati USL."],
        ["Bebas Lolos Cacat", "Nol komplain pelanggan sepanjang Agustus dan September 2026."],
        ["Replikasi Lini", "Arsitektur siap dipasang di Lini 1 dan Lini 3 pada November 2026."]
      ]
    },
    {
      "type": "timeline",
      "kicker": "PETA JALAN TRIWULAN IV",
      "title": "Tiga Tahap Ekspansi Jadwal Malam dan Otomasi Sensor",
      "steps": [
        { "phase": "TAHAP 1 — OKTOBER", "title": "Persetujuan & Pengadaan", "desc": "Finalisasi anggaran Rp120 juta dan pemesanan modul sensor Lini 1 & 3." },
        { "phase": "TAHAP 2 — NOVEMBER", "title": "Instalasi & Kalibrasi", "desc": "Pemasangan perangkat pada shift akhir pekan tanpa menghentikan target harian." },
        { "phase": "TAHAP 3 — DESEMBER", "title": "Evaluasi & Audit Cpk", "desc": "Verifikasi penurunan downtime 25% dan kenaikan Cpk seluruh lini di atas 1,40." }
      ]
    },
    {
      "type": "outro",
      "title": "Kualitas yang Terukur Adalah Fondasi Pertumbuhan Berkelanjutan.",
      "subtitle": "Terima Kasih  |  Diskusi & Persetujuan Anggaran Q4 2026"
    }
  ]
}
```

---

## 4. Aturan Anti-Gagal untuk Model Kecil
1. **Judul slide jangan lebih dari 12 kata** agar selalu muat maksimal 2 baris.
2. **Maksimal 3 poin per kolom** dan setiap poin cukup 1 kalimat pendek (`["Kata Kunci", "Penjelasan singkat"]`).
3. **Jika tidak ada file foto dari user**, gunakan `"diagram": { ... }` atau `"curve": { ... }` pada slide `"split_image"` dan `"chart_slide"` agar presentasi tetap kaya visual!

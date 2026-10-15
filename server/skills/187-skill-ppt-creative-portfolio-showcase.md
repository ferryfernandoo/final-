---
name: ppt-creative-portfolio-showcase
description: "Skill perancangan presentasi PowerPoint 16:9 untuk Agensi Kreatif, Studio Desain, Peluncuran Produk, dan Showcase Portofolio Premium. Menggunakan palet Warm Sunset / Luxury Gold (#D97706, #18181B), kartu studi kasus bertaraf dunia, tipografi editorial, dan tata letak dinamis anti-membosankan."
---

# Creative Studio & Portfolio Showcase — PowerPoint Widescreen 16:9

## Prinsip Desain Showcase Kreatif
1. **Palet Elegan & Mewah (`luxury` / `sunset`):** Latar belakang berkelas dengan aksen emas hangat (`#D97706`), arang pekat (`#18181B`), dan kartu putih bersih dengan garis batas halus.
2. **Karakter Tipografi Editorial:** Judul yang berani dan percaya diri dengan ritme visual yang bervariasi.
3. **Kartu Studi Kasus & Karya:** Setiap kartu menampilkan nama proyek, peran kreatif, metrik keberhasilan kampanye, dan testimonial kunci.
4. **Sorotan Penghargaan & Pencapaian:** Mengangkat reputasi dengan metrik impresi, konversi, atau pengakuan industri.

## Template Spec JSON Showcase Portofolio
```json
{
  "theme": "luxury",
  "title": "Creative Studio Portfolio & Brand Showcase",
  "slides": [
    {
      "type": "cover",
      "kicker": "DESIGN & BRAND INNOVATION",
      "title": "Membentuk Identitas Brand yang Melekat di Ingatan",
      "subtitle": "Kompilasi Karya Pilihan & Transformasi Visual Klien 2024-2026",
      "meta": "STUDIO SHOWCASE • JAKARTA & SINGAPORE"
    },
    {
      "type": "kpi",
      "kicker": "DAMPAK KAMPANYE",
      "title": "Jangkauan & Resonansi Karya Kreatif di Pasar",
      "kpis": [
        {"label": "TOTAL IMPRESI GLOBAL", "value": "140M+", "sub": "Di 18 negara lintas benua"},
        {"label": "KENAIKAN BRAND RECALL", "value": "+62%", "sub": "Survei riset konsumen independen"},
        {"label": "PENGHARGAAN DESAIN", "value": "18 Tropi", "sub": "Termasuk D&AD dan Good Design"},
        {"label": "CLIENT RETENTION", "value": "94%", "sub": "Kemitraan jangka panjang > 3 tahun"}
      ],
      "bullets": [
        "Kampanye visual multi-channel kami meningkatkan konversi penjualan klien rata-rata 3.4x lipat.",
        "Pendekatan desain berbasis psikologi audiens menciptakan loyalitas emosional yang kuat."
      ]
    },
    {
      "type": "bento",
      "kicker": "STUDI KASUS UNGGULAN",
      "title": "Tiga Proyek Transformasi Brand Skala Nasional",
      "cards": [
        {
          "tag": "FINTECH",
          "title": "Rebranding Bank Digital",
          "stat": "2.4M",
          "stat_label": "Pengguna Baru dalam 90 Hari",
          "desc": "Merancang identitas visual, nada komunikasi, dan design system antarmuka mobile perbankan.",
          "bullets": ["Tipografi kustom berlisensi", "Aplikasi mobile berating 4.9 di Play Store"]
        },
        {
          "tag": "F&B RETAIL",
          "title": "Kemasan Kopi Berkelanjutan",
          "stat": "+140%",
          "stat_label": "Lonjakan Penjualan Rak",
          "desc": "Inovasi kemasan ramah lingkungan dengan estetika minimalis modern bernuansa lokal.",
          "bullets": ["Material 100% biodegradable", "Liputan media gaya hidup internasional"]
        },
        {
          "tag": "HOSPITALITY",
          "title": "Resort Alam & Ekowisata",
          "stat": "98%",
          "stat_label": "Tingkat Keterisian Kamar",
          "desc": "Kampanye digital terpadu dan video sinematik untuk destinasi wisata eksklusif Nusantara.",
          "bullets": ["Viral di saluran visual media sosial", "Peningkatan reservasi langsung tanpa OTA"]
        }
      ]
    },
    {
      "type": "timeline",
      "kicker": "METODOLOGI KREATIF",
      "title": "Alur Kerja Kolaboratif Menghasilkan Karya Luar Biasa",
      "steps": [
        {"phase": "FASE 1", "title": "Discovery & Riset", "desc": "Mendalami DNA brand, memetakan kompetitor, dan wawancara audiens kunci."},
        {"phase": "FASE 2", "title": "Eksplorasi Konsep", "desc": "Pengembangan 3 arah visual alternatif dengan moodboard dan purwarupa cepat."},
        {"phase": "FASE 3", "title": "Penyempurnaan Detail", "desc": "Pematangan aset terpilih, standarisasi guideline, dan uji coba kegunaan."},
        {"phase": "FASE 4", "title": "Peluncuran & Amplifikasi", "desc": "Penyerahan berkas master produksi dan pendampingan peluncuran publik."}
      ]
    },
    {
      "type": "outro",
      "title": "Mari Ciptakan Karya Ikonik Berikutnya Bersama",
      "subtitle": "hello@creativestudio.id • Konsultasi Terbuka"
    }
  ]
}
```

## Eksekusi
```bash
python kits/pptx_designer.py spec_creative.json portofolio_kreatif.pptx
```

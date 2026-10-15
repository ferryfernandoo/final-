---
name: ppt-agribisnis-peternakan-nature-modern
description: "Skill perancangan presentasi PowerPoint 16:9 modern bertema Agribisnis, Peternakan Sapi Pintar (Smart Cattle Farming 4.0), Industri Susu/Daging, dan Keberlanjutan Alam. Menggunakan palet Emerald Nature (#064E3B, #10B981), ornamen kartu bento, telemetri IoT, analisis pakan FCR, dan artikel komprehensif tanpa slide telanjang."
---

# Smart Cattle & Modern Agribusiness — PowerPoint Widescreen 16:9

## Prinsip Desain Presentasi Peternakan Sapi Modern
1. **Palet Warna Hijau Alam Premium (`emerald`):**
   - Background Sampul & Penutup: Dark Forest Emerald (`#064E3B`) dengan teks putih dan aksen hijau mint (`#10B981`).
   - Slide Isi: Mint Soft Tint (`#F0FDF4`) dengan kartu putih bergaris batas halus mint (`#BBF7D0`), menjaga nuansa organik namun tetap teknologi tinggi.
2. **Ornamen & Elemen Visual Khas Peternakan Modern:**
   - **Ear-Tag Telemetri IoT:** Kartu pemantauan sensor bio-metrik (suhu tubuh, aktivitas kunyah, GPS pasture).
   - **Robotika Kandang & Otomasi Pakan:** Sistem *Total Mixed Ration* (TMR) presisi dan rotary milking parlour.
   - **Metrik Kunci Peternakan:** ADG (*Average Daily Gain*) +1.4 kg/hari, FCR 5.8:1, Yield Susu 28.5 L/hari, Kualitas Grade A.
3. **Penyajian Artikel Lengkap (Anti Slide Telanjang):**
   - Gunakan `split` (Deep Dive Hero) untuk artikel naratif mendalam di paruh kiri dan kartu spotlight di paruh kanan.
   - Gunakan `comparison` untuk membandingkan Peternakan Konvensional vs Peternakan Modern Berkelanjutan.
   - Dilarang keras menaruh grafik sembarang (seperti kurva sinus `np.sin(x)`); semua grafik atau metrik wajib memiliki data bisnis peternakan yang relevan.

## Template Spec JSON Peternakan Sapi Modern
```json
{
  "theme": "emerald",
  "title": "Smart Cattle Farming & Modern Dairy Industry 4.0",
  "slides": [
    {
      "type": "cover",
      "kicker": "SMART LIVESTOCK 4.0",
      "title": "Transformasi Peternakan Sapi Modern Berbasis IoT & AI",
      "subtitle": "Integrasi Bio-Telemetri, Nutrisi Presisi, dan Tata Kelola Biosekuriti Ramah Lingkungan",
      "meta": "AGRIBISNIS NUSANTARA • MODERN DAIRY INITIATIVE 2026"
    },
    {
      "type": "comparison",
      "kicker": "PARADIGMA INDUSTRI",
      "title": "Perbandingan: Peternakan Tradisional vs Smart Cattle Farm",
      "col_a": {
        "tag": "SISTEM KONVENSIONAL",
        "title": "Manajemen Peternakan Manual",
        "desc": "Pemantauan visual kasat mata dengan pemberian pakan manual tanpa takaran nutrisi terukur.",
        "stat": "14-16 L",
        "stat_label": "Produksi susu rata-rata per hari per ekor",
        "bullets": [
          "Deteksi birahi dan penyakit sering terlambat",
          "Pemborosan pakan konsentrat hingga 25%",
          "Pencemaran limbah kotoran tanpa pengolahan"
        ]
      },
      "col_b": {
        "tag": "SMART CATTLE 4.0",
        "title": "Ekosistem Presisi Berbasis Sensor",
        "desc": "Ear-tag sensor mendeteksi aktivitas ruminasi, suhu tubuh, dan siklus estrus 24/7.",
        "stat": "28.5 L",
        "stat_label": "Produksi susu Grade A (+85% kenaikan)",
        "bullets": [
          "Pemberian pakan robotik TMR otomatis berbasis bobot",
          "Peringatan dini mastitis & asidosis 48 jam lebih awal",
          "Konversi limbah kotoran menjadi energi biogas terbarukan"
        ]
      }
    },
    {
      "type": "kpi",
      "kicker": "METRIK PRODUKSI & EFISIENSI",
      "title": "Indikator Kinerja Utama Peternakan Sapi Perah Modern",
      "kpis": [
        {"label": "PRODUKSI SUSU HARIAN", "value": "28.5 L", "sub": "+78% di atas standar lokal"},
        {"label": "FEED CONVERSION RATIO", "value": "1.28", "sub": "Optimalisasi formula TMR"},
        {"label": "TINGKAT KEBUNTINGAN", "value": "72.4%", "sub": "Akurasi inseminasi buatan"},
        {"label": "MORTALITAS PEDET", "value": "< 1.5%", "sub": "Protokol kolostrum digital"}
      ],
      "bullets": [
        "Pengendalian iklim mikro kandang dengan sistem ventilasi tunnel otomatis menurunkan heat stress secara signifikan.",
        "Formulasi pakan silase jagung dan fermentasi konsentrat meningkatkan kadar lemak susu hingga 4.2% dan protein 3.4%."
      ]
    },
    {
      "type": "split",
      "kicker": "ARTIKEL MENDALAM",
      "left_card": {
        "tag": "BIO-TELEMETRI SAPI",
        "title": "Arsitektur Sensor Pintar & Pemantauan Kesehatan Sapi",
        "paragraphs": [
          "Setiap sapi dilengkapi ear-tag pintar bersertifikasi IP68 dengan sensor akselerometer 3-sumbu dan termometer inframerah yang mentransmisikan data setiap 15 menit melalui jaringan LoRaWAN.",
          "Algoritma machine learning menganalisis pola ruminasi (mengunyah kembali). Penurunan durasi mengunyah di bawah 400 menit per hari langsung memicu peringatan potensi gangguan pencernaan kepada tim medis hewan."
        ],
        "bullets": [
          "Deteksi siklus estrus (birahi) dengan akurasi 96% untuk ketepatan waktu kawin suntik (IB)",
          "Pemetaan lokasi ternak di padang gembala (pasture tracking) anti-kehilangan",
          "Rekam medis digital per ekor sapi terintegrasi QR code nasional"
        ]
      },
      "right_card": {
        "stat_label": "EFISIENSI BIAYA KESEHATAN",
        "stat": "-64%",
        "highlight_title": "Pencegahan Penyakit Proaktif",
        "highlight_desc": "Intervensi dini sebelum sapi sakit parah menekan biaya pengobatan antibiotik dan mencegah penurunan produksi susu mendadak.",
        "meta_tag": "SERTIFIKASI BIOSEKURITI GRADE A"
      }
    },
    {
      "type": "bento",
      "kicker": "SARANA KANDANG MODERN",
      "title": "Empat Komponen Fasilitas Kandang Otomatis Berkelanjutan",
      "cards": [
        {
          "tag": "ROBOTIK",
          "title": "Rotary Milking Parlour",
          "stat": "300 Ekor/Jam",
          "stat_label": "Kapasitas Pemerahan",
          "desc": "Pemerahan otomatis higienis dengan sistem pencucian puting vakum dan pengujian kualitas susu real-time.",
          "bullets": ["Zero human touch", "Penyimpanan pendingin seketika 4°C"]
        },
        {
          "tag": "PAKAN",
          "title": "Automatic Feeding TMR",
          "stat": "±10 gram",
          "stat_label": "Presisi Takaran",
          "desc": "Mixer pakan terintegrasi timbangan digital yang mendistribusikan ransum secara merata sepanjang hari.",
          "bullets": ["Pencegahan pakan tercecer", "Formulasi nutrisi adaptif"]
        },
        {
          "tag": "SIRKULASI",
          "title": "Smart Climate Control",
          "stat": "22°C",
          "stat_label": "Suhu Kandang Terjaga",
          "desc": "Kipas heksagonal dan misting nozzle beroperasi otomatis saat sensor suhu dan kelembaban (THI) melebihi batas nyaman sapi.",
          "bullets": ["Bebas bau menyengat", "Lantai kandang matras karet empuk"]
        }
      ]
    },
    {
      "type": "timeline",
      "kicker": "SIKLUS KEBERLANJUTAN",
      "title": "Penerapan Sirkular Ekonomi: Zero Waste Farm",
      "steps": [
        {"phase": "TAHAP 1", "title": "Pengumpulan Slurry", "desc": "Pembersihan feses otomatis dengan scraper mekanik setiap 2 jam."},
        {"phase": "TAHAP 2", "title": "Reaktor Biodigester", "desc": "Fermentasi anaerobik menghasilkan gas metana untuk listrik mandiri."},
        {"phase": "TAHAP 3", "title": "Pemisahan Padat-Cair", "desc": "Separasi padatan untuk pupuk kompos organik premium perkebunan."},
        {"phase": "TAHAP 4", "title": "Pupuk Cair & Irigasi", "desc": "Nutrisi pupuk cair dialirkan menyuburkan lahan rumput gajah odot."}
      ]
    },
    {
      "type": "outro",
      "title": "Membangun Kedaulatan Pangan Nusantara",
      "subtitle": "Agribisnis Peternakan Berkelanjutan • Hubungi: info@smartcattle.id"
    }
  ]
}
```

## Eksekusi Mudah
```bash
python kits/pptx_designer.py spec_sapi.json presentasi_sapi_modern.pptx
```

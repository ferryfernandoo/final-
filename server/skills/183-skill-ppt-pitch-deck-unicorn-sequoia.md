---
name: ppt-pitch-deck-unicorn-sequoia
description: "Skill perancangan Pitch Deck Startup / Investor Presentation standar Sequoia Capital & Y Combinator pada PowerPoint 16:9. Meliputi Problem-Solution, TAM/SAM/SOM, Traksi Metrik, Unit Economics (LTV/CAC), Moat Kompetitif, dan The Ask."
---

# Pitch Deck Startup Unicorn (Sequoia & YC Standard) — 16:9

## Struktur Resmi Pitch Deck Standar Dunia
1. **Slide 1 — The Hook (Cover):** Pernyataan satu kalimat tentang siapa Anda dan kategori industri yang Anda revolusi.
2. **Slide 2 — The Pain Point (Problem):** Mengapa status quo saat ini sangat lambat, mahal, atau tidak efisien.
3. **Slide 3 — The Solution (Value Prop):** Solusi terobosan dengan proposisi nilai 10x lebih baik.
4. **Slide 4 — Traction & Product KPI:** Angka pertumbuhan eksponensial (MoM growth, MRR, retensi).
5. **Slide 5 — Market Size (TAM / SAM / SOM):** Validasi ukuran pasar dalam miliaran dolar.
6. **Slide 6 — Unit Economics & Business Model:** LTV, CAC, Payback Period, dan Gross Margin sehat.
7. **Slide 7 — The Ask & Use of Funds:** Target pendanaan dan alokasi modal untuk 18-24 bulan ke depan.

## Template Spec JSON Pitch Deck
```json
{
  "theme": "purple",
  "title": "Series A Investor Presentation",
  "slides": [
    {
      "type": "cover",
      "kicker": "SERIES A PITCH DECK",
      "title": "Merevolusi Komputasi Agen AI Terdesentralisasi",
      "subtitle": "Platform Infrastruktur Otonom untuk 10 Juta Pengembang Global",
      "meta": "RAISE: $12M • LED BY TOP TIER VENTURE CAPITAL"
    },
    {
      "type": "comparison",
      "kicker": "MASALAH VS SOLUSI",
      "title": "Membongkar Friksi Infrastruktur AI Tradisional",
      "col_a": {
        "tag": "STATUS QUO SAAT INI",
        "title": "Infrastruktur Tertutup & Mahal",
        "desc": "Ketergantungan tinggi pada penyedia cloud terpusat dengan biaya token yang tidak terkendali.",
        "stat": "$140K+",
        "stat_label": "Biaya inferensi bulanan rata-rata enterprise",
        "bullets": [
          "Latensi routing lintas negara lambat",
          "Kekhawatiran kebocoran data privasi",
          "Vendor lock-in yang kaku"
        ]
      },
      "col_b": {
        "tag": "SOLUSI DEEPERNOVA AI",
        "title": "Jaringan Inferensi Cerdas Terdistribusi",
        "desc": "Orkestrasi agen otonom di edge device dengan efisiensi biaya hingga 80% lebih hemat.",
        "stat": "-78%",
        "stat_label": "Penurunan belanja komputasi klien",
        "bullets": [
          "Zero data leakage via enkripsi lokal",
          "Latensi respons < 200 milidetik",
          "Arsitektur open-weights plug-and-play"
        ]
      }
    },
    {
      "type": "kpi",
      "kicker": "TRAKSI & PERTUMBUHAN",
      "title": "Kinerja Traksi 12 Bulan Terakhir (3.8x MoM)",
      "kpis": [
        {"label": "ARR SAAT INI", "value": "$4.8M", "sub": "Tumbuh 310% YoY"},
        {"label": "NET REVENUE RETENTION", "value": "142%", "sub": "Best-in-class SaaS tier"},
        {"label": "DEVELOPER TERDAFTAR", "value": "185K", "sub": "Dari 64 negara di dunia"},
        {"label": "GROSS MARGIN", "value": "86%", "sub": "Model bisnis software murni"}
      ],
      "bullets": [
        "Efisiensi modal luar biasa dengan burn multiple hanya 0.8x selama fase seed.",
        "Konversi dari freemium ke enterprise tier mencapai 9.2%, dua kali lipat rata-rata industri."
      ]
    },
    {
      "type": "bento",
      "kicker": "POTENSI PASAR",
      "title": "Peluang Pasar Global: Total Addressable Market $48B",
      "cards": [
        {
          "tag": "TAM",
          "title": "Pasar Global AI Dev",
          "stat": "$48 Miliar",
          "stat_label": "CAGR 34.2% hingga 2030",
          "desc": "Total belanja global untuk perkakas dan infrastruktur pengembangan agen kecerdasan buatan.",
          "bullets": ["Percepatan adopsi enterprise", "Migrasi dari script manual ke agen"]
        },
        {
          "tag": "SAM",
          "title": "Pasar Layanan Edge AI",
          "stat": "$14 Miliar",
          "stat_label": "Fokus Enterprise Tier 1 & 2",
          "desc": "Segmen pasar korporasi yang membutuhkan inferensi lokal dengan jaminan privasi data.",
          "bullets": ["Sektor keuangan & perbankan", "Industri kesehatan & manufaktur"]
        },
        {
          "tag": "SOM",
          "title": "Target Pangsa 3 Tahun",
          "stat": "$420 Juta",
          "stat_label": "Penetrasi Tahap Pertama",
          "desc": "Target capaian pendapatan berulang melalui kemitraan strategis dan kanal developer komunitas.",
          "bullets": ["5.000 klien korporasi aktif", "Dominasi pangsa pasar Asia & Eropa"]
        }
      ]
    },
    {
      "type": "outro",
      "title": "Membentuk Babak Baru AI Global Bersama",
      "subtitle": "invest@deepernova.ai • Silicon Valley & Jakarta"
    }
  ]
}
```

## Eksekusi
```bash
python kits/pptx_designer.py spec_pitch.json pitch_deck.pptx
```

---
name: ppt-dark-mode-tech-cyber
description: "Skill pembuatan presentasi PowerPoint berlatar gelap pekat (Dark Mode / Obsidian Cyber #0A0F1D) dengan aksen Neon Cyan (#06B6D4) & Violet (#8B5CF6). Khusus untuk tema AI, Cyber Security, Cloud Infrastructure, DeepTech, dan Developer Tooling. Tampilan super elegan dan futuristik."
---

# Dark Mode Tech & Cyber — PowerPoint Widescreen 16:9

## Karakteristik Visual Cyber Dark Mode
1. **Kanvas Gelap Obsidian:** Menggunakan latar belakang `#0A0F1D` atau `#0F172A` (Slate 900) yang nyaman di mata dan berkesan *high-tech*.
2. **Neon Glow Accents:** Aksen utama berupa Neon Cyan (`#06B6D4`) dan Electric Violet (`#8B5CF6`) pada badge, garis dekoratif, dan highlight stat.
3. **Kartu Kontainer Kaca Gelap (Dark Slate Cards):** Kartu berlatar `#1E293B` dengan garis batas kontras `#334155` (1.5pt).
4. **Metrik Cyber 40pt+:** Angka performa, TPS (Transactions per Second), tingkat mitigasi serangan, atau latency dengan warna cyan bercahaya.
5. **Keamanan & Arsitektur Zero-Trust:** Struktur kuadran atau alur pipeline tahap-demi-tahap.

## Template Spec JSON Cyber Tech
```json
{
  "theme": "cyber",
  "title": "Autonomous Cyber Defense Architecture",
  "slides": [
    {
      "type": "cover",
      "kicker": "CYBERNETIC DEFENSE 2026",
      "title": "Arsitektur Deteksi Ancaman Bertenaga AI",
      "subtitle": "Mitigasi Zero-Day & Telemetri Infrastruktur Cloud Real-Time",
      "meta": "SECURITY LABS • CONFIDENTIAL"
    },
    {
      "type": "kpi",
      "kicker": "PERFORMA OPERASIONAL",
      "title": "Metrik Efektivitas Sistem Pertahanan Siber",
      "kpis": [
        {"label": "LATENSI DETEKSI", "value": "12ms", "sub": "99.9% di bawah ambang SLA"},
        {"label": "TINGKAT AKURASI", "value": "99.98%", "sub": "False positive < 0.01%"},
        {"label": "THROUGHPUT ANGGARAN", "value": "2.4 TB/s", "sub": "Inspeksi paket real-time"},
        {"label": "AUTO-REMEDIATION", "value": "94.2%", "sub": "Tindakan mitigasi mandiri"}
      ],
      "bullets": [
        "Injeksi telemetri multi-vektor secara instan mengisolasi node terinfeksi dalam hitungan milidetik.",
        "Model neural anomaly detector dilatih pada 10 miliar pola payload eksploitasi terkini."
      ]
    },
    {
      "type": "split",
      "kicker": "DEEP DIVE TEKNOLOGI",
      "left_card": {
        "tag": "INTELIJEN MESIN",
        "title": "Pipeline Deteksi Anomali Berbasis Neural Vector",
        "paragraphs": [
          "Arsitektur inspeksi lalu lintas kami mensegmentasikan seluruh koneksi ingress ke dalam representasi vektor multidimensi berlatensi ultra-rendah.",
          "Setiap penyimpangan dari profil baseline langsung memicu orkestrasi isolasi tanpa intervensi manual dari tim SOC."
        ],
        "bullets": [
          "Deteksi mutasi malware zero-day secara heuristik",
          "Sinkronisasi ledger ancaman terenkripsi lintas node",
          "Audit trail kepatuhan ISO 27001 & SOC 2 Type II otomatis"
        ]
      },
      "right_card": {
        "stat_label": "WAKTU RESPON RATA-RATA",
        "stat": "< 0.4s",
        "highlight_title": "Kecepatan Respon Seketika",
        "highlight_desc": "Penurunan drastis dari rata-rata industri 4.5 jam menjadi di bawah satu detik penuh.",
        "meta_tag": "ZERO TRUST ARCHITECTURE"
      }
    },
    {
      "type": "timeline",
      "kicker": "ROADMAP IMPLEMENTASI",
      "title": "Tahapan Penerapan Infrastruktur Pertahanan",
      "steps": [
        {"phase": "FASE 1", "title": "Audit & Pemetaan", "desc": "Pemindaian topologi cloud dan penetapan baseline keamanan."},
        {"phase": "FASE 2", "title": "Deployment Sensor", "desc": "Pemasangan eBPF agent pada kluster Kubernetes produksi."},
        {"phase": "FASE 3", "title": "Aktivasi AI Engine", "desc": "Pelatihan model perilaku anomali dengan data lokal privat."},
        {"phase": "FASE 4", "title": "Automasi Penuh", "desc": "Orkestrasi mitigasi otomatis 24/7 tanpa henti."}
      ]
    },
    {
      "type": "outro",
      "title": "Melindungi Masa Depan Digital Anda",
      "subtitle": "Konektivitas Aman Tanpa Kompromi"
    }
  ]
}
```

## Eksekusi
```bash
python kits/pptx_designer.py spec_cyber.json hasil_cyber.pptx
```

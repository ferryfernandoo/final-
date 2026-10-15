---
name: ppt-infografis-diagram-proses-roadmap
description: "Skill perancangan slide presentasi alur proses, pipeline transformasi, roadmap proyek, dan infografis tahapan berurutan pada PowerPoint 16:9. Menggunakan nomor badge bulat, konektor visual, fase terstruktur, dan pembagian waktu tanpa teks bertabrakan."
---

# Infografis Proses & Roadmap Proyek — PowerPoint Widescreen 16:9

## Prinsip Desain Infografis Alur & Roadmap
1. **Linear Progression (Kiri ke Kanan):** Alur membaca alami manusia bergerak dari kiri ke kanan. Gunakan 3 hingga 5 kartu bertahap (`steps` / `timeline`).
2. **Badge Nomor Menonjol:** Nomor urut ditaruh di dalam lingkaran aksen berdiameter 0.65" dengan font bold kontras tinggi.
3. **Pembedaan Fase Jelas:** Setiap langkah memiliki label fase kecil di atas (`FASE 1 - INISIASI`, `Q1 2026`), judul tindakan tebal, dan uraian aksi terarah.
4. **Target Output yang Konkret:** Hindari uraian teoritis abstrak; sebutkan deliverable spesifik di setiap fase.

## Template Spec JSON Roadmap Proyek
```json
{
  "theme": "navy",
  "title": "Master Implementation Roadmap 2026-2027",
  "slides": [
    {
      "type": "cover",
      "kicker": "STRATEGIC EXECUTION",
      "title": "Roadmap Transformasi & Rencana Eksekusi",
      "subtitle": "Panduan Alur Kerja Bertahap Menuju Skalabilitas Penuh",
      "meta": "PROJECT MANAGEMENT OFFICE • VERSI 3.2"
    },
    {
      "type": "timeline",
      "kicker": "ROADMAP 4 TAHAP",
      "title": "Jadwal Peluncuran Sistem Lintas Kuartal",
      "steps": [
        {
          "phase": "Q1 2026 • FASE 1",
          "title": "Pondasi & Arsitektur",
          "desc": "Penyusunan arsitektur sistem inti, audit keamanan infrastruktur, dan finalisasi tim teknis."
        },
        {
          "phase": "Q2 2026 • FASE 2",
          "title": "Pilot & Uji Terbatas",
          "desc": "Uji coba closed beta pada 5 entitas bisnis percontohan untuk memvalidasi stabilitas transaksi."
        },
        {
          "phase": "Q3 2026 • FASE 3",
          "title": "Peluncuran Publik",
          "desc": "Rilis komersial skala penuh, onboarding mitra strategis, dan aktivasi dukungan 24/7."
        },
        {
          "phase": "Q4 2026 • FASE 4",
          "title": "Ekspansi & Optimasi",
          "desc": "Integrasi modul AI lanjutan, ekspansi pasar regional, dan efisiensi operasional berbasis data."
        }
      ]
    },
    {
      "type": "matrix",
      "kicker": "DELIVERABLE MATRIX",
      "title": "Target Capaian Berdasarkan Fungsi Operasional",
      "quadrants": [
        {"badge": "TEKNIKAL", "title": "Infrastruktur & API", "desc": "Ketersediaan kluster 99.95%, failover otomatis multi-region, dan dokumentasi API interaktif.", "bullets": ["Microservices", "Latency < 50ms"]},
        {"badge": "PRODUK", "title": "Pengalaman Pengguna", "desc": "Antarmuka responsif ramah seluler, alur checkout 3 langkah, dan onboarding tanpa friksi.", "bullets": ["UI/UX Bento", "NPS > 65"]},
        {"badge": "KEPATUHAN", "title": "Tata Kelola & Keamanan", "desc": "Sertifikasi ISO 27001, audit berkala pihak ketiga, dan enkripsi data end-to-end.", "bullets": ["SOC 2 Type II", "GDPR Ready"]},
        {"badge": "KOMERSIAL", "title": "Penetrasi Pasar", "desc": "Akuisisi 500 klien berbayar pertama dan pencapaian target profitabilitas operasional positif.", "bullets": ["CAC Payback 5 bulan", "MRR Rp 1.2M"]}
      ]
    },
    {
      "type": "outro",
      "title": "Disiplin Eksekusi, Hasil Terukur",
      "subtitle": "Bersama Menuju Keberhasilan Pelaksanaan Proyek"
    }
  ]
}
```

## Eksekusi
```bash
python kits/pptx_designer.py spec_roadmap.json roadmap_proyek.pptx
```

---
name: ppt-mckinsey-executive-consulting
description: "Skill perancangan presentasi eksekutif C-Level standar konsultan manajemen papan atas (McKinsey, BCG, Bain). Menerapkan Pyramid Principle, SCQA Framework, Action Titles yang konklusif, analisis pilar MECE, dan kartu data kuantitatif berbobot tinggi pada PowerPoint 16:9."
---

# McKinsey & BCG Executive Consulting — PowerPoint Widescreen 16:9

## Prinsip Konsultan Manajemen Papan Atas
1. **Pyramid Principle & SCQA:** Mulai dari jawaban akhir (*Answer First*). Tesis utama disampaikan di judul dan slide sampul, didukung oleh data dan pilar analitis.
2. **Action Titles Wajib:** Judul slide **bukan topik pasif** (seperti *"Analisis Pasar"*), melainkan kalimat kesimpulan aktif yang menjawab *"So What?"*:
   - ❌ Buruk: *"Data Penjualan Q3"*
   - ✔ Baik: *"Pertumbuhan Segmen Enterprise Melonjak 42%, Menutup Defisit Kanal Retail"*
3. **Pilar MECE (*Mutually Exclusive, Collectively Exhaustive*):** Argumen dibagi ke dalam 3 atau 4 kartu yang tidak tumpang tindih dan mencakup seluruh lanskap masalah.
4. **Data Callouts Tegas:** Gunakan font besar (36-40pt) untuk angka dampak finansial, efisiensi persentase, atau rasio pengembalian modal (ROI).

## Template Spec JSON McKinsey Consulting
```json
{
  "theme": "navy",
  "title": "Strategic Transformation Review",
  "slides": [
    {
      "type": "cover",
      "kicker": "EXECUTIVE BOARD BRIEFING",
      "title": "Optimasi Portofolio & Efisiensi Rantai Pasok 2026",
      "subtitle": "Rekomendasi Strategis untuk Memperlebar Marjin EBITDA Sebesar 450 Bps",
      "meta": "MANAGEMENT CONSULTING PRACTICE • CONFIDENTIAL"
    },
    {
      "type": "kpi",
      "kicker": "DAMPAK FINANSIAL",
      "title": "Potensi Penghematan Tahunan Sebesar Rp 28,4 Miliar Melalui Tiga Inisiatif",
      "kpis": [
        {"label": "EFISIENSI BIAYA OPERASIONAL", "value": "Rp 28.4 M", "sub": "Penghematan tahunan berulang"},
        {"label": "EKSPANSI MARJIN EBITDA", "value": "+450 bps", "sub": "Target terealisasi dalam 14 bulan"},
        {"label": "PAYBACK PERIOD PROYEK", "value": "7.2 Bln", "sub": "Tingkat pengembalian modal cepat"},
        {"label": "INTERNAL RATE OF RETURN", "value": "38.5%", "sub": "Jauh di atas hurdle rate 15%"}
      ],
      "bullets": [
        "Konsolidasi vendor pengadaan pihak ketiga memangkas variansi harga pembelian bahan baku hingga 14%.",
        "Automasi pemenuhan pesanan gudang sentral menurunkan siklus order-to-cash dari 9 hari menjadi 2.5 hari."
      ]
    },
    {
      "type": "bento",
      "kicker": "TIGA PILAR STRATEGIS (MECE)",
      "title": "Rencana Eksekusi Bertumpu pada Tiga Pilar Transformasi Menyeluruh",
      "cards": [
        {
          "tag": "PILAR 1",
          "title": "Rasionalisasi Rantai Pasok",
          "stat": "Rp 12.2 M",
          "stat_label": "Kontribusi Penghematan",
          "desc": "Penyederhanaan rute logistik dan renegosiasi kontrak master dengan 10 penyedia transportasi utama.",
          "bullets": ["Optimasi rute armada cerdas", "Pemberhentian gudang satelit non-produktif"]
        },
        {
          "tag": "PILAR 2",
          "title": "Automasi Operasional Inti",
          "stat": "Rp 9.6 M",
          "stat_label": "Kontribusi Penghematan",
          "desc": "Penerapan sistem ERP terpadu dan otomatisasi persetujuan anggaran transaksi harian.",
          "bullets": ["Penghapusan proses kertas manual", "Deteksi anomali invoice otomatis"]
        },
        {
          "tag": "PILAR 3",
          "title": "Reorientasi Portofolio SKU",
          "stat": "Rp 6.6 M",
          "stat_label": "Kontribusi Penghematan",
          "desc": "Penghentian 15% SKU dengan marjin negatif dan fokus belanja promosi pada produk berkinerja tinggi.",
          "bullets": ["Fokus pada top 20% produk penyumbang 80% laba", "Penurunan biaya modal kerja inventori"]
        }
      ]
    },
    {
      "type": "comparison",
      "kicker": "ANALISIS SKENARIO",
      "title": "Perbandingan Skenario Pasif vs Eksekusi Transformasi Penuh",
      "col_a": {
        "tag": "SKENARIO STATUS QUO",
        "title": "Tanpa Intervensi Manajemen",
        "desc": "Tekanan inflasi bahan baku dan inefisiensi logistik akan menggerus marjin laba secara terus menerus.",
        "stat": "-3.2%",
        "stat_label": "Penurunan marjin EBITDA proyeksi 3 tahun",
        "bullets": [
          "Biaya operasional melesat melebihi inflasi",
          "Kehilangan pangsa pasar ke kompetitor lincah",
          "Risiko pengetatan arus kas kuartalan"
        ]
      },
      "col_b": {
        "tag": "SKENARIO TRANSFORMASI",
        "title": "Eksekusi Program Penuh",
        "desc": "Implementasi terstruktur menghasilkan bantalan likuiditas kuat dan keunggulan biaya yang berkelanjutan.",
        "stat": "+4.5%",
        "stat_label": "Kenaikan marjin EBITDA bersih terverifikasi",
        "bullets": [
          "Arus kas bebas (FCF) melonjak Rp 34 Miliar",
          "Kapasitas investasi inovasi produk baru terbuka",
          "Struktur biaya jauh lebih ramping dan defensif"
        ]
      }
    },
    {
      "type": "outro",
      "title": "Keputusan Tindakan Cepat Menentukan Nilai Perusahaan",
      "subtitle": "Kemitraan Konsultasi Transformasi Eksekutif"
    }
  ]
}
```

## Eksekusi
```bash
python kits/pptx_designer.py spec_consulting.json mckinsey_deck.pptx
```

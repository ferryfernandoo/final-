---
name: ppt-academic-scientific-conference
description: "Skill perancangan presentasi PowerPoint 16:9 untuk Seminar Akademik, Konferensi Ilmiah Internasional, Sidang Tesis/Disertasi, dan Publikasi Riset. Menggunakan palet Slate & Royal Blue (#2563EB, #1E293B), tata letak hipotesis-metodologi-temuan empiris, perbandingan baseline, dan kejelasan ilmiah bebas distraksi."
---

# Academic & Scientific Conference — PowerPoint Widescreen 16:9

## Prinsip Desain Presentasi Akademik & Ilmiah
1. **Kejelasan Kognitif & Obyektivitas Ilmiah:** Palet warna tenang (`slate` dengan aksen Royal Blue `#2563EB`) yang menonjolkan bobot data tanpa distraksi visual berlebihan.
2. **Struktur Naskah Ilmiah Standar (IMRAD):**
   - **Introduction:** Latar belakang masalah, kesenjangan riset (*research gap*), dan hipotesis.
   - **Methodology:** Desain eksperimen, ukuran sampel ($N$), instrumen pengukuran, dan uji statistik.
   - **Results:** Temuan empiris kuantitatif dengan nilai signifikansi statistik ($p < 0.001$, confidence interval).
   - **Discussion & Conclusion:** Implikasi teoritis dan batas penelitian (*limitations*).
3. **Perbandingan Terhadap Baseline:** Selalu bandingkan performa model/metode yang diusulkan terhadap metode standar industri/literatur terdahulu.

## Template Spec JSON Konferensi Ilmiah
```json
{
  "theme": "slate",
  "title": "International Symposium on Advanced Computing & AI",
  "slides": [
    {
      "type": "cover",
      "kicker": "PEER-REVIEWED RESEARCH 2026",
      "title": "Optimasi Inferensi Model Bahasa Menggunakan Sparse Quantization",
      "subtitle": "Kajian Empiris Efisiensi Memori & Presisi Token pada Arsitektur Edge Devices",
      "meta": "DEPARTMENT OF COMPUTER SCIENCE • ANNUAL CONFERENCE"
    },
    {
      "type": "kpi",
      "kicker": "TEMUAN KUANTITATIF UTAMA",
      "title": "Kinerja Model yang Diusulkan Terhadap Metrik Standar Benchmark",
      "kpis": [
        {"label": "REDUKSI MEMORI VRAM", "value": "68.4%", "sub": "Dari 16 GB menjadi 5.1 GB"},
        {"label": "PENINGKATAN THROUGHPUT", "value": "3.2x", "sub": "Token per detik (tok/s)"},
        {"label": "DEGRADASI AKURASI (BLEU)", "value": "< 0.4%", "sub": "Secara statistik tidak signifikan"},
        {"label": "NILAI SIGNIFIKANSI (P-VALUE)", "value": "p < 0.001", "sub": "Uji t berpasangan (N=5000)"}
      ],
      "bullets": [
        "Metode sparsifikasi dinamis mempertahankan representasi bobot perhatian tanpa kehilangan nuansa semantik penting.",
        "Pengujian pada perangkat keras konsumsi daya rendah (15W) menunjukkan stabilitas termal prima selama 72 jam stres tes."
      ]
    },
    {
      "type": "comparison",
      "kicker": "EVALUASI METODE",
      "title": "Perbandingan Kinerja: Metode Konvensional vs Metode Sparse Terpadu",
      "col_a": {
        "tag": "BASELINE LITERATUR (POST-TRAINING INT8)",
        "title": "Kuantisasi Standar Industri",
        "desc": "Pemotongan presisi float32 ke integer 8-bit merata di seluruh lapisan transformer.",
        "stat": "74.2%",
        "stat_label": "Skor akurasi MMLU benchmark",
        "bullets": [
          "Lonjakan perplexity pada konteks dokumen panjang (>4k token)",
          "Membutuhkan kalibrasi ulang untuk setiap domain baru",
          "Konsumsi daya memori tetap tinggi pada batch size > 8"
        ]
      },
      "col_b": {
        "tag": "METODE RISET KAMI (ADAPTIVE SPARSE FP4)",
        "title": "Kuantisasi Selektif Adaptif",
        "desc": "Hanya lapisan non-kritis yang dikuantisasi agresif, mempertahankan lapisan atensi presisi tinggi.",
        "stat": "88.6%",
        "stat_label": "Skor akurasi MMLU (+14.4% lebih unggul)",
        "bullets": [
          "Zero degradation pada penalaran logis dan matematika",
          "Waktu kalibrasi 10x lebih cepat tanpa re-training data penuh",
          "Kompatibel langsung dengan akselerator NPU konsumen"
        ]
      }
    },
    {
      "type": "split",
      "kicker": "METODOLOGI EKSPERIMENTAL",
      "left_card": {
        "tag": "DESAIN RISET & DATASET",
        "title": "Protokol Pengujian Empiris & Parameter Uji",
        "paragraphs": [
          "Eksperimen dieksekusi pada 4 kluster server terisolasi dengan menggunakan variasi dataset benchmark standar internasional: GSM8K, HumanEval, dan TruthfulQA.",
          "Setiap uji inferensi diulang sebanyak 30 kali iterasi monte carlo independen untuk meminimalisir variansi latensi cache hardware."
        ],
        "bullets": [
          "Pengukuran daya listrik menggunakan wattmeter hardware presisi tinggi",
          "Pengujian mencakup variasi panjang input dari 512 hingga 32.768 token",
          "Kode eksperimen dan checkpoint bobot dirilis terbuka di GitHub"
        ]
      },
      "right_card": {
        "stat_label": "EFISIENSI ENERGI (JOULE/TOKEN)",
        "stat": "-72%",
        "highlight_title": "Keberlanjutan Komputasi Hijau",
        "highlight_desc": "Pengurangan jejak karbon pusat data inferensi secara nyata tanpa mengorbankan kecerdasan model.",
        "meta_tag": "REPRODUCIBLE RESEARCH ARTIFACT"
      }
    },
    {
      "type": "outro",
      "title": "Terima Kasih atas Perhatian Dewan Penguji & Peserta",
      "subtitle": "Sesi Tanya Jawab Terbuka • naskah lengkap tersedia di arXiv"
    }
  ]
}
```

## Eksekusi
```bash
python kits/pptx_designer.py spec_akademik.json konferensi_ilmiah.pptx
```

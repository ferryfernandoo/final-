---
name: prompt-router-meta-orchestrator
description: "Meta-Skill Orchestrator & Router untuk memilih kombinasi skill dan kit yang tepat dari Perpustakaan Skill serta menjaga konsistensi data lintas dokumen (Word + Excel + PowerPoint + PDF + WebApp)."
---

# Meta-Skill Router & Multi-Deliverable Orchestrator

## 1. Tabel Routing Cepat (Permintaan User -> Kit & Skill)
- **Word (`.docx`)**: Gunakan Skill `17` & `18` + jalankan `python3 kits/word_kit.py spec.json out.docx`.
- **Excel (`.xlsx` + Macro `.bas`)**: Gunakan Skill `20`, `21`, `22`, `23` + jalankan `python3 kits/excel_kit.py spec.json out.xlsx`.
- **PowerPoint (`.pptx` 16:9)**: Gunakan Skill `24` & `25` + jalankan `python3 kits/pptx_kit.py spec.json out.pptx`.
- **Grafik Kurva Ilmiah/Bisnis 300-DPI (`.png`)**: Gunakan Skill `26` + jalankan `python3 kits/viz_kit.py spec.json out.png`.
- **PDF Siap Cetak (`.pdf`)**: Gunakan Skill `27` + jalankan `python3 kits/pdf_kit.py spec.json out.pdf`.
- **WebApp / Dashboard Interaktif (`.html` / `.jsx`)**: Gunakan Skill `07`, `08`, `09` + jalankan `python3 kits/frontend_kit.py spec.json out.html`.
- **Aplikasi Kode / Database / API / IoT**: Gunakan Skill `01`–`05`, `10`–`16` + jalankan `python3 kits/agentic_kit.py --audit`.

## 2. Hukum Konsistensi Lintas-Dokumen (*Single Source of Truth*)
Saat membuat lebih dari satu jenis file untuk proyek yang sama:
1. Tetapkan kamus angka kunci terlebih dahulu (misal: Target = `16.200`, Realisasi = `16.960`, Capaian = `104,7%`, OEE = `88,0%`, Cpk = `1,48`, Penghematan = `Rp49.000.000`).
2. Gunakan angka yang **100% sama persis** di kartu KPI Word, rumus tabel Excel, slide PowerPoint, dokumen PDF, dan dashboard HTML.

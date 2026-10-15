---
name: pdf-report-generation-pro
description: "Skill pembuatan, pembacaan, penggabungan, dan pemecahan dokumen PDF siap cetak menggunakan pdf_kit.py, pypdf, pdfplumber, dan pypdfium2."
---

# PDF Report Generation & Manipulation Pro (`pdf_kit.py`)

## 1. Membuat PDF Baru dari `spec.json`
Gunakan `pdf_kit.py` untuk menghasilkan laporan PDF yang memiliki sampul, kartu KPI, tabel zebra, tata letak gambar `split-left`/`split-right`, dan kurva 300-DPI:
```bash
python3 kits/pdf_kit.py spec.json laporan_resmi.pdf
```
## 2. Mengaudit Hasil PDF Secara Visual
Render halaman PDF menjadi gambar PNG dengan `pypdfium2` dan periksa bahwa tidak ada tabel yang terpotong atau halaman yatim (< 50 kata).

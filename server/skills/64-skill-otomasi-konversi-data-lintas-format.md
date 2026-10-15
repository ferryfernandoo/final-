---
name: otomasi-konversi-data-lintas-format
description: "Skill konversi, pembersihan, dan sinkronisasi data lintas format (CSV <-> JSON <-> SQLite <-> Excel .xlsx <-> Markdown Table <-> HTML) secara presisi tanpa merusak format angka, tanggal, atau encoding UTF-8."
---

# Cross-Format Data Conversion & Synchronization Pipeline Pro

## Aturan Konversi Tanpa Kehilangan Presisi
1. **Pertahankan Kode Berawalan Nol (`"00124"`, Nomor Telepon `"0812..."`, Kode Pos):**
   Saat mengimpor CSV ke Pandas atau Excel, paksa kolom kode/telepon sebagai string (`dtype=str` atau format `@` di Excel) agar angka `0` di depan tidak hilang!
2. **Normalisasi Tanggal ke ISO-8601 (`YYYY-MM-DD`)** saat menyimpan ke JSON atau SQLite.
3. **Validasi Jumlah Baris & Checksum Total** sebelum dan sesudah konversi (`assert len(records_in) == len(records_out)` dan `assert round(sum_in, 2) == round(sum_out, 2)`).

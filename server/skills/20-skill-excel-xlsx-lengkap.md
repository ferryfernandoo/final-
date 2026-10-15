---
name: excel-xlsx-pro
description: "Skill lengkap untuk membangun, mengedit, dan menganalisis workbook Microsoft Excel (.xlsx / .xlsm) kelas korporat & industri. Mencakup arsitektur multi-sheet, KPI cards, rumus dinamis lintas-sheet, conditional formatting (Data Bars, Color Scales), data validation dropdown, grafik native Excel, penyematan Grafik Kurva Lanjutan 300-DPI (Spline Band, Six Sigma Bell Curve + Cpk, Pareto 80/20, S-Curve, Waterfall, Heatmap, Fan Forecast), tata letak payload gambar/grafik anti-tabrakan, serta Macro/VBA Engine (.bas & .xlsm)."
---

# Excel (.xlsx / .xlsm) Pro — Panduan Lengkap, Grafik Kurva Lanjutan & Macro Engine

Tujuan skill ini ada empat:
1. **Arsitektur finansial & operasional yang bersih.** Multi-sheet terstruktur (Dashboard Ringkasan di Sheet 1, Data Detail & Perhitungan di Sheet berikutnya), gridlines aktif, freeze panes, dan lebar kolom otomatis yang tidak merusak kartu KPI.
2. **100% Rumus Dinamis (Tanpa Angka Mati).** Semua total, rata-rata, varians, persentase capaian, dan lookup menggunakan rumus Excel asli yang dievaluasi ulang via LibreOffice Headless.
3. **Visualisasi Ganda: Native Chart + Grafik Kurva Lanjutan 300-DPI + Pengaturan Payload Gambar.** Penempatan *anchor* terhitung secara matematis sehingga grafik/gambar tidak pernah menimpa tabel.
4. **Macro / VBA Engine Siap Pakai.** Menyediakan modul `.bas` dan integrasi `.xlsm` untuk otomasi format, ekspor PDF satu klik, audit anomali Six Sigma, dan Custom UDF (`=HITUNG_CPK()`, `=STATUS_CAPAIAN()`).

---

## BAGIAN 1 — Arsitektur Workbook & Aturan Anti-Rusak

### 1.1 Struktur Multi-Sheet Standar
| Urutan Sheet | Nama Ideal | Isi Utama |
|---|---|---|
| **Sheet 1** | `Dashboard_Ringkasan` | Banner judul (`A1:H2`), 4 Kartu KPI simetris (`A4:H6`), Tabel Ringkasan Eksekutif, Grafik Native di samping tabel, dan Kurva Analisis Utama di bawahnya |
| **Sheet 2** | `Data_Operasional` / `Rincian_Biaya` | Tabel transaksi/produksi lengkap dengan rumus per baris, baris Total bergaris ganda, DataBar conditional formatting, dan dropdown Data Validation |
| **Sheet 3** | `Analisis_Kualitas_Kurva` | Metrik statistik (Mean, SD, LSL, USL, Cp, Cpk) + Grafik Kurva Six Sigma Bell Curve, Pareto 80/20, dan S-Curve / Waterfall |
| **Sheet 4** | `VBA_Macro_Engine` | Dokumentasi pintasan Macro (`Alt+F8`), panduan Custom UDF, serta kode sumber lengkap modul `.bas` |

### 1.2 Hukum Rumus Excel (Wajib Kompatibel Lintas Versi & LibreOffice)
1. **Jangan pernah menulis hasil hitungan Python sebagai angka statis di sel Total/Varians.** Selalu tulis rumus string: `=SUM(B8:B15)`, `=C8-B8`, `=IF(B8=0,0,C8/B8)`.
2. **Gunakan fungsi yang kompatibel di semua versi Excel & LibreOffice:**
   - Pakai: `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `COUNTA`, `IF`, `AND`, `OR`, `IFERROR`, `SUMIFS`, `COUNTIFS`, `INDEX`, `MATCH`, `VLOOKUP`, `SUMPRODUCT`, `STDEV.S`, `RANK`.
   - **HINDARI** fungsi array baru tanpa prefix (`XLOOKUP`, `FILTER`, `UNIQUE`, `SEQUENCE`) karena menghasilkan `#NAME?` saat dievaluasi di LibreOffice atau Excel versi lama. Gunakan kombinasi `INDEX(..., MATCH(...))` sebagai gantinya!
3. **Kutip tunggal untuk nama sheet yang mengandung spasi:** `='Data Operasional'!$D$15`. Lebih aman lagi: gunakan `_` pada nama sheet (`Data_Operasional`).

---

## BAGIAN 2 — Pengaturan Payload Gambar, Grafik & Matematika Anti-Tabrakan (*Anchor Math*)

Di Excel, grafik dan gambar mengambang di atas grid sel. Kesalahan paling sering adalah **menaruh grafik atau tabel berikutnya terlalu dekat sehingga saling menimpa**.

### 2.1 Aturan Pemilihan Tata Letak Visual di Excel

| Kondisi Tabel di Sheet | Mode Penempatan (`placement`) | Kolom/Baris Anchor | Ukuran Ideal |
|---|---|---|---|
| **Tabel Kompak ($\le 5$ kolom, misal `A:E`)** | **`side-by-side`** (Di sebelah kanan tabel) | Kosongkan 1 kolom jeda (`F`, lebar 3-4), taruh grafik di **`G{hdr_row}`** | Lebar `14 - 15 cm` (`~620 px`), Tinggi `8,5 - 9,5 cm` (`~380 px`) |
| **Tabel Lebar ($\ge 6$ kolom, misal `A:H`)** | **`stacked`** (Di bawah tabel + baris Total) | Taruh di **`A{last_table_row + 3}`** (wajib jeda 2 baris kosong penuh!) | Lebar `16 - 18 cm` (`~680 px`), Tinggi `9,0 - 10,0 cm` (`~400 px`) |
| **Dashboard 2 Kurva Berdampingan di Bawah Tabel** | **`grid-2col`** | Grafik 1 di **`A{next_safe_row}`**, Grafik 2 di **`E{next_safe_row}`** | Masing-masing lebar `13,5 cm` (`~580 px`), Tinggi `8,0 cm` (`~350 px`) |

### 2.2 Rumus Matematika *Row Clearance* (Anti-Tabrakan)
Satu baris standar Excel tingginya sekitar **`0,5 cm` (`~19-20 px`)**.
- Jika kamu menaruh **Native Chart** dengan `chart.height = H_cm` pada baris `anchor_row`:
  ```python
  chart_rows = int(math.ceil(H_cm / 0.5))
  next_safe_row = max(table_last_row, anchor_row + chart_rows) + 3  # +3 menjamin 2 baris kosong penuh!
  ```
- Jika kamu menaruh **Payload Gambar / Grafik Kurva PNG (`openpyxl.drawing.image.Image`)** dengan tinggi `img.height` (piksel) pada baris `anchor_row`:
  ```python
  img_h_cm = (img.height / 96.0) * 2.54
  img_rows = int(math.ceil(img_h_cm / 0.5))
  next_safe_row = max(table_last_row, anchor_row + img_rows) + 3
  ```
- **Aturan Auto-Fit Kolom:** Saat menghitung lebar kolom otomatis (`ws.column_dimensions[col].width`), **WAJIB melewati (skip) sel yang di-merge lintas kolom** (seperti judul `A1:H1` dan kartu KPI `A4:B6`). Jika tidak di-skip, kolom A akan melebar menjadi 80+ karakter dan merusak seluruh tata letak!

---

## BAGIAN 3 — "Grafik Kurva Gila" di Excel (Kombinasi Native + 300-DPI Scientific Curves)

Untuk analisis mendalam yang tidak bisa digambar dengan grafik standar Excel (atau tampak kaku di Excel), gunakan **`viz_kit.py`** untuk merender kurva 300-DPI lalu tempelkan dengan `XLImage` pada *anchor* yang sudah dihitung:

1. **Kurva Spline Mulus dengan Pita Kepercayaan (`spline_band`)**: Menampilkan tren mulus dengan bayangan deviasi $\pm 1\sigma$ dan anotasi titik puncak otomatis.
2. **Kurva Lonceng Six Sigma & Kapabilitas Proses (`six_sigma_bell`)**: Menampilkan histogram sampel, kurva distribusi normal $\mu \pm 4\sigma$, garis batas spesifikasi `LSL`, `USL`, `Target`, area merah *Out-of-Spec*, serta kotak perhitungan otomatis $Cp$ dan $Cpk$.
3. **Kurva Pareto 80/20 Sumbu Ganda (`pareto_80_20`)**: Mengurutkan penyebab masalah dari terbesar ke terkecil (batang warna primer untuk faktor *Vital Few* $\le 80\%$, abu-abu untuk sisanya) ditambah kurva persentase kumulatif dan garis putus-putus 80%.
4. **Kurva-S Progres Kumulatif (`s_curve`)**: Membandingkan *Baseline Rencana* vs *Realisasi Aktual* proyek/produksi.
5. **Grafik Jembatan Varians (`waterfall`)**: Menunjukkan kontribusi kenaikan (hijau) dan penurunan (merah) dari angka awal ke angka akhir.
6. **Kipas Proyeksi Probabilitas (`fan_forecast`)**: Data historis diikuti proyeksi median P50 beserta rentang ketidakpastian 80% dan 95%.

---

## BAGIAN 4 — VBA / Macro Engine Mendalam

Setiap kali user meminta kemampuan Macro / VBA / otomasi di Excel:
1. **Gunakan `excel_kit.py`** yang otomatis membangkitkan:
   - Sheet khusus `VBA_Macro_Engine` di dalam workbook (berisi tabel dokumentasi Sub/UDF dan kode sumber lengkap).
   - File modul **`.bas`** pendamping (`NamaFile_Macros.bas`) dengan header standar `Attribute VB_Name = "ModAutoFormat"` yang langsung siap diimpor ke Excel (`Alt + F11` -> `File` -> `Import File`) atau disuntikkan ke `.xlsm`.
2. **4 Modul Macro & UDF Standar yang Wajib Dikuasai:**
   - `AutoFormatActiveSheet` (`Sub`): Merapikan seluruh font, auto-fit kolom dengan batas aman `[12..42]`, dan menyalakan gridlines.
   - `ExportSheetToPDF` (`Sub`): Mengatur `PageSetup` ke Landscape 1 halaman lebar (`FitToPagesWide = 1`) dan langsung mengekspor PDF ke folder kerja.
   - `HighlightOutliersTwoSigma` (`Sub`): Menghitung `Average` dan `StDev_S` dari range yang diblok user, lalu mewarnai merah sel yang melampaui $\mu \pm 2\sigma$.
   - `HITUNG_CPK(USL, LSL, Mean, StdDev)` & `STATUS_CAPAIAN(Aktual, Target)` (`Function` UDF): Fungsi rumus kustom yang bisa langsung dipanggil di sel seperti rumus bawaan Excel.

---

## BAGIAN 5 — Pipeline Build, Recalculate & Validasi Visual Wajib

Jangan pernah menyerahkan file `.xlsx` sebelum menjalankan tahapan ini:

```bash
# 1. Bangun workbook & evaluasi rumus via excel_kit.py
python3 kits/excel_kit.py spec.json output.xlsx

# 2. Konversi ke PDF & PNG untuk inspeksi visual tata letak
libreoffice --headless --convert-to pdf output.xlsx
pdftoppm -png -r 150 output.pdf sheet_preview
```

Periksa setiap `sheet_preview-*.png`:
- [ ] Tidak ada `#REF!`, `#NAME?`, `#VALUE!`, `#DIV/0!`, atau `Err:509`.
- [ ] Tidak ada angka yang berubah menjadi `###` karena kolom kurang lebar.
- [ ] Grafik native maupun kurva 300-DPI berada tepat di samping atau di bawah tabel tanpa menimpa satu pun baris teks/angka.
- [ ] Kartu KPI di atas rata dan simetris dengan lebar tabel utama.

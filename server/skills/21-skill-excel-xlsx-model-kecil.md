---
name: excel-xlsx-kit
description: "Panduan praktis bagi model LLM kecil maupun besar untuk membuat file Excel (.xlsx) lengkap dengan multi-sheet dashboard, KPI cards, rumus dinamis otomatis, conditional formatting DataBar, grafik native, Grafik Kurva Lanjutan 300-DPI (Spline, Six Sigma Cpk, Pareto 80/20, S-Curve, Waterfall), tata letak gambar anti-tabrakan, dan Macro VBA (.bas) cukup dengan menulis spec.json dan menjalankan excel_kit.py."
---

# Excel XLSX Kit — Panduan Mudah untuk Model Kecil & Besar

## 1. Mengapa Pakai `excel_kit.py`?

Jika menulis kode `openpyxl` dari nol, model kecil sering lupa:
- Mengatur lebar kolom hingga muncul `###` atau kolom A melebar 100 karakter gara-gara judul yang di-*merge*.
- Menaruh grafik menimpa baris Total tabel.
- Menulis angka mati bukannya rumus `=SUM(...)`.

Dengan **`excel_kit.py`**, kamu cukup menulis **`spec.json`**, lalu jalankan:
```bash
python3 kits/excel_kit.py spec.json laporan_produksi.xlsx
```
Mesin `excel_kit.py` akan otomatis:
1. Membuat multi-sheet lengkap dengan banner judul, kartu KPI, dan tabel ber-rumus.
2. Mengganti `{row}`, `{first}`, dan `{last}` di dalam rumus dengan nomor baris Excel yang tepat!
3. Menghitung jarak aman baris (*row clearance*) agar grafik native, kurva 300-DPI, dan gambar **tidak pernah menimpa tabel**.
4. Menjalankan LibreOffice Headless untuk menghitung nilai semua rumus.
5. Menghasilkan modul Macro VBA (`_Macros.bas`) + sheet dokumentasi `VBA_Macro_Engine`.

---

## 2. Struktur Dasar `spec.json` untuk `excel_kit.py`

```json
{
  "theme": "navy",
  "include_macro_sheet": true,
  "macros": ["AutoFormatReport", "ExportDashboardPDF", "HighlightAnomalies", "CustomUDFs"],
  "sheets": [
    {
      "name": "Dashboard_Utama",
      "title": "DASHBOARD OPERASIONAL & KUALITAS TRIWULAN III 2026",
      "subtitle": "Ringkasan KPI, Realisasi per Lini, Analisis Varians & Kurva Tren",
      "master_cols": 8,
      "freeze_panes": "A9",
      "kpis": [
        { "label": "Total Output", "value": "=Data_Produksi!D12", "format": "#,##0", "sub": "Target: 12.000 Unit" },
        { "label": "Rata-rata Efisiensi", "value": "=Data_Produksi!F12", "format": "0.0%", "sub": "Standar Minimum 85%" },
        { "label": "Indeks Cpk Lini", "value": 1.48, "format": "0.00", "sub": "Six Sigma Kapabel (≥1.33)" },
        { "label": "Penghematan Biaya", "value": 42500000, "format": "\"Rp\"#,##0", "sub": "+12,4% vs Q2" }
      ],
      "tables": [ ... ],
      "native_charts": [ ... ],
      "curves": [ ... ],
      "notes": ["Seluruh angka total dihitung otomatis menggunakan rumus Excel."]
    }
  ]
}
```

---

## 3. Cara Menulis Tabel & Rumus Otomatis (`{row}`, `{first}`, `{last}`)

Di dalam `"tables"`, kamu tidak perlu menebak di baris ke berapa tabelmu dimulai!
Gunakan:
- **`{row}`** di dalam `rows` untuk menunjuk baris saat ini (misal: `"=C{row}-B{row}"` atau `"=IF(B{row}=0,0,C{row}/B{row})"`).
- **`"SUM"`** atau **`"AVERAGE"`** di dalam `totals`, atau rumus dengan **`{first}`** dan **`{last}`** (misal: `"=SUM(C{first}:C{last})/SUM(B{first}:B{last})"`).

Contoh Tabel Lengkap dengan Rumus, DataBar, dan Dropdown:
```json
{
  "id": "tbl_produksi",
  "section_title": "1. Realisasi Produksi & Efisiensi per Lini",
  "headers": ["Lini Produksi", "Target (Unit)", "Realisasi (Unit)", "Selisih (Unit)", "Capaian (%)", "Status"],
  "formats": ["@"," #,##0", "#,##0", "+#,##0;-#,##0;0", "0.0%", "@"],
  "align": ["left", "right", "right", "right", "right", "center"],
  "rows": [
    ["Lini 1 - Stamping", 4000, 4120, "=C{row}-B{row}", "=C{row}/B{row}", "=IF(E{row}>=1.05,\"MELAMPAUI\",IF(E{row}>=1,\"TERCAPAI\",\"PERHATIAN\"))"],
    ["Lini 2 - Assembly", 4000, 4350, "=C{row}-B{row}", "=C{row}/B{row}", "=IF(E{row}>=1.05,\"MELAMPAUI\",IF(E{row}>=1,\"TERCAPAI\",\"PERHATIAN\"))"],
    ["Lini 3 - Packaging", 4000, 3980, "=C{row}-B{row}", "=C{row}/B{row}", "=IF(E{row}>=1.05,\"MELAMPAUI\",IF(E{row}>=1,\"TERCAPAI\",\"PERHATIAN\"))"]
  ],
  "totals": ["Total / Rata-rata", "SUM", "SUM", "SUM", "=C{row}/B{row}", "=IF(E{row}>=1,\"TERCAPAI\",\"PERHATIAN\")"],
  "conditional_formats": [
    { "col": 5, "type": "databar", "min": 0 }
  ],
  "dropdowns": [
    { "col": 6, "options": ["MELAMPAUI", "TERCAPAI", "PERHATIAN", "KRITIS"] }
  ]
}
```

---

## 4. Cara Menambahkan Grafik Native & "Grafik Kurva Gila" 300-DPI

### 4.1 Grafik Native Excel (`native_charts`)
Cocok untuk grafik batang/garis standar yang terhubung ke sel tabel:
```json
"native_charts": [
  {
    "table_id": "tbl_produksi",
    "type": "bar",
    "title": "Perbandingan Target vs Realisasi per Lini",
    "category_col": 1,
    "value_cols": [2, 3],
    "placement": "side-by-side",
    "width_cm": 14.5,
    "height_cm": 8.5
  }
]
```
- Jika tabel $\le 5$ kolom, gunakan `"placement": "side-by-side"` (otomatis ditaruh di kanan tabel dengan jarak 1 kolom kosong).
- Jika tabel $\ge 6$ kolom, gunakan `"placement": "stacked"` (otomatis ditaruh di bawah tabel dengan jarak aman 2 baris kosong).

### 4.2 Grafik Kurva Ilmiah & Bisnis 300-DPI (`curves`)
Pilih salah satu `"kind"` berikut di dalam array `"curves"`:
1. **`"spline_band"`**: Kurva mulus + pita deviasi $\pm 1\sigma$ + garis target + anotasi puncak.
2. **`"six_sigma_bell"`**: Kurva lonceng distribusi normal + histogram + batas LSL/USL + kotak Cp & Cpk.
3. **`"pareto_80_20"`**: Grafik Pareto batang menurun + kurva kumulatif % + garis 80%.
4. **`"s_curve"`**: Kurva-S progres rencana vs aktual.
5. **`"waterfall"`**: Grafik jembatan kenaikan/penurunan nilai.
6. **`"heatmap"`**: Peta panas matriks shift x lini dengan angka di tiap kotak.
7. **`"fan_forecast"`**: Kurva historis + kipas proyeksi probabilitas 80% & 95%.
8. **`"combo_dual"`**: Grafik batang + kurva mulus sumbu ganda.

Contoh menambahkan 2 kurva canggih di bawah tabel:
```json
"curves": [
  {
    "kind": "spline_band",
    "title": "Kurva Tren Output Mingguan & Pita Deviasi (±1σ)",
    "labels": ["M-1", "M-2", "M-3", "M-4", "M-5", "M-6", "M-7", "M-8"],
    "series": [
      { "name": "Output Aktual (Unit)", "values": [1420, 1490, 1510, 1560, 1595, 1610, 1645, 1680], "band": 35 }
    ],
    "target": 1500,
    "placement": "stacked",
    "display_width_px": 620
  },
  {
    "kind": "pareto_80_20",
    "title": "Analisis Pareto 80/20 Penyebab Downtime Mesin",
    "labels": ["Setup Awal", "Bahan Baku", "Sensor Kotor", "Listrik", "Operator"],
    "values": [145, 92, 48, 25, 15],
    "placement": "right-col",
    "display_width_px": 620
  }
]
```

---

## 5. Tabel Error & Solusi Cepat

| Gejala / Masalah | Penyebab | Solusi di `spec.json` |
|---|---|---|
| Muncul `#NAME?` di sel rumus | Memakai `XLOOKUP` atau fungsi yang tidak didukung LibreOffice | Ganti dengan `INDEX/MATCH`, `VLOOKUP`, `SUMIFS`, atau `IF` |
| Muncul `#REF!` atau rumus salah baris | Menulis nomor baris manual yang meleset | Gunakan placeholder `{row}`, `{first}`, dan `{last}` |
| Grafik menimpa tabel di kanan | Tabel punya $\ge 6$ kolom tapi grafik diset `side-by-side` | Ubah `"placement"` grafik menjadi `"stacked"` |
| JSON gagal dibaca | Ada komentar `//` atau koma di elemen terakhir | Cek dengan `python3 -c "import json; json.load(open('spec.json'))"` |

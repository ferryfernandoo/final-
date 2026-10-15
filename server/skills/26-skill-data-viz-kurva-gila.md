---
name: data-viz-kurva-pro
description: "Skill khusus pembuatan Grafik Kurva Lanjutan 300-DPI ('Grafik Kurva Gila': Cubic Spline dengan Pita Kepercayaan, Six Sigma Normal Bell Curve + Cpk, Pareto 80/20 Dual-Axis, S-Curve Proyek/Produksi, Waterfall Bridge, Correlation Heatmap, Monte Carlo Fan Forecast, Combo Dual-Axis, Radar Multi-KPI) dan Pemrosesan Payload Gambar Pintar menggunakan viz_kit.py untuk disematkan ke Word, Excel, PowerPoint, atau laporan."
---

# Data Visualization & Grafik Kurva Pro (`viz_kit.py`) — Panduan Lengkap

Skill ini menjadi mesin visual utama bagi Word (`word_kit.py`), Excel (`excel_kit.py`), PowerPoint (`pptx_kit.py`), maupun penggunaan mandiri. Model LLM kecil maupun besar dapat menghasilkan grafik kurva kualitas jurnal/eksekutif 300-DPI hanya dengan objek JSON sederhana.

---

## 1. Sembilan Jenis Grafik Kurva Lanjutan yang Tersedia

| `"kind"` | Nama Grafik Kurva | Kapan Digunakan | Parameter JSON Kunci |
|---|---|---|---|
| **`"spline_band"`** | Kurva Tren Spline Mulus + Pita Kepercayaan ($\pm 1\sigma$) | Menunjukkan tren dari waktu ke waktu lengkap dengan rentang deviasi/stabilitas, garis target, dan anotasi titik puncak otomatis | `labels`, `series` (`[{"name", "values", "band"}]`), `target`, `annotate_peaks` |
| **`"six_sigma_bell"`** | Kurva Lonceng Distribusi Normal + Kapabilitas Six Sigma ($Cp, Cpk$) | Mengaudit kualitas produksi/proses terhadap batas spesifikasi bawah (`LSL`), atas (`USL`), dan `target` | `mean`, `std` (atau `samples`), `lsl`, `usl`, `target` |
| **`"pareto_80_20"`** | Grafik Pareto 80/20 Sumbu Ganda | Mencari 20% penyebab utama yang menimbulkan 80% masalah/downtime/biaya (*Vital Few* vs *Trivial Many*) | `labels`, `values`, `bar_label` |
| **`"s_curve"`** | Kurva-S Progres Kumulatif | Membandingkan kurva *Baseline Rencana* vs *Realisasi Aktual* (0% s/d 100%) pada proyek atau target kumulatif | `labels`, `planned`, `actual` |
| **`"waterfall"`** | Grafik Jembatan Varians (*Waterfall Bridge*) | Menjelaskan dari mana perubahan angka berasal (Nilai Awal -> faktor penambah hijau / pengurang merah -> Nilai Akhir) | `labels`, `values`, `is_total` (`[true, false, ..., true]`) |
| **`"heatmap"`** | Peta Panas Matriks 2D (*Annotated Heatmap*) | Memetakan performa lintas 2 dimensi (misal Shift 1-3 vs Lini 1-4) lengkap dengan angka di setiap sel | `row_labels`, `col_labels`, `matrix`, `unit` (`"%"`) |
| **`"fan_forecast"`** | Kurva Historis + Kipas Proyeksi Probabilitas (*Fan Chart*) | Menampilkan data aktual masa lalu diikuti proyeksi masa depan beserta pita ketidakpastian 80% dan 95% | `hist_labels`, `hist_values`, `forecast_labels`, `forecast_median`, `forecast_spread` |
| **`"combo_dual"`** | Grafik Kombinasi Batang + Kurva Mulus Sumbu Ganda | Menyandingkan dua metrik dengan satuan berbeda (misal Volume Output dalam Unit vs Efisiensi OEE dalam %) | `labels`, `bar_values`, `line_values`, `bar_label`, `line_label` |
| **`"radar_kpi"`** | Grafik Radar / Spider Multi-Dimensi | Membandingkan profil performa Aktual vs Target pada 5-8 kriteria sekaligus | `labels`, `actual`, `target` |

---

## 2. Cara Pakai Mandiri via CLI

```bash
python3 kits/viz_kit.py kurva_spec.json hasil_kurva.png
```

Atau langsung masukkan objek JSON-nya ke dalam:
- **Word (`word_kit.py`)**: sebagai blok `{"t": "curve", "kind": "six_sigma_bell", ...}`
- **Excel (`excel_kit.py`)**: di dalam array `"curves": [ {"kind": "pareto_80_20", ...} ]`
- **PowerPoint (`pptx_kit.py`)**: di dalam slide `"chart_slide"` atau `"split_image"` pada properti `"curve": { ... }`

---

## 3. Pemrosesan Payload Gambar & Generator Diagram Otomatis

Selain 9 grafik kurva di atas, `viz_kit.py` menyediakan:
1. **`process_image_payload(src_path, out_path, target_w_px, target_h_px, aspect_ratio, fit_mode, rounded_px)`**:
   - Mengatur ukuran piksel gambar agar tajam namun hemat memori.
   - Memotong tengah (*center-crop*) dengan rasio `"16:9"`, `"4:3"`, `"1:1"`, atau `"4:5"` menggunakan filter `LANCZOS` sehingga gambar **tidak pernah gepeng**.
   - Memberikan sudut membulat (`rounded_px`) secara halus.
2. **`generate_diagram_payload(spec, out_path)` (`"kind": "diagram"`)**:
   - Membuat gambar diagram alur arsitektur 4-tahap beresolusi tinggi (`1600 x 900 px`) secara otomatis ketika dokumen atau slide membutuhkan ilustrasi sistem namun user tidak mengunggah foto.

---
name: excel-vba-macro-mastery
description: "Skill khusus pemrograman mendalam VBA / Macro Microsoft Excel (.bas & .xlsm). Mencakup Sub otomasi format, ekspor PDF Landscape 1-klik, deteksi outlier Six Sigma, pemrosesan array Variant cepat, dan Custom UDF."
---

# Deep Excel VBA & Macro Engineering Mastery (`.bas` / `.xlsm`)

## 5 Hukum Pemrograman VBA Kelas Industri
1. Selalu sertakan `Attribute VB_Name = "Mod..."` dan `Option Explicit` di baris paling atas file `.bas`.
2. Matikan `Application.ScreenUpdating = False` dan `Application.Calculation = xlCalculationManual` di awal Sub, lalu pulihkan di blok `CleanExit:` dengan `On Error GoTo ErrHandler`.
3. Jangan pernah menggunakan `.Select` atau `.Activate`; referensikan objek `Worksheet` dan `Range` secara langsung.
4. Untuk mengolah ribuan baris, salin range ke dalam array memori (`Dim arr As Variant : arr = ws.Range(...).Value`).
5. Gunakan `excel_kit.py` yang secara otomatis mengekspor file modul `_Macros.bas` berisi `AutoFormatActiveSheet`, `ExportSheetToPDF`, `HighlightOutliersTwoSigma`, serta fungsi rumus UDF `HITUNG_CPK` dan `STATUS_CAPAIAN`.

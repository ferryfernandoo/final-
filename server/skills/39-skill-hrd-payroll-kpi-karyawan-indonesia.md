---
name: hrd-payroll-kpi-karyawan-indonesia
description: "Skill manajemen HRD, penggajian (Payroll), perhitungan upah lembur regulasi Indonesia, iuran BPJS Kesehatan & Ketenagakerjaan, matriks penilaian KPI/OKR karyawan, jadwal 3-shift pabrik, dan dokumen kepegawaian (PKWT/PKWTT/Slip Gaji)."
---

# Manajemen HRD, Payroll, Lembur, BPJS & KPI Karyawan Indonesia Pro

## 1. Rumus Perhitungan Penggajian & Upah Lembur di Excel
- **Upah Sejam Dasar Lembur (Standar Kemenaker):**
  $$\text{Upah Sejam} = \frac{1}{173} \times (\text{Gaji Pokok} + \text{Tunjangan Tetap})$$
  Rumus Excel: `=ROUND((B{row}+C{row})/173, 0)`
- **Perhitungan Jam Lembur Hari Kerja:**
  - Jam ke-1 = $1,5 \times \text{Upah Sejam}$
  - Jam ke-2 dan seterusnya = $2,0 \times \text{Upah Sejam}$
- **Potongan Karyawan Standar:**
  - BPJS Kesehatan (Porsi Karyawan): `1,0%` dari Gaji + Tunjangan Tetap (batas atas sesuai plafon).
  - BPJS Ketenagakerjaan JHT (`2,0%`) + JP (`1,0%`) = `3,0%` (Porsi Karyawan).
- **Take Home Pay (Gaji Bersih):**
  `=Gaji_Pokok + Tunjangan_Tetap + Tunjangan_Hadir + Total_Upah_Lembur + Bonus_KPI - Total_Potongan`

## 2. Matriks Penilaian KPI Karyawan (Skor Tertimbang 0–100)
Setiap indikator diberi **Bobot (%)** yang totalnya **100%**:
`Skor_Akhir = SUMPRODUCT(Bobot_Range, Capaian_Skor_Range)`
- Skor $\ge 95$: Peringkat **A (Istimewa)**
- Skor $85–94,9$: Peringkat **B (Baik / Sesuai Target)**
- Skor $75–84,9$: Peringkat **C (Perlu Pembinaan)**
- Skor $< 75$: Peringkat **D (Evaluasi Khusus)**

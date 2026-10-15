---
name: retail-inventory-gudang-logang-logistik
description: "Skill manajemen gudang, inventaris retail/pabrik, supply chain, dan logistik: kartu stok FIFO/FEFO, Reorder Point (ROP), Safety Stock, klasifikasi ABC Pareto persediaan, Stock Opname, dan Surat Jalan."
---

# Manajemen Gudang, Inventaris (FIFO/FEFO/ROP) & Logistik Pro

## 1. Rumus Pengendalian Persediaan di Excel & Sistem Gudang
- **Safety Stock (Stok Pengaman 95% Service Level):**
  `Safety_Stock = 1.65 * StdDev_Pemakaian_Harian * SQRT(Lead_Time_Hari)`
- **Reorder Point (Titik Pesan Ulang / ROP):**
  `ROP = (Rata_Pemakaian_Harian * Lead_Time_Hari) + Safety_Stock`
- **Status Stok Otomatis di Excel:**
  `=IF(Stok_Akhir <= Safety_Stock, "DARURAT PESAN", IF(Stok_Akhir <= ROP, "PESAN ULANG", "AMAN"))`
- **Inventory Turnover Ratio (Perputaran Persediaan):**
  `=HPP_Tahunan / Rata_Rata_Nilai_Persediaan`

## 2. Klasifikasi ABC Pareto Barang Gudang
- **Kelas A (70%–80% Nilai Rupiah, ~15%–20% SKU):** Hitung fisik (*cycle count*) setiap minggu, kontrol ketat.
- **Kelas B (15%–20% Nilai Rupiah, ~30% SKU):** Hitung fisik setiap bulan.
- **Kelas C (5% Nilai Rupiah, ~50% SKU):** Beli dalam jumlah cukup banyak agar tidak kehabisan item murah (baut, label, plastik kemasan).

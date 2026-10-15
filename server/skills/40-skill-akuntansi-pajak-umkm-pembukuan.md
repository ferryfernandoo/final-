---
name: akuntansi-pajak-umkm-pembukuan
description: "Skill akuntansi praktis, pembukuan UMKM & korporat, Jurnal Umum, Buku Besar, Neraca Saldo, Laporan Laba-Rugi, Neraca (Balance Sheet), Laporan Arus Kas, penyusutan aset tetap, dan rekonsiliasi kas/bank."
---

# Akuntansi Praktis, Pembukuan & Laporan Keuangan Pro

## 1. Persamaan Dasar & Keseimbangan Wajib
$$\text{Total Aset (Aktiva)} = \text{Total Liabilitas (Kewajiban)} + \text{Total Ekuitas (Modal)}$$
Di setiap tabel Neraca Excel, tambahkan baris kontrol keseimbangan:
`=IF(ABS(Total_Aktiva - Total_Pasiva) < 1, "SEIMBANG (BALANCE)", "SELISIH: " & TEXT(Total_Aktiva - Total_Pasiva, "#,##0"))`

## 2. Struktur Standar Laporan Laba-Rugi (*Income Statement*)
1. **Pendapatan Usaha Kotor (*Gross Revenue*)** dikurangi Retur & Diskon = **Pendapatan Bersih (*Net Revenue*)**.
2. Dikurangi **Harga Pokok Penjualan / HPP (*COGS*)** = **Laba Kotor (*Gross Profit*)**.
3. Dikurangi **Beban Operasional (*OPEX*: Gaji, Listrik, Sewa, Pemasaran, Penyusutan)** = **Laba Operasional (*EBIT*)**.
4. Dikurangi Beban Bunga & Pajak = **Laba Bersih (*Net Profit*)**.

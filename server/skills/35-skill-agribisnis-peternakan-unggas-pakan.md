---
name: agribisnis-peternakan-unggas-pakan
description: "Skill lengkap manajemen agribisnis & peternakan unggas (bebek petelur/pedaging, ayam layer/broiler, puyuh): formulasi ransum pakan (Pearson Square, Protein Kasar %, Energi Metabolisme), perhitungan HDP (Hen Day Production), FCR (Feed Conversion Ratio), mortalitas, HPP per butir/ekor, dan pembukuan kandang."
---

# Agribisnis & Peternakan Unggas Pro (Formulasi Pakan, HDP, FCR & HPP)

Skill ini memandu pembuatan laporan, spreadsheet pembukuan kandang, proposal kemitraan, dan kalkulator pakan untuk peternakan unggas (bebek/ayam).

## 1. Rumus Kunci Produksi Peternakan (Wajib Dipakai di Excel & Kode)
- **HDP (*Hen Day Production* / Persentase Bertelur Harian):**
  $$\text{HDP (\%)} = \frac{\text{Jumlah Telur Hari Ini (Butir)}}{\text{Jumlah Populasi Bebek/Ayam Hidup Hari Ini (Ekor)}} \times 100\%$$
  Rumus Excel: `=IF(B{row}=0, 0, C{row}/B{row})`
- **FCR (*Feed Conversion Ratio* / Konversi Pakan):**
  $$\text{FCR} = \frac{\text{Total Pakan Dihabiskan (kg)}}{\text{Total Berat Telur atau Bobot Badan Dihasilkan (kg)}}$$
  *(Semakin kecil FCR semakin efisien; bebek petelur unggul berkisar 2,4–2,8).*
- **Mortalitas (Tingkat Kematian %):**
  $$\text{Mortalitas (\%)} = \frac{\text{Jumlah Mati/Afkir}}{\text{Populasi Awal}} \times 100\%$$
- **HPP per Butir Telur (Rp/Butir):**
  $$\text{HPP} = \frac{\text{Biaya Pakan Harian} + \text{Biaya Tenaga Kerja} + \text{Penyusutan Bibit/Kandang} + \text{Vitamin/OVK}}{\text{Jumlah Telur Dihasilkan}}$$

## 2. Formulasi Ransum Pakan (Metode *Pearson Square* & Campuran Multi-Bahan)
Kebutuhan standar bebek petelur fase produksi: **Protein Kasar (PK) 17%–19%**, Energi Metabolisme **2.700–2.850 kkal/kg**, Kalsium (Ca) **3,2%–3,8%**.
Contoh komposisi praktis 100 kg pakan campuran:
- Jagung giling (PK ~8,5%): `45 kg`
- Dedak padi halus / bekatul (PK ~11,0%): `25 kg`
- Konsentrat bebek petelur / tepung ikan (PK ~36,0%): `26 kg`
- Tepung batu kapur (*grit* kulit kerang) + Premix mineral: `4 kg`
- **Total = 100 kg** dengan PK terhitung: $(0,45 \times 8,5) + (0,25 \times 11,0) + (0,26 \times 36,0) = 15,93\% \approx 16\%–18\%$ (sesuaikan rasio konsentrat).

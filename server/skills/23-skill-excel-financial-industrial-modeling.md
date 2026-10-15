---
name: excel-financial-industrial-modeling
description: "Skill pemodelan finansial (Laba-Rugi, NPV, IRR, Payback Period, Break-Even) dan pemodelan teknik industri/manufaktur (OEE, Six Sigma Cp/Cpk, Takt Time, EOQ, Safety Stock) menggunakan rumus Excel dinamis."
---

# Financial & Industrial Manufacturing Modeling Pro (Excel)

## Kamus Rumus Wajib di `excel_kit.py`
- **Capaian (%)**: `=IF(B{row}=0, 0, C{row}/B{row})`
- **Varians**: `=C{row}-B{row}`
- **Indeks Kapabilitas $C_p$**: `=IF(F{row}=0, 0, (D{row}-B{row})/(6*F{row}))` *(B=LSL, D=USL, F=SD)*
- **Indeks Kapabilitas $C_{pk}$**: `=MIN((D{row}-E{row})/(3*F{row}), (E{row}-B{row})/(3*F{row}))` *(E=Mean)*
- **OEE (%)**: `=Availability * Performance * Quality`
- **EOQ (Unit Pesanan Ekonomis)**: `=SQRT((2*Demand_Tahunan*Biaya_Pesan)/Biaya_Simpan)`
- **NPV & IRR**: `=NPV(Diskonto, C10:G10)+B10` dan `=IRR(B10:G10)`

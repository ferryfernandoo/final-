---
name: python-data-science-pandas-numpy
description: "Skill pengolahan data, ETL pipeline, pembersihan data kotor, deteksi outlier IQR/Z-Score, dan analisis statistik menggunakan pandas, numpy, dan scipy secara vektorisasi."
---

# Python Data Science, ETL & Statistical Analysis Pro

## 4 Hukum Vektorisasi Pandas & NumPy
1. **Hindari `df.iterrows()`:** Gunakan operasi kolom vektorisasi dan `np.where(df["target"] > 0, df["realisasi"] / df["target"] * 100.0, 0.0)`.
2. **Hindari `SettingWithCopyWarning`:** Selalu panggil `.copy()` saat memfilter subset DataFrame yang akan dimodifikasi.
3. **Pembersihan Numerik & Tanggal Aman:** Gunakan `pd.to_numeric(s, errors="coerce").fillna(0.0)` dan `pd.to_datetime(s, errors="coerce")`.
4. **Agregasi Terstruktur:** Gunakan `df.groupby("lini", as_index=False).agg(total_target=("target", "sum"), rata_oee=("oee", "mean"))`.

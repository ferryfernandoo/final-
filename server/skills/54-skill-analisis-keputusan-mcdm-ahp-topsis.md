---
name: analisis-keputusan-mcdm-ahp-topsis
description: "Skill Sistem Pendukung Keputusan Multi-Kriteria (MCDM): metode TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution), AHP, Weighted Product, dan Matriks Pugh untuk pemilihan vendor, mesin, lokasi, atau investasi."
---

# Multi-Criteria Decision Making (MCDM: TOPSIS, AHP & Weighted Scoring) Pro

Ketika user meminta bantuan memilih opsi terbaik (misal: *"Pilih 1 dari 4 vendor mesin otomatis berdasarkan Harga, Kecepatan, Garansi, dan Konsumsi Listrik"*), jangan hanya memberi opini kualitatif! Gunakan **Metode TOPSIS Matematis**:

## Langkah Algoritma TOPSIS
1. Susun matriks keputusan $X_{ij}$ ($i$ = alternatif, $j$ = kriteria) beserta bobot $w_j$ ($\sum w_j = 1$) dan jenis kriteria (`"benefit"` = makin besar makin baik, atau `"cost"` = makin murah/kecil makin baik).
2. Normalisasi vektor: $r_{ij} = \frac{x_{ij}}{\sqrt{\sum_i x_{ij}^2}}$ dan matriks terbobot $v_{ij} = w_j \cdot r_{ij}$.
3. Tentukan solusi ideal positif $A^+$ dan negatif $A^-$.
4. Hitung jarak Euclidean $D_i^+$ dan $D_i^-$, lalu skor preferensi $C_i = \frac{D_i^-}{D_i^+ + D_i^-} \in [0, 1]$. Skor tertinggi adalah peringkat #1!

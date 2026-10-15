---
name: sql-database-query-optimization
description: "Skill perancangan database relasional (SQLite, PostgreSQL, MySQL), normalisasi skema, indeks, CTE, Window Functions (Pareto kumulatif & ranking), serta kueri berparameter anti-SQL Injection."
---

# SQL & Database Architecture Pro

## 5 Hukum Kueri SQL Produksi
1. **100% Parameterized Queries:** Gunakan `?` (SQLite) atau `%s` (PostgreSQL) dengan tuple argumen: `conn.execute("SELECT * FROM log WHERE lini = ?", (lini,))`.
2. **Gunakan `COALESCE` dan `NULLIF`:** Cegah hasil `NULL` dan pembagian nol:
   `ROUND(CAST(SUM(realisasi) AS REAL) * 100.0 / NULLIF(SUM(target), 0), 2) AS capaian_pct`.
3. **Gunakan CTE (`WITH ... AS`)** agar kueri bertingkat mudah dibaca dan diuji per tahap.
4. **Gunakan Window Functions untuk Analisis Pareto Kumulatif:**
   `SUM(jam_henti) OVER (ORDER BY jam_henti DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) * 100.0 / SUM(jam_henti) OVER ()`.
5. **Tambahkan `CHECK` Constraint dan `INDEX`** pada kolom pencarian utama (`lini`, `tanggal`, `status`).

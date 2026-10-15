---
name: debugging-root-cause-analysis
description: "Skill sistematis untuk men-debug error, membaca stack trace dari bawah ke atas, mengisolasi bug tersembunyi, dan melakukan Root-Cause Analysis (RCA) pada Python, JavaScript, SQL, HTML/CSS, dan konversi dokumen."
---

# Systematic Debugging & Root-Cause Analysis (RCA) Pro

Jangan menebak saat memperbaiki bug. Ikuti metode ilmiah: **Reproduce -> Isolate -> Read Stack Trace Bottom-Up -> Fix Root Cause -> Add Regression Test.**

## Katalog 10 Bug Klasik & Solusi Permanennya
1. **Fungsi mengembalikan `None`:** Lupa menulis `return` atau menulis `return my_list.sort()` (`list.sort()` mengembalikan `None`; gunakan `sorted(my_list)`).
2. **Default list menyimpan isi panggilan sebelumnya (`def fn(a, items=[]):`):** Ganti dengan `items=None` lalu `if items is None: items = []`.
3. **`ZeroDivisionError` pada rata-rata atau persentase:** Selalu tulis `if penyebut == 0: return 0.0` di baris paling atas perhitungan.
4. **SQL `SUM()` mengembalikan `None` pada tabel kosong:** Bungkus dengan `COALESCE(SUM(kolom), 0)` dan `NULLIF(penyebut, 0)`.
5. **`getElementById` mengembalikan `null` di JS:** Pastikan ID sama persis (peka huruf besar-kecil) dan jalankan script di dalam `window.addEventListener('DOMContentLoaded', ...)`.
6. **Grafik Chart.js memanjang tanpa henti:** Bungkus `<canvas>` di dalam `<div class="relative h-72 w-full">` dan set `maintainAspectRatio: false`.
7. **Kolom A di Excel melebar 100 karakter:** Saat menghitung auto-fit lebar kolom, lewati semua sel yang masuk ke dalam `ws.merged_cells.ranges`.
8. **LibreOffice Headless macet saat konversi paralel:** Gunakan profil terisolasi `-env:UserInstallation=file:///tmp/lo_prof_$$` dan `--headless --nologo --nolockcheck --norestore`.
9. **Gambar di Word/PPT gepeng:** Gunakan `PIL.ImageOps.fit` untuk *center-crop* atau hanya kirim parameter `width` saja ke `add_picture`.
10. **Float presisi biner (`0.1 + 0.2 = 0.30000000000000004`):** Bulatkan hasil akhir dengan `round(val, 2)` atau gunakan `decimal.Decimal`.

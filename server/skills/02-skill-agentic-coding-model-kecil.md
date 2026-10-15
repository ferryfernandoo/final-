---
name: agentic-coding-model-kecil
description: "Protokol Agentic Coding khusus untuk model LLM kecil (3B, 7B, 8B parameter) agar mampu merencanakan, menulis kode panjang tanpa lupa konteks, menghindari halusinasi library, menguji otomatis, dan memperbaiki bug sendiri menggunakan agentic_kit.py."
---

# Agentic Coding untuk Model Kecil — Protokol 4 Kartu Memori & Self-Healing

## 1. Mengapa Model Kecil Butuh Protokol Khusus?
Model kecil sering lupa nama variabel yang baru dibuat 50 baris sebelumnya atau panik saat melihat pesan error panjang. Ikuti **Protokol 4 Kartu Memori** ini agar hasil kodemu setajam model besar.

## 2. Tulis "Kartu Memori Agen" di Baris Paling Atas File Kode
Setiap kali mulai menulis file `.py` atau `.js`, tulis komentar 8 baris ini di bagian paling atas:
```python
#!/usr/bin/env python3
"""
[KARTU MEMORI AGEN]
1. TUJUAN     : Menghitung kapabilitas Six Sigma (Cp, Cpk) dan menyimpan ke SQLite.
2. DATA UTAMA : ProduksiRecord(id, lini, shift, target, realisasi, reject)
3. FUNGSI     :
   - tambah(rec) -> int
   - ambil_semua(lini_filter) -> List[ProduksiRecord]
   - ringkasan_per_lini() -> List[Dict]
   - test_repository() -> None
4. ATURAN     : Hanya pakai standard library (sqlite3, dataclasses, math, statistics).
"""
```
Karena blok ini berada di puncak file, perhatian (*attention*) model akan selalu terkunci pada nama variabel dan fungsi yang benar!

## 3. Gunakan Mesin Scaffolder (`agentic_kit.py --scaffold`)
Jangan mulai dari nol! Gunakan fondasi yang sudah diuji:
```bash
python3 kits/agentic_kit.py --scaffold sqlite_repo app_db.py
python3 kits/agentic_kit.py --scaffold etl_pipeline app_etl.py
```

## 4. Siklus Self-Healing 3 Langkah
Setelah menulis kode, wajib jalankan:
```bash
python3 kits/agentic_kit.py --audit file_kamu.py
```
1. Baca `"errors"` dan `"repair_hints"` yang keluar.
2. Perbaiki **HANYA** fungsi pada nomor baris yang ditunjuk (jangan hapus fungsi lain yang sudah benar).
3. Jalankan `--audit` lagi sampai `"ok": true`.

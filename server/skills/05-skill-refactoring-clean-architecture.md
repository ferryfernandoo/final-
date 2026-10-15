---
name: refactoring-clean-architecture
description: "Skill untuk merefaktor kode berantakan (spaghetti code) menjadi arsitektur modular yang bersih, mudah dipelihara, mudah diuji, dan aman tanpa mengubah perilaku eksternal yang sudah berjalan."
---

# Clean Architecture & Behavior-Preserving Refactoring Pro

## 1. Tiga Lapisan Arsitektur Bersih (Wajib Dipisahkan)
1. **Lapisan Model & Validasi (`models`):** `@dataclass` dan fungsi validasi skema input.
2. **Lapisan Logika Inti Murni (`core` / `services`):** Fungsi matematika/bisnis murni yang menerima objek data dan mengembalikan objek data (tanpa `input()`, tanpa baca/tulis file, tanpa jaringan).
3. **Lapisan Infrastruktur & I/O (`adapters`):** Pembaca/penulis file JSON, CSV, SQLite, Excel, Word, PPT, atau Web UI.

## 2. Prosedur Aman Merefaktor Kode Milik User
1. Buat *Characterization Test* yang merekam output dari kode lama untuk 3 sampel input.
2. Ekstrak konstanta angka ajaib (*magic numbers*) ke bagian atas file.
3. Ganti `if-else` bersarang dalam (>3 tingkat) dengan *Guard Clauses* (`if not valid: return ...`).
4. Pecah fungsi panjang (>50 baris) menjadi fungsi-fungsi kecil bernama deskriptif.
5. Jalankan `python3 kits/agentic_kit.py --audit` untuk memastikan output tetap 100% identik dan bebas regresi.

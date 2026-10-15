---
name: coding-software-pro
description: "Skill lengkap rekayasa perangkat lunak (Software Engineering) untuk menulis, merefaktor, men-debug, dan menguji kode produksi (Python, JavaScript/TypeScript, SQL, Bash, C/C++/ESP32, Backend API). Mencakup arsitektur modular bersih, pengetikan eksplisit (Type Hints), pertahanan error, larangan mutlak placeholder/kode terpotong, serta verifikasi AST & unit test otomatis via coding_kit.py."
---

# Coding & Software Engineering Pro — Panduan Arsitektur, Kualitas Kode & Verifikasi Otomatis

Tujuan skill ini ada empat:
1. **Kode Utuh & Siap Jalan (*Zero Placeholder*).** Tidak pernah menyerahkan potongan kode berlubang seperti `// TODO`, `# implement here`, atau `...`.
2. **Arsitektur Bersih & Modular.** Fungsi pendek dengan satu tanggung jawab jelas (*Single Responsibility*), nama variabel deskriptif, *type hints* eksplisit, dan pemisahan konfigurasi, logika inti, serta I/O.
3. **Tangguh & Aman (*Defensive & Secure*).** Validasi input di pintu masuk fungsi, penanganan *edge-case* (data kosong, pembagian nol, timeout jaringan), kueri SQL berparameter (anti-SQL Injection), dan tanpa kredensial *hardcoded*.
4. **Teruji Secara Deterministik.** Setiap modul disertai blok *self-test* yang dieksekusi dan diverifikasi dengan `coding_kit.py --verify` sebelum diserahkan ke user.

---

## BAGIAN 1 — Standar Penulisan Kode Lintas Bahasa

### 1.1 Python (Data, Backend, Otomasi, AI/ML)
- Gunakan **Type Hints** pada tanda tangan fungsi: `def hitung_efisiensi(aktual: float, target: float) -> float:`.
- Gunakan `dataclass` atau `TypedDict` untuk struktur data ketimbang *dictionary* bersarang tanpa skema.
- Tangani pembagian nol dan nilai `None` secara eksplisit:
  ```python
  from dataclasses import dataclass

  @dataclass(frozen=True)
  class MetrikLini:
      nama: str
      target: int
      realisasi: int

      @property
      def capaian_persen(self) -> float:
          if self.target <= 0:
              return 0.0
          return round((self.realisasi / self.target) * 100.0, 2)
  ```

### 1.2 JavaScript / TypeScript & Node.js
- Gunakan `'use strict';`, `const` secara default, dan `let` hanya bila variabel diubah. Jangan pakai `var`.
- Selalu gunakan `async/await` dengan blok `try / catch` yang memberi pesan error bermakna (sebutkan konteks dan nilai parameter yang gagal).

### 1.3 Embedded Systems / C++ / ESP32 / IoT
- Hindari pemakaian `delay()` panjang di dalam `loop()`; gunakan pola non-blocking `millis()` timer agar pembacaan sensor dan komunikasi serial/WiFi tidak membeku.
- Validasi pembacaan sensor (`isnan(val)`) sebelum mengirim payload telemetri atau menggerakkan aktuator/relay.

### 1.4 SQL & Database
- **Selalu gunakan Parameterized Queries** (`cursor.execute("SELECT * FROM produksi WHERE lini = ?", (nama_lini,))`). Dilarang keras menyambung string input user dengan f-string di dalam SQL.
- Sertakan indeks (`CREATE INDEX idx_...`) pada kolom yang sering dipakai di `WHERE`, `JOIN`, dan `ORDER BY`.

---

## BAGIAN 2 — Siklus Kerja 4 Tahap (Anti-Bug)

1. **Rancang Kontrak Data (Input -> Output):** Tentukan struktur data masuk, keluar, dan kasus batas (*edge cases*: `0`, `null`, array kosong, angka negatif).
2. **Tulis Fungsi Inti secara Modular:** Maksimal 30-40 baris per fungsi. Jika lebih panjang, pecah menjadi fungsi bantu (*helper*).
3. **Sertakan Blok Self-Test (`if __name__ == "__main__":`):** Tulis minimal 3 pengujian (kasus normal, kasus batas/kosong, dan kasus error).
4. **Jalankan Verifikasi `coding_kit.py`:**
   ```bash
   python3 kits/coding_kit.py --verify nama_script.py
   ```
   Pastikan output menunjukkan `"ok": true`, `"errors": []`, dan `"warnings": []`.

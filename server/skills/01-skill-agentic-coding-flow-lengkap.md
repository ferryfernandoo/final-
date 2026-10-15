---
name: agentic-coding-flow-pro
description: "Skill utama untuk alur kerja Agentic Coding tingkat lanjut (Plan -> Decompose -> Contract -> Build -> Verify -> Self-Heal Loop). Pakai setiap kali membangun aplikasi, sistem multi-file, refaktor kode besar, atau mengotomasi penyelesaian bug secara otonom."
---

# Agentic Coding Flow Pro — Siklus Otonom 6-Fase (Plan → Contract → Build → Verify → Self-Heal)

Skill ini mengubah LLM dari penulis potongan kode sekali jalan menjadi **Agen Rekayasa Perangkat Lunak Otonom** yang merencanakan, menulis kontrak data, membangun secara bertahap, menjalankan pengujian deterministik, membaca *stack trace*, dan menyembuhkan bug sendiri (*self-healing*) hingga 100% lulus uji.

## 1. Siklus 6 Fase Agentic Coding (Wajib Berurutan)

1. **Fase 1 — Understand & Inspect:** Periksa direktori kerja, versi runtime (`python3 --version`, `node -v`), dan batasan lingkungan (apakah berjalan di sandbox tanpa internet, apakah satu file atau multi-file).
2. **Fase 2 — Decompose & Plan:** Pecah tugas menjadi 3–5 unit atomik:
   - Unit 1: Kontrak Data (`@dataclass` / skema input-output)
   - Unit 2: Mesin Logika Murni (*Pure Core Logic* tanpa I/O)
   - Unit 3: Lapisan Penyimpanan / File / Database (`sqlite3` / JSON / Office)
   - Unit 4: Antarmuka CLI / UI
   - Unit 5: Fungsi Pengujian Otomatis (`def test_*()`)
3. **Fase 3 — Data Contract First:** Tulis `@dataclass` dan tanda tangan fungsi lengkap dengan *type hints* di bagian atas file sebelum menulis isi algoritma.
4. **Fase 4 — Atomic Build + Self-Test:** Setiap fungsi maksimal 25–40 baris. Sertakan blok `test_*()` yang menguji kasus normal, kasus kosong/nol (`0`, `[]`, `None`), dan kasus batas.
5. **Fase 5 — Verify & Self-Heal Loop (Maksimal 3 Putaran):**
   Jalankan `python3 kits/agentic_kit.py --audit path_file.py`. Jika gagal, baca nomor baris pada traceback dan `repair_hints`, perbaiki hanya fungsi yang rusak, lalu uji ulang.
6. **Fase 6 — Deliver Verified Artifact:** Serahkan kode hanya setelah seluruh pengujian otomatis mencetak `PASSED` dan `"ok": true`.

## 2. Pola Kode Tangguh (Guard Clauses & Atomic File Write)

```python
import json, os, tempfile
from dataclasses import dataclass

@dataclass(frozen=True)
class MetrikOperasional:
    lini: str
    target: int
    realisasi: int
    reject: int = 0

    @property
    def capaian_pct(self) -> float:
        if self.target <= 0:
            return 0.0
        return round((self.realisasi / self.target) * 100.0, 2)

def simpan_json_atomik(data: dict, target_path: str) -> str:
    folder = os.path.dirname(os.path.abspath(target_path))
    os.makedirs(folder, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=folder, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, target_path)
        return target_path
    except Exception:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise
```

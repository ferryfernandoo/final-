---
name: coding-kit-model-kecil
description: "Panduan khusus agar model LLM kecil (parameter rendah/menengah) tetap bisa mengoding Python, JavaScript, HTML, SQL, dan C++/ESP32 dengan sangat baik, bebas halusinasi API, tidak memotong kode, dan selalu lolos uji lewat coding_kit.py."
---

# Coding Kit untuk Model Kecil — Formula Mengoding Rapi & Bebas Error

## 1. Mengapa Model Kecil Sering Gagal Saat Mengoding? (Dan Cara Mengatasinya)

Model LLM berukuran kecil sering mengalami 4 masalah ini:
1. **Membuat fungsi terlalu panjang** sehingga lupa menutup kurung `}` / `)` di akhir.
2. **Mengarang nama fungsi/library** yang sebenarnya tidak ada (halusinasi API).
3. **Menulis `// TODO: lanjutkan di sini`** karena kehabisan fokus.
4. **Tidak mencoba menjalankan kodenya** sebelum dikirim ke user.

Ikuti **5 Hukum Besi Model Kecil** di bawah ini agar kodemu setara dengan model besar!

---

## 2. Lima Hukum Besi Mengoding untuk Model Kecil

### Hukum 1: Satu Fungsi Maksimal 25 Baris
Jangan pernah menulis satu fungsi raksasa berisi 150 baris. Pecah menjadi fungsi-fungsi kecil yang namanya jelas:
- `baca_data(path)`
- `validasi_baris(baris)`
- `hitung_ringkasan(daftar_baris)`
- `simpan_laporan(ringkasan, out_path)`

### Hukum 2: Hanya Pakai Pustaka Standar (Standard Library) Kecuali Diminta
Agar tidak pernah terkena error `ModuleNotFoundError`:
- **Python:** Utamakan `json`, `csv`, `math`, `statistics`, `pathlib`, `datetime`, `sqlite3`, `re`, `collections`, `dataclasses`, `unittest`. (Untuk Office/Grafik gunakan `openpyxl`, `docx`, `pptx`, `matplotlib`, `PIL`, `numpy`, `scipy`, `pandas`).
- **JavaScript:** Utamakan API bawaan (`fs`, `path`, `Array.map/filter/reduce`, `fetch`, `JSON`).

### Hukum 3: Dilarang Keras Menulis `TODO`, `FIXME`, `pass`, atau `// ...`
Setiap fungsi yang kamu tulis **harus selesai 100%**. Jika user meminta fitur yang kompleks, buat implementasi yang sederhana namun **benar-benar berjalan**, bukan kerangka kosong.

### Hukum 4: Selalu Tambahkan Fungsi `test_otomatis()` di Bawah File
Sebelum menutup file kode, tambahkan pengujian otomatis singkat dengan `assert`:
```python
def test_otomatis():
    assert hitung_capaian(4200, 4000) == 105.0
    assert hitung_capaian(0, 0) == 0.0
    print("Semua pengujian lulus!")

if __name__ == "__main__":
    test_otomatis()
```

### Hukum 5: Wajib Jalankan `coding_kit.py --verify`
Setelah menyimpan file kode ke disk, jalankan perintah ini di terminal:
```bash
python3 kits/coding_kit.py --verify kode_kamu.py
```
- Jika `"ok": true` dan `"warnings": []` -> Kode siap diserahkan!
- Jika ada `SYNTAX_ERROR`, `RUNTIME_TEST_FAILED`, atau `PLACEHOLDER_CHECK` -> Baca nomor baris yang salah, perbaiki bagian itu saja, lalu jalankan `--verify` lagi.

---

## 3. Template Kerangka Kode Anti-Gagal (Siap Salin)

### 3.1 Kerangka Python Bersih + Self-Test
```python
#!/usr/bin/env python3
"""Deskripsi singkat modul."""

from dataclasses import dataclass
from typing import List, Dict, Any


@dataclass
class ItemData:
    nama: str
    target: float
    aktual: float

    @property
    def selisih(self) -> float:
        return round(self.aktual - self.target, 2)

    @property
    def persen_capaian(self) -> float:
        if self.target <= 0:
            return 0.0
        return round((self.aktual / self.target) * 100.0, 2)


def ringkas_data(items: List[ItemData]) -> Dict[str, Any]:
    if not items:
        return {"total_target": 0.0, "total_aktual": 0.0, "rata_capaian": 0.0}
    tot_t = sum(x.target for x in items)
    tot_a = sum(x.aktual for x in items)
    rata = round((tot_a / tot_t) * 100.0, 2) if tot_t > 0 else 0.0
    return {"total_target": tot_t, "total_aktual": tot_a, "rata_capaian": rata}


def test_modul() -> None:
    sampel = [
        ItemData("Lini 1", 4000, 4120),
        ItemData("Lini 2", 4000, 4350),
    ]
    hasil = ringkas_data(sampel)
    assert hasil["total_target"] == 8000
    assert hasil["total_aktual"] == 8470
    assert hasil["rata_capaian"] == 105.88
    assert ringkas_data([])["rata_capaian"] == 0.0
    print("SELF-TEST OK:", hasil)


if __name__ == "__main__":
    test_modul()
```

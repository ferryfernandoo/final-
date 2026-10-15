---
name: tdd-testing-qa-automation
description: "Skill lengkap Test-Driven Development (TDD), pembuatan unit test, integration test, boundary/edge-case testing, dan QA deterministik untuk Python, JavaScript, SQL, dan dokumen Office."
---

# TDD, Automated Testing & Quality Assurance (QA) Pro

Setiap fungsi wajib diuji terhadap **Matriks 5 Kasus Uji (The 5-Point Test Matrix)** sebelum diserahkan:

| # | Kategori Uji | Input yang Diuji | Tujuan |
|---|---|---|---|
| 1 | **Happy Path** | Data realistis (3-5 baris normal) | Memastikan rumus utama menghasilkan angka tepat |
| 2 | **Empty / Zero** | `[]`, `""`, `0`, `0.0`, `None` | Mencegah `ZeroDivisionError`, `IndexError`, `TypeError` |
| 3 | **Single Element** | `[100.0]` (hanya 1 sampel) | Mencegah `StatisticsError` pada perhitungan standar deviasi |
| 4 | **Boundary / Exact** | Tepat di batas `LSL`, `USL`, `100%` | Mencegah *off-by-one bug* (`<` vs `<=`) |
| 5 | **Invalid Input** | Angka negatif, tipe salah | Memastikan fungsi melempar `ValueError` yang jelas |

## Contoh Kerangka Self-Test Python Tanpa Dependency Eksternal
```python
def hitung_diskon(total: float, vip: bool = False) -> float:
    if total < 0:
        raise ValueError("Total tidak boleh negatif")
    if total == 0:
        return 0.0
    rate = 0.15 if total >= 1_000_000 else (0.08 if total >= 500_000 else 0.0)
    if vip:
        rate += 0.05
    return round(total * (1.0 - rate), 2)

def test_hitung_diskon() -> None:
    assert hitung_diskon(600_000, False) == 552_000.0
    assert hitung_diskon(1_000_000, True) == 800_000.0
    assert hitung_diskon(0, True) == 0.0
    try:
        hitung_diskon(-100)
        assert False, "Seharusnya melempar ValueError"
    except ValueError:
        pass
    print("ALL TESTS PASSED!")
```

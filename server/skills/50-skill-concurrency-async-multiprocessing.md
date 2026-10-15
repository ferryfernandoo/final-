---
name: concurrency-async-multiprocessing
description: "Skill pemrograman paralel dan asinkron di Python (concurrent.futures ThreadPoolExecutor, ProcessPoolExecutor, asyncio) dan JavaScript (Promise.all, async/await) beserta pencegahan deadlock dan race condition."
---

# Concurrency, Asyncio & Parallel Processing Pro

## Tabel Keputusan: Kapan Pakai Thread vs Process vs Asyncio?
| Jenis Beban Kerja | Alat yang Tepat di Python | Alasan |
|---|---|---|
| **I/O-Bound** (Baca/tulis banyak file, request jaringan/database) | `ThreadPoolExecutor(max_workers=8)` atau `asyncio.gather()` | Thread melepas GIL saat menunggu I/O dan hemat memori |
| **CPU-Bound** (Komputasi matriks berat, pengolahan ribuan gambar) | `ProcessPoolExecutor()` atau vektorisasi `numpy` | Melewati batas GIL dengan proses terpisah |

Selalu gunakan `timeout` pada `future.result(timeout=30)` agar pekerja yang macet tidak membekukan program utama!

---
name: cli-tui-tool-builder-python
description: "Skill pembuatan aplikasi Command-Line Interface (CLI) profesional di Python menggunakan argparse, subcommands, format tabel terminal rapi, dukungan output --json, dan kode keluar (exit codes) standar."
---

# Professional CLI Tool Builder Pro (`argparse` & Structured Output)

## Aturan Desain CLI Kelas Produksi
1. Selalu sediakan `argparse.ArgumentParser(description=...)` dengan contoh pemakaian di `epilog`.
2. Sediakan flag `--json` agar output CLI bisa dikonsumsi baik oleh manusia (tabel rapi) maupun oleh skrip/agen lain (JSON murni).
3. Tulis pesan error ke `sys.stderr` dan kembalikan kode keluar `0` untuk sukses, `1` untuk error eksekusi, dan `2` untuk argumen tidak valid.

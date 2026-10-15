---
name: regex-text-parsing-log-analyzer
description: "Skill pembuatan Regular Expressions (Regex) presisi tinggi, parser log server/mesin industri, pembersihan CSV/teks berantakan, dan ekstraksi entitas terstruktur (tanggal, nominal Rupiah, kode part, IP/MAC)."
---

# Regex Mastery, Text Parsing & Log Analyzer Pro

## Kumpulan Pola Regex Teruji (Python `re`)
- **Ekstraksi Nominal Rupiah (`Rp12.450.000` -> `12450000`):**
  `re.compile(r"Rp\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+)")`
- **Ekstraksi Tanggal ISO atau Indonesia (`2026-10-15` / `15 Oktober 2026`):**
  `re.compile(r"\b(\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]+\s+\d{4})\b")`
- **Parser Baris Log Mesin (`[2026-10-15 08:15:22] [WARN] [LINI-02] Temp=78.4C`):**
  `re.compile(r"^\[(?P<ts>[^\]]+)\]\s+\[(?P<level>[A-Z]+)\]\s+\[(?P<unit>[^\]]+)\]\s+(?P<msg>.+)$")`
- **Aturan Anti-Backtracking (*ReDoS Defense*):** Jangan gunakan kuantifier bersarang seperti `(a+)+`; gunakan kelas karakter spesifik `[^\]\r\n]+`.

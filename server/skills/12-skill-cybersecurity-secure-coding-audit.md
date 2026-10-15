---
name: cybersecurity-secure-coding-audit
description: "Skill keamanan aplikasi (AppSec) & Defensive Coding berdasarkan OWASP Top 10 untuk mencegah SQL Injection, XSS, Command Injection, Path Traversal, dan eksekusi kode berbahaya."
---

# Cybersecurity & Secure Coding Audit Pro (OWASP Top 10 Defense)

## Aturan Pertahanan Wajib
1. **Anti-SQL Injection:** Dilarang memakai f-string atau `+` di dalam string SQL. Wajib gunakan parameter binding `?`.
2. **Anti-Command Injection:** Dilarang memakai `os.system()` atau `subprocess.run(..., shell=True)`. Gunakan list argumen `subprocess.run(["tool", arg1], check=True, shell=False)`.
3. **Anti-XSS:** Gunakan `element.textContent` atau `html.escape(text, quote=True)` saat menampilkan input user ke HTML.
4. **Anti-Path Traversal:** Validasi path file dengan `os.path.realpath()` dan pastikan berada di dalam direktori dasar yang diizinkan.
5. **Anti-Eval:** Jangan pernah memanggil `eval()` atau `exec()` pada data eksternal; gunakan `json.loads()`.

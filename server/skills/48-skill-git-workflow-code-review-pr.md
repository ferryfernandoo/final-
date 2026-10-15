---
name: git-workflow-code-review-pr
description: "Skill manajemen repositori Git, Conventional Commits, penulisan Pull Request (PR) yang terstruktur, resolusi konflik merge, dan daftar periksa Code Review sistematis."
---

# Git Workflow & Systematic Code Review Pro

## 1. Format *Conventional Commits*
- `feat(excel-kit): tambah dukungan kurva six sigma bell dan macro bas`
- `fix(word-kit): cegah pemotongan tepi diagram pada mode split-left`
- `test(agentic): tambah matriks 5 kasus uji pada modul sqlite repo`

## 2. Checklist 5 Poin Saat Melakukan *Code Review*
1. **Kebenaran Logika & Kasus Batas:** Apakah nilai `0`, `None`, dan list kosong sudah ditangani?
2. **Keamanan:** Apakah ada string SQL f-string, `shell=True`, atau `eval()`?
3. **Keterbacaan & Tipe:** Apakah nama fungsi jelas dan memiliki *type hints*?
4. **Performa:** Apakah ada kueri database di dalam loop (*N+1 query*) atau `df.iterrows()`?
5. **Pengujian:** Apakah perubahan disertai pengujian otomatis yang lulus?

---
name: 3d-automated-testing-headless-webgl-qa
description: "Skill pengujian kualitas dan audit statis aplikasi 3D WebGL & SVG: pemeriksaan NaN pada koordinat vertex, validasi kelengkapan handler tombol HUD, batas pixelRatio, dan keutuhan struktur file .stl/.obj/.svg."
---

# Automated QA & Verification for 3D WebGL, CAD (`.stl`/`.obj`) & SVG Pro

Setiap kali selesai membuat file 3D atau SVG:
1. Untuk WebGL 3D (`.html`): Jalankan `python3 kits/frontend_kit.py --check file_3d.html`.
2. Untuk CAD (`.stl` / `.obj`): Pastikan jumlah vertex $> 0$, jumlah segitiga $> 0$, dan tidak ada koordinat `NaN` atau `inf`.
3. Untuk Vektor (`.svg`): Pastikan XML valid (`xml.etree.ElementTree.fromstring`) dan atribut `viewBox` tersedia.

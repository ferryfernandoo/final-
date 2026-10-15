---
name: svg-kit-model-kecil-json-ke-svg
description: "Panduan praktis bagi model LLM kecil maupun besar untuk menghasilkan ilustrasi 3D Isometrik SVG dan panel Speedometer Gauge SVG menggunakan kits/svg_kit.py."
---

# SVG Kit untuk Model Kecil (`kits/svg_kit.py`)

Untuk membuat gambar vektor `.svg` beresolusi tak terbatas (ilustrasi pabrik 3D isometrik atau panel speedometer gauge), cukup jalankan:
```bash
python3 kits/svg_kit.py templates/svg_isometric_factory_spec.json hasil_isometrik.svg
```
File `.svg` yang dihasilkan langsung dapat dibuka di browser, disematkan ke dalam HTML, atau dikonversi menjadi PNG/PDF!

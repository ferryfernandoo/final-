---
name: svg-3d-wireframe-projection-engine
description: "Skill memproyeksikan objek dan permukaan matematika 3D (x, y, z) langsung menjadi poligon vektor SVG menggunakan matriks rotasi 3D (Yaw/Pitch) dan pengurutan kedalaman Painter's Algorithm (Z-Sorting)."
---

# Pure Vector 3D-to-SVG Projection Engine (Painter's Algorithm) Pro

Untuk menggambar permukaan 3D atau objek 3D ke dalam file `.svg` murni (tanpa memerlukan `<canvas>` WebGL):
1. Putar setiap titik $(x, y, z)$ menggunakan matriks rotasi Yaw ($\theta_y$) dan Pitch ($\theta_x$).
2. Hitung rata-rata kedalaman $Z_{\text{avg}}$ dari setiap poligon segi-empat/segitiga.
3. **Urutkan poligon dari $Z$ terjauh ke terdekat (*Painter's Algorithm*)** sebelum menulis tag `<polygon points="..."/>` ke SVG agar bagian depan menutupi bagian belakang dengan benar!

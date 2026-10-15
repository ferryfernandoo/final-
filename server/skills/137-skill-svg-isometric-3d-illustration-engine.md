---
name: svg-isometric-3d-illustration-engine
description: "Skill menggambar ilustrasi 3D Isometrik (proyeksi 30 derajat) di dalam SVG vektor murni: rumus proyeksi (x, y, z) -> (u, v), kubus/gedung/konveyor 3D berbayang 3-sisi (Top Light, Left Medium, Right Dark), dan urutan gambar Painter's Algorithm."
---

# 3D Isometric Vector Illustration in Pure SVG (`svg_kit.py`)

## 1. Rumus Matematika Proyeksi 3D ke 2D Isometrik SVG ($30^\circ$)
Untuk mengubah titik ruang 3D $(x, y, z)$ menjadi koordinat layar SVG $(u, v)$ dengan titik pusat $(O_x, O_y)$:
$$u = O_x + (x - z) \cdot \cos(30^\circ), \qquad v = O_y + (x + z) \cdot \sin(30^\circ) - y$$
dengan $\cos(30^\circ) \approx 0,8660254$ dan $\sin(30^\circ) = 0,5$.

## 2. Aturan Pencahayaan 3-Sisi Balok Isometrik
Setiap balok 3D di SVG digambar menggunakan **3 `<polygon>`**:
1. **Sisi Atas (*Top Face*):** Warna paling terang (misal `#60A5FA` — terkena cahaya dari atas).
2. **Sisi Kiri Depan (*Left Face*):** Warna sedang (misal `#2563EB`).
3. **Sisi Kanan Depan (*Right Face*):** Warna paling gelap/bayangan (misal `#1E3A8A`).
Gunakan `python3 kits/svg_kit.py spec.json out.svg` untuk membangkitkan ilustrasi pabrik 3D isometrik secara otomatis!

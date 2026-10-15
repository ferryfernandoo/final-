---
name: 3d-procedural-terrain-fbm-noise-biomes
description: "Skill pembuatan lanskap pegunungan, lembah, dan pulau 3D prosedural menggunakan fungsi Noise multi-oktaf (Fractal Brownian Motion / fBm), pewarnaan bioma per-vertex (Vertex Colors), dan perhitungan ulang normal pencahayaan."
---

# Procedural 3D Terrain, fBm Noise & Biome Vertex Coloring Pro

## Langkah Membuat Terrain 3D Berwarna Bioma Tanpa Tekstur Eksternal
1. Buat `const geo = new THREE.PlaneGeometry(120, 120, 128, 128); geo.rotateX(-Math.PI / 2);`.
2. Ubah koordinat `y` setiap vertex menggunakan penjumlahan gelombang harmonik / *Simplex Noise* 3 oktaf.
3. Tambahkan atribut warna `color` pada setiap vertex berdasarkan ketinggian `y`:
   - `y < 0`: Biru Laut (`#0284c7`)
   - `0 <= y < 2`: Pasir Pantai (`#fde047`)
   - `2 <= y < 10`: Hijau Hutan (`#16a34a`)
   - `10 <= y < 18`: Batu Gunung (`#64748b`)
   - `y >= 18`: Salju Puncak (`#f8fafc`)
4. **Wajib panggil `geo.computeVertexNormals()`** setelah mengubah ketinggian `y` agar bayangan lereng gunung tampak nyata!

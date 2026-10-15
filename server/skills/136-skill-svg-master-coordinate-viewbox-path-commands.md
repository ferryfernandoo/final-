---
name: svg-master-coordinate-viewbox-path-commands
description: "Skill utama matematika menggambar vektor SVG presisi tinggi: sistem koordinat viewBox, grid kanvas, perintah path lengkap (M, L, H, V, C Cubic Bezier, S, Q, A Elliptical Arc, Z), stroke-linecap/linejoin, dan aturan Zero-Clip Padding."
---

# SVG Coordinate System, `viewBox` & `<path>` Commands Mastery

## 1. Hukum Kanvas `viewBox` & Padding Aman
Selalu gunakan `viewBox="0 0 W H" width="100%" height="100%"` (misal `1040 x 580` untuk 16:9 atau `800 x 600` untuk 4:3) dan sisakan **margin aman minimal `24px–40px` dari tepi luar** agar bayangan (`drop-shadow`) atau ketebalan garis (`stroke-width`) tidak pernah terpotong!

## 2. Kamus Perintah `<path d="...">` Wajib Hafal
- `M x y` (*MoveTo*): Pindahkan pena ke titik awal `(x, y)`.
- `L x y` (*LineTo*), `H x` (Garis Horizontal), `V y` (Garis Vertikal).
- `Q cx cy x y` (*Quadratic Bezier*): Kurva melengkung mulus dengan 1 titik kontrol `(cx, cy)` (sangat bagus untuk konektor kabel/aliran data!).
- `C c1x c1y c2x c2y x y` (*Cubic Bezier*): Kurva S mulus dengan 2 titik kontrol.
- `A rx ry rot large-arc-flag sweep-flag x y` (*Elliptical Arc*): Busur lingkaran untuk speedometer, gauge, dan sudut membulat.
- `Z` (*ClosePath*): Tutup poligon kembali ke titik awal `M`.

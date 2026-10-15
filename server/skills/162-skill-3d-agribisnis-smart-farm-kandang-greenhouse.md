---
name: 3d-agribisnis-smart-farm-kandang-greenhouse
description: "Skill pembuatan 3D Digital Twin Peternakan Modern (Closed-House Unggas/Bebek/Ayam) & Smart Greenhouse: sistem pemberian pakan otomatis 3D, kipas ventilasi berputar, sensor suhu/kelembapan, dan atap transparan."
---

# 3D Smart Poultry Farm (Closed-House) & Agribusiness Digital Twin Pro

Dalam memodelkan kandang *Closed-House* 3D untuk bebek/ayam petelur:
1. Buat deretan baterai kandang memanjang dengan pipa pakan otomatis dan jalur pengumpul telur (*egg belt*).
2. Tambahkan 4 kipas *exhaust* (`CylinderGeometry` + bilah baling-baling) di dinding ujung yang kecepatan putarnya sebanding dengan suhu kandang.
3. Buat atap pelana (`ExtrudeGeometry` segitiga) dengan opsi tombol **Buka/Tutup Atap** agar bagian dalam kandang dapat diinspeksi dari atas!

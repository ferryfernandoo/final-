---
name: 3d-procedural-trees-foliage-wind
description: "Skill pembuatan pohon, hutan, tanaman agribisnis, dan rumput 3D prosedural menggunakan cabang rekursif / kerucut berlapis, InstancedMesh, dan animasi goyangan angin harmonik."
---

# Procedural 3D Trees, Agribusiness Foliage & Wind Animation Pro

Untuk merender ribuan pohon atau tanaman di lahan agribisnis 3D tanpa membuat browser lambat, gabungkan batang (`CylinderGeometry` cokelat) dan 3 lapis tajuk daun (`ConeGeometry` atau `IcosahedronGeometry` hijau) menggunakan `InstancedMesh`, lalu goyangkan sedikit rotasi `z` berdasarkan `Math.sin(time * 2.0 + posX * 0.5) * 0.03`.

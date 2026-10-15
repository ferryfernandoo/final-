---
name: 3d-bvh-raycasting-octree-spatial-index
description: "Skill optimasi Raycasting dan deteksi tabrakan 3D menggunakan penyaringan Bounding Sphere / Box bertingkat dan Spatial Grid 3D agar klik mouse dan fisika tetap instan pada ribuan objek."
---

# 3D Spatial Indexing, Fast Raycasting & Bounding-Volume Culling Pro

Jangan memanggil `raycaster.intersectObjects(scene.children, true)` pada seluruh objek dekorasi (seperti ribuan partikel atau garis grid)! Simpan daftar khusus `const pickableMeshes = [...]` yang hanya berisi objek interaktif sehingga pemeriksaan klik berlangsung $< 0,1	ext{ ms}$.

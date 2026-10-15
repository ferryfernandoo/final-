---
name: 3d-spatial-audio-panner-hrtf
description: "Skill audio spasial 3D menggunakan Web Audio API PannerNode (HRTF) dan THREE.PositionalAudio agar sumber suara di ruang 3D terdengar dari arah kiri/kanan/depan/belakang dan mengecil sesuai jarak."
---

# 3D Spatial Audio & HRTF Positional Sound Pro

Gunakan `PannerNode` dengan `panningModel = 'HRTF'` dan `distanceModel = 'inverse'` (`refDistance = 5`, `maxDistance = 60`, `rolloffFactor = 1.5`) sehingga suara mesin atau ledakan di koordinat `(x, y, z)` otomatis mengikuti posisi dan arah hadap kamera 3D!

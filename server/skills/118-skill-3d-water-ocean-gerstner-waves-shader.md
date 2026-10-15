---
name: 3d-water-ocean-gerstner-waves-shader
description: "Skill simulasi permukaan air, sungai, dan lautan 3D menggunakan gelombang Gerstner / multi-sinus di Vertex Shader, efek pantulan Fresnel di Fragment Shader, dan hukum Archimedes untuk objek mengapung (Buoyancy)."
---

# 3D Water, Ocean Waves & Buoyancy Physics Pro

## Rumus Tinggi Gelombang Air pada Titik $(x, z, t)$ untuk Objek Mengapung
Gunakan fungsi gelombang yang sama di JavaScript (untuk menghitung tinggi apung perahu/pelampung) dan di Vertex Shader (untuk menggambar permukaan air):
```javascript
function getWaterHeight(x, z, time) {
  return Math.sin(x * 0.25 + time * 2.0) * 0.45 + Math.cos(z * 0.32 + time * 1.6) * 0.35;
}
```

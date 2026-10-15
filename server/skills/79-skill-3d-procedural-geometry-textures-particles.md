---
name: 3d-procedural-geometry-textures-particles
description: "Skill membuat model 3D prosedural (robot, pesawat, mobil, mesin pabrik, gedung, pohon), tekstur prosedural dari HTML5 CanvasTexture, dan sistem partikel 3D (ledakan, api, jejak mesin) tanpa membutuhkan file aset eksternal."
---

# Procedural 3D Modeling, Canvas Textures & Particle Systems Pro

## 1. Membuat Tekstur 3D Tanpa File Gambar (`THREE.CanvasTexture`)
Kamu bisa menggambar corak papan catur, panel sirkuit, atau tulisan rambu langsung di memori menggunakan `<canvas>` 2D lalu menjadikannya tekstur 3D:
```javascript
function makeGridTexture(bgHex = '#0f172a', lineHex = '#38bdf8') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = lineHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 248);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  return tex;
}
```

## 2. Merakit Objek 3D Kompleks dengan `THREE.Group()`
Jangan hanya menampilkan 1 kubus polos! Gabungkan beberapa geometri ke dalam `new THREE.Group()` (misal: badan kerucut + sayap kotak + cincin torus menyala) sehingga terlihat seperti model 3D utuh dan berputar/bergerak sebagai satu kesatuan.

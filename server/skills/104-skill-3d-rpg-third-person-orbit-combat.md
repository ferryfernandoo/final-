---
name: 3d-rpg-third-person-orbit-combat
description: "Skill pembuatan game Third-Person 3D Action RPG: kamera orbit bola (spherical coordinates) dengan raycast anti-tembus dinding, sistem lock-on musuh, state machine kombo serangan, dan angka damage melayang (3D-to-2D screen projection)."
---

# Third-Person 3D Action RPG & Combat Camera Pro

## Proyeksi Koordinat 3D ke Layar 2D (Untuk Nama Karakter, Health Bar & Damage Pop-Up)
Jangan membuat teks 3D berat untuk setiap angka *damage*; proyeksikan posisi 3D musuh ke koordinat piksel layar `(x, y)` HTML:
```javascript
function worldToScreen(pos3D, camera, width, height) {
  const v = pos3D.clone().project(camera);
  return {
    x: (v.x * 0.5 + 0.5) * width,
    y: (-(v.y * 0.5) + 0.5) * height,
    visible: v.z < 1.0
  };
}
```

---
name: 3d-fps-first-person-shooter-engine
description: "Skill pembuatan game First-Person 3D (FPS) & Walkthrough Arsitektur 3D di Three.js/WebGL: PointerLock API mouse look, batasan sudut pandang vertikal (pitch clamp), pergerakan vektor kamera, head-bobbing, hitscan raycasting, dan HUD crosshair."
---

# First-Person 3D (FPS) & Architectural Walkthrough Engine Pro

## 1. Rumus Rotasi Kamera First-Person (*Yaw & Pitch Clamping*)
Gunakan `camera.rotation.order = 'YXZ'` agar rotasi horizontal (`yaw` pada sumbu Y) dan mendongak/menunduk (`pitch` pada sumbu X) tidak pernah miring (*roll*):
```javascript
camera.rotation.order = 'YXZ';
let yaw = 0, pitch = 0;
const MAX_PITCH = Math.PI / 2 - 0.08; // Cegah kamera terbalik 360 derajat!

function onMouseMove(e) {
  yaw -= e.movementX * 0.0022;
  pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch - e.movementY * 0.0022));
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}
```

## 2. Vektor Maju & Geser Kiri-Kanan (*Strafe*) Sesuai Arah Pandang
```javascript
const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();
```

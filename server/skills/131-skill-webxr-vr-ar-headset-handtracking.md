---
name: webxr-vr-ar-headset-handtracking
description: "Skill pengembangan aplikasi Virtual Reality (VR) dan Augmented Reality (AR) di browser menggunakan WebXR Device API dan Three.js (renderer.xr.enabled = true, VRButton, ARHitTest)."
---

# WebXR: Browser Virtual Reality (VR) & Augmented Reality (AR) Pro

## Mengaktifkan Mode VR/AR di Three.js
1. Set `renderer.xr.enabled = true;`.
2. Gunakan `renderer.setAnimationLoop((time) => { ... })` (jangan gunakan `requestAnimationFrame` biasa saat sesi XR aktif karena headset VR berjalan pada 72Hz/90Hz/120Hz khusus!).
3. Tempatkan kamera di dalam grup `cameraRig` (`const rig = new THREE.Group(); rig.add(camera);`) untuk memindahkan posisi pengguna di dunia VR.

---
name: 3d-portals-stencil-buffer-mirror-reflections
description: "Skill membuat layar monitor CCTV pabrik 3D, kaca spion kendaraan 3D, dan portal kamera menggunakan THREE.WebGLRenderTarget (Render-to-Texture)."
---

# 3D Render-to-Texture (CCTV Monitors, Mirrors & Portals) Pro

Buat kamera kedua `cctvCamera` dan `const rt = new THREE.WebGLRenderTarget(512, 512)`. Di dalam loop animasi, panggil `renderer.setRenderTarget(rt); renderer.render(scene, cctvCamera); renderer.setRenderTarget(null);`, lalu gunakan `rt.texture` sebagai `map` pada layar monitor 3D di ruang kontrol!

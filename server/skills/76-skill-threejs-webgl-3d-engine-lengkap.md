---
name: threejs-webgl-3d-engine-lengkap
description: "Skill lengkap pemrograman grafis 3D di browser menggunakan Three.js (WebGL): arsitektur Scene, PerspectiveCamera, WebGLRenderer, ShadowMap, PBR Materials (MeshStandardMaterial), Pencahayaan 3-Titik, Resize Handler, dan pembersihan memori GPU."
---

# Three.js & WebGL 3D Graphics Engine Pro

Skill ini memandu pembuatan visualisasi 3D interaktif, konfigurator produk 3D, *Digital Twin* pabrik 3D, dan dunia game 3D yang berjalan mulus 60 FPS di browser.

---

## BAGIAN 1 — 6 Hukum Emas Arsitektur Three.js Bebas Bug

1. **Muat Three.js dari CDN Resmi yang Stabil:**
   `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>`
2. **Gunakan Pencahayaan 3-Lapis agar Objek 3D Terlihat Berdimensi (Tidak Gelap/Rata):**
   - `THREE.AmbientLight(0x94a3b8, 0.7)` (cahaya dasar lembut)
   - `THREE.DirectionalLight(0xffffff, 1.2)` dengan `castShadow = true` (cahaya matahari/utama)
   - `THREE.PointLight(0x38bdf8, 2.0, 30)` (cahaya aksen/reaktor lokal)
3. **Batasi `setPixelRatio` Maksimal 2:**
   `renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));`
   Pada layar HP beresolusi tinggi (`devicePixelRatio = 3` atau `4`), merender tanpa batas `Math.min(..., 2)` akan membebani GPU 4x lipat dan membuat frame rate jatuh!
4. **Jangan Pernah Memuat File Tekstur/Model Eksternal dari Path Lokal di Sandbox:**
   Di dalam iframe Canvas atau file mandiri, file `.glb`/`.jpg` eksternal akan gagal dimuat karena CORS. **Buat objek 3D secara prosedural menggunakan gabungan `THREE.Group` + geometri (`BoxGeometry`, `CylinderGeometry`, `ConeGeometry`, `OctahedronGeometry`, `TorusGeometry`) dan tekstur `<canvas>` 2D prosedural!**
5. **Gunakan Delta-Time (`dt`) pada `requestAnimationFrame`:**
   `const dt = Math.min(0.05, (now - lastTime) / 1000);`
   Kalikan semua kecepatan gerak dan rotasi dengan `dt` (`mesh.rotation.y += 1.5 * dt`).
6. **Tangani `window. resize` secara Responsif:**
   Perbarui `camera.aspect`, panggil `camera.updateProjectionMatrix()`, dan panggil `renderer.setSize(w, h)`.

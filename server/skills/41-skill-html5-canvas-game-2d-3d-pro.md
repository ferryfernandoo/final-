---
name: html5-canvas-game-2d-3d-pro
description: "Skill pembuatan game browser interaktif 2D & 3D (HTML5 <canvas>, Three.js, requestAnimationFrame loop, fisika tabrakan AABB/Circle, kontrol keyboard + layar sentuh HP, dan efek suara sintetis Web Audio API) dalam 1 file .html mandiri."
---

# HTML5 Canvas Game 2D/3D & Interactive Simulation Pro

## 6 Hukum Game Single-File yang Langsung Bisa Dimainkan
1. **Gunakan `requestAnimationFrame` dengan Delta-Time (`dt`):**
   Hitung `const dt = Math.min(0.05, (now - lastTime) / 1000);` agar kecepatan gerak objek konsisten di monitor 60Hz maupun 144Hz.
2. **Responsif Ukuran Canvas:**
   Sesuaikan ukuran `<canvas>` dengan lebar container saat `load` dan `resize`.
3. **Kontrol Ganda (Keyboard + Tombol Layar Sentuh):**
   Selalu sediakan tombol di layar (atau *click/tap/drag* di atas canvas) selain tombol panah/`WASD` agar bisa dimainkan di HP maupun laptop.
4. **State Machine Game Lengkap:**
   Wajib memiliki status `READY` (layar mulai), `PLAYING`, `PAUSED`, dan `GAME_OVER` dengan tombol **Main Lagi (Restart)** yang me-reset skor dan posisi.
5. **Efek Suara Sintetis Murni (`AudioContext`):**
   Jangan memuat file `.mp3`/`.wav` eksternal yang bisa gagal. Buat bunyi *beep/laser/coin* menggunakan `OscillatorNode` + `GainNode` setelah klik pertama user, lengkap dengan tombol **Mute/Unmute**.
6. **Zero External Sprite Dependencies:**
   Gambar karakter, partikel, dan rintangan menggunakan path vektor Canvas 2D (`ctx.arc`, `ctx.roundRect`, gradien) atau SVG inline.

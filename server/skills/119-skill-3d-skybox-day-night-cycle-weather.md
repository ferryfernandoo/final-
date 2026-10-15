---
name: 3d-skybox-day-night-cycle-weather
description: "Skill pembuatan langit 3D dinamis: siklus siang-malam (rotasi matahari DirectionalLight + perubahan warna langit & kabut), kubah bintang prosedural (THREE.Points), serta efek hujan dan salju 3D."
---

# 3D Skybox, Day-Night Cycle & Weather Particle Systems Pro

Saat sudut elevasi matahari $\theta_{\text{sun}}$ bergerak dari siang ke malam:
1. Putar posisi `dirLight.position.set(Math.cos(a) * 40, Math.sin(a) * 40, 15)`.
2. Interpolasikan warna `scene.background` dan `scene.fog.color` dari Biru Langit (`#38bdf8`), Jingga Senja (`#f97316`), ke Biru Malam Gelap (`#020617`).

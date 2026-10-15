---
name: 3d-ai-steering-boids-navmesh
description: "Skill kecerdasan buatan (AI) pergerakan karakter, drone, dan kawanan objek 3D: Craig Reynolds Steering Behaviors (Seek, Arrive, Flee, Obstacle Avoidance) dan algoritma Flocking Boids 3D."
---

# 3D AI Steering Behaviors & Flocking Boids Pro

## 3 Aturan Flocking Boids 3D (Untuk Kawanan Drone / Burung / Unggas 3D)
1. **Separation (Jaga Jarak):** Dorong menjauh dari tetangga yang berjarak $< R_{\text{sep}}$ agar tidak saling menembus.
2. **Alignment (Samakan Arah):** Arahkan kecepatan mendekati rata-rata vektor kecepatan tetangga terdekat.
3. **Cohesion (Kumpul ke Pusat Kelompok):** Arahkan gaya tarik lembut menuju pusat massa (*center of mass*) kawanan.

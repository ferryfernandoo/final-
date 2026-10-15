---
name: 3d-cloth-softbody-rope-verlet-physics
description: "Skill simulasi kain berkibar, bendera, kabel gantung, dan benda lunak 3D menggunakan integrasi posisi Verlet (Position-Based Dynamics) dan kendala jarak pegas."
---

# 3D Cloth, Rope & Soft-Body Physics (Verlet Integration) Pro

## Mengapa Integrasi Verlet Sangat Stabil untuk Kain & Kabel 3D?
Dalam integrasi Verlet, kecepatan tidak disimpan secara terpisah melainkan dihitung implisit dari posisi sekarang dikurangi posisi sebelumnya:
$$\vec{x}_{t+1} = \vec{x}_t + (\vec{x}_t - \vec{x}_{t-1}) \cdot (1 - \text{damping}) + \vec{a} \cdot \Delta t^2$$
Setelah memperbarui posisi, ulangi relaksasi jarak antar titik tetangga sebanyak 3–5 iterasi per frame agar kain/kabel tidak melar!

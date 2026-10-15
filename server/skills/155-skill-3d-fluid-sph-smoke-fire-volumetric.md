---
name: 3d-fluid-sph-smoke-fire-volumetric
description: "Skill simulasi efek cairan, semburan api, asap cerobong pabrik, dan uap panas 3D menggunakan sistem partikel ber-gradien suhu (Putih -> Kuning -> Jingga -> Merah -> Abu-abu Asap) dan gaya apung termal."
---

# 3D Fire, Smoke, Steam & Fluid Particle Simulation Pro

Agar semburan api atau uap 3D terlihat hidup:
1. Berikan gaya angkat ke atas (*thermal buoyancy* `vel.y += 4.5 * dt`) dan turbulensi horizontal sinus (`vel.x += Math.sin(now * 0.01 + id) * dt`).
2. Ubah skala partikel membesar seiring berkurangnya umur (`scale = 0.5 + (1 - lifeRatio) * 2.2`) sambil menurunkan `opacity` menuju `0`.

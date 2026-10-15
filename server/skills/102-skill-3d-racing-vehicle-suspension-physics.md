---
name: 3d-racing-vehicle-suspension-physics
description: "Skill fisika mobil dan game balap 3D: suspensi 4-roda Raycast (Hukum Hooke pegas + peredam), kemudi Ackermann, traksi ban & drift lateral, kamera kejar dinamis, dan sirkuit spline Catmull-Rom 3D."
---

# 3D Vehicle Physics, Raycast Suspension & Racing Track Pro

## Rumus Gaya Suspensi Pegas + Peredam (*Spring-Damper Hooke's Law*)
Untuk setiap roda ke-$i$ ($i \in \{1..4\}$), tembakkan raycast ke bawah sepanjang `restLength`:
$$F_{\text{suspensi}} = k_{\text{spring}} \cdot (L_{\text{rest}} - L_{\text{hit}}) - c_{\text{damper}} \cdot v_{\text{vertikal}}$$
- Buat jalur sirkuit balap 3D mulus menggunakan `new THREE.TubeGeometry(new THREE.CatmullRomCurve3(waypoints, true), 200, trackWidth, 8, true)`.

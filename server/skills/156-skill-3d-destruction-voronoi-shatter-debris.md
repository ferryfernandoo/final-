---
name: 3d-destruction-voronoi-shatter-debris
description: "Skill efek kehancuran objek 3D (3D Shatter & Debris): memecah objek yang hancur menjadi kepingan poligon 3D berputar dengan kecepatan radial, gravitasi, dan pantulan lantai."
---

# 3D Object Shattering, Destruction & Debris Physics Pro

Saat sebuah objek 3D hancur, gantikan mesh utamanya dengan 12–20 kepingan `DodecahedronGeometry` / `TetrahedronGeometry` berukuran acak yang diberi kecepatan awal menyebar dari pusat ledakan ditambah kecepatan putar sudut (`angularVelocity`), dan pantulkan kecepatan vertikalnya (`vel.y = -vel.y * 0.45`) saat menyentuh lantai `y = 0.2`!

---
name: 3d-camera-cinematics-cutscene-splines
description: "Skill kamera sinematik 3D: jalur kamera mulus di atas kurva CatmullRomCurve3, efek Screen Shake berbasis trauma kuadratik, dan layar terbelah (Split-Screen 2 Kamera) menggunakan setViewport & setScissor."
---

# 3D Cinematic Camera Rails, Screen Shake & Split-Screen Pro

## Rumus *Trauma-Based Screen Shake* (Getaran Kamera Saat Ledakan)
Simpan nilai `trauma` $\in [0, 1]$ (tambahkan `+0.5` saat terjadi ledakan, kurangi `trauma = Math.max(0, trauma - dt * 1.5)` setiap frame). Besarnya getaran kamera adalah **kuadrat dari trauma** (`shake = trauma * trauma`), sehingga getaran terasa sangat dramatis di awal lalu mereda dengan sangat halus!

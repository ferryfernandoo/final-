---
name: 3d-tower-defense-pathfinding-astar
description: "Skill pembuatan game 3D Tower Defense & Real-Time Strategy (RTS): algoritma pencarian jalur terpendek A* (A-Star) di atas grid 3D, rotasi menara otomatis membidik posisi prediksi target (Lead Targeting), dan pratinjau bayangan penempatan menara."
---

# 3D Tower Defense, A* Pathfinding & Lead Targeting Pro

## Rumus Membidik Target Bergerak (*Lead Target Prediction*)
Agar peluru menara mengenai musuh yang sedang berlari dengan kecepatan $ec{v}_e$:
1. Hitung estimasi waktu tempuh peluru: $t_{\text{hit}} = \frac{\|\vec{P}_{\text{musuh}} - \vec{P}_{\text{menara}}\|}{v_{\text{peluru}}}$.
2. Arahkan moncong menara ke titik prediksi: $\vec{P}_{\text{bidik}} = \vec{P}_{\text{musuh}} + \vec{v}_e \cdot t_{\text{hit}}$.

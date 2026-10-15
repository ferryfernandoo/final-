---
name: 3d-medical-molecular-astronomy-sim
description: "Skill simulasi sains & pendidikan 3D: visualisasi molekul kimia 3D (Ball-and-Stick CPK coloring), simulasi orbit planet Tata Surya (Hukum Kepler), dan propagasi gelombang elektromagnetik/mekanik 3D."
---

# 3D Scientific Simulations: Molecular Structure, Orbital Mechanics & Waves Pro

- **Struktur Molekul 3D (*Ball-and-Stick*):** Gunakan `SphereGeometry` dengan warna standar CPK (Karbon = Hitam `#222`, Oksigen = Merah `#ef4444`, Nitrogen = Biru `#3b82f6`, Hidrogen = Putih `#f8fafc`) dan hubungkan dua atom $ec{A}, ec{B}$ dengan `CylinderGeometry` yang diorientasikan menggunakan `quaternion.setFromUnitVectors(upVec, B.clone().sub(A).normalize())`.

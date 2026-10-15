---
name: 3d-decals-projected-textures-scorch-marks
description: "Skill penempelan label mesin, rambu K3 lantai, jejak roda AGV, dan tanda titik inspeksi pada permukaan 3D menggunakan orientasi normal hasil Raycast (lookAt normal)."
---

# 3D Surface Decals, Floor Markings & Normal-Aligned Labels Pro

Saat menempelkan indikator atau stiker pada permukaan objek 3D hasil `raycaster.intersectObjects()`:
1. Ambil titik temu `hit.point` dan vektor normal permukaan dunia `const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld)`.
2. Geser posisi stiker sedikit keluar sepanjang normal (`pos.addScaledVector(n, 0.02)`) untuk mencegah *Z-fighting* (kedipan tekstur bertumpuk)!

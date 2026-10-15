---
name: 3d-cad-parametric-stl-obj-generator
description: "Skill pembuatan file CAD 3D mekanik (.stl untuk 3D Printing & .obj Wavefront) menggunakan Python murni dan cad3d_kit.py: roda gigi (spur gear), braket mesin, kotak casing ESP32, dan flensa pipa."
---

# Parametric 3D CAD Generator (`.stl` & `.obj` for 3D Printing) Pro

## Menggunakan `kits/cad3d_kit.py` untuk Menghasilkan File `.stl`, `.obj` & Blueprint 3D
Jalankan:
```bash
python3 kits/cad3d_kit.py samples/Roda_Gigi_Transmisi_Lini_3D
```
Perintah ini menghasilkan:
1. `Roda_Gigi_Transmisi_Lini_3D.stl` (File mesh segitiga 3D *watertight* yang langsung bisa dibuka di Ultimaker Cura, PrusaSlicer, Blender, atau FreeCAD).
2. `Roda_Gigi_Transmisi_Lini_3D.obj` (File Wavefront OBJ standar lintas aplikasi 3D).
3. `Roda_Gigi_Transmisi_Lini_3D_blueprint.png` (Gambar blueprint 300-DPI berisi render mesh 3D roda gigi dan plot permukaan respons 3D).

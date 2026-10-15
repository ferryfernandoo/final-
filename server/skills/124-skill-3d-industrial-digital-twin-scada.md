---
name: 3d-industrial-digital-twin-scada
description: "Skill utama pembuatan 3D Industrial Digital Twin & SCADA Pabrik Pintar menggunakan world3d_kit.py: lini konveyor 3D bergerak, lengan robot artikulasi 6-DOF, lampu menara Andon, dan inspeksi telemetri OEE/Cpk berbasis klik Raycast."
---

# 3D Industrial Digital Twin & Smart Factory SCADA Pro (`world3d_kit.py`)

## Cara Cepat Membangun 3D Digital Twin Pabrik dari `spec.json`
Jalankan perintah ini untuk menghasilkan aplikasi web 3D SCADA interaktif:
```bash
python3 kits/world3d_kit.py templates/world3d_digital_twin_spec.json digital_twin_pabrik.html
```
Fitur yang langsung tersedia di dalam output `.html`:
1. **4 Lini Konveyor 3D + Lengan Robot 6-DOF** yang bergerak sinkron dengan kinematika sendi (`J1 Yaw`, `J2 Shoulder`, `J3 Elbow`).
2. **Klik Raycast 3D:** Klik langsung pada mesin atau robot 3D untuk memeriksa OEE, Cpk, Suhu Servo, dan menjalankan kalibrasi instan.
3. **Mode Exploded View 3D** untuk menginspeksi struktur komponen mekanik.

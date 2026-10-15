---
name: 3d-camera-controls-orbit-map-fly-pointerlock
description: "Skill implementasi mandiri kontrol kamera 3D (Spherical Orbit, Pan, Zoom, dan Camera Preset Transitions) dalam 30 baris JavaScript murni tanpa memerlukan file OrbitControls.js eksternal yang sering gagal dimuat."
---

# Zero-Dependency 3D Camera Controls (Spherical Orbit, Pan & Zoom) Pro

Banyak kode buatan LLM gagal di browser karena mencoba mengimpor `OrbitControls.js` dari URL yang salah atau tidak cocok versinya. **Selalu gunakan implementasi Spherical Orbit mandiri 25 baris** seperti yang ada di `kits/world3d_kit.py` dan `kits/studio3d_kit.py` — 100% bebas ketergantungan eksternal dan selalu bekerja di semua browser!

---
name: 3d-cnc-toolpath-gcode-visualizer-simulator
description: "Skill pembuatan visualizer & simulator jalur pahat mesin CNC 3-Axis dan 3D Printer (G-Code G0/G1 X-Y-Z parser) di Three.js lengkap dengan animasi spindle pahat dan pembedaan warna gerak cepat (G0) vs potong (G1)."
---

# 3D CNC Toolpath & 3D Printer G-Code Simulator Pro

Parse baris G-Code (`G0 X10 Y20 Z5` atau `G1 X45.5 Y20.0 Z-2.0 F800`), simpan segmen garis `G0` (*rapid move*) dengan warna biru putus-putus dan `G1` (*cutting/extruding move*) dengan warna hijau/emas menyala di dalam `THREE.BufferGeometry`, lalu gerakkan kerucut kepala pahat (*spindle*) mengikuti segmen demi segmen!

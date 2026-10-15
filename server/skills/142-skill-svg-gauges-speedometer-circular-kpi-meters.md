---
name: svg-gauges-speedometer-circular-kpi-meters
description: "Skill menggambar speedometer, circular gauge meter OEE/Cpk, radial progress ring, dan grafik donat di SVG murni menggunakan konversi koordinat kutub (polarToCartesian) dan perintah busur A."
---

# SVG Circular Gauges, Speedometers & Radial Meters Pro

## Rumus Python/JS Menggambar Busur Gauge dari Sudut $\theta_1$ ke $\theta_2$
Gunakan fungsi `polar_to_cartesian(cx, cy, r, angle_deg)` dan `describe_arc(cx, cy, r, -120, val_angle)` yang sudah tersedia siap pakai di dalam `kits/svg_kit.py` (`"kind": "gauge_dashboard_svg"`).

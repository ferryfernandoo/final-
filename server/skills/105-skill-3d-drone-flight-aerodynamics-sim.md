---
name: 3d-drone-flight-aerodynamics-sim
description: "Skill simulasi terbang 3D Quadcopter Drone dan Pesawat: dinamika 6-DOF (Pitch, Roll, Yaw, Throttle), pengontrol keseimbangan PID, putaran baling-baling 3D, dan navigasi autopilot antar-titik (Waypoint)."
---

# 3D Drone & Flight Aerodynamics Simulator Pro

## Dinamika Kemiringan Quadcopter (*Tilt-to-Thrust*)
Saat drone miring ke depan (`pitch < 0`) atau ke samping (`roll`), gaya angkat baling-baling mendorong drone maju sekaligus sedikit mengurangi daya angkat vertikal. Kembalikan sudut `pitch` dan `roll` secara halus ke `0` dengan faktor peredam (`pitch *= Math.pow(0.08, dt)`) saat tuas kemudi dilepas.

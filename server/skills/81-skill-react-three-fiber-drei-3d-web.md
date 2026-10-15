---
name: react-three-fiber-drei-3d-web
description: "Skill pengembangan aplikasi 3D deklaratif di React menggunakan React Three Fiber (@react-three/fiber) dan @react-three/drei: Canvas, useFrame, OrbitControls, Environment, dan interaksi klik/hover."
---

# React Three Fiber (R3F) & Declarative 3D Web Pro

## Aturan Emas React Three Fiber
1. **Jangan Pernah Memanggil `setState` di Dalam `useFrame` (60x per Detik!):**
   Memanggil `setRotation(r + 0.01)` di dalam `useFrame` akan memicu re-render komponen React 60 kali per detik dan membuat aplikasi macet. Mutasikan `meshRef.current.rotation.y += delta` secara langsung!
2. **`useFrame` Hanya Boleh Dipanggil di Dalam Anak Komponen `<Canvas>`:**
   Jangan memanggil `useFrame` di komponen induk yang membungkus `<Canvas>`.

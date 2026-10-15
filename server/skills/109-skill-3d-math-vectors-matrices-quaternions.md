---
name: 3d-math-vectors-matrices-quaternions
description: "Skill matematika grafis 3D praktis untuk LLM: operasi Vector3 (dot product untuk kerucut pandang AI, cross product untuk normal permukaan), transformasi Matrix4, dan Quaternion slerp bebas Gimbal Lock."
---

# 3D Math Mastery: Vectors, Matrices & Quaternions Pro

## 3 Rumus Vektor 3D Paling Sering Dipakai di Game & Simulasi
1. **Cek Apakah Objek B Berada di Depan Pandangan Objek A (*Field of View Cone* dengan Dot Product):**
   ```javascript
   const toTarget = targetPos.clone().sub(eyePos).normalize();
   const cosAngle = eyeForward.dot(toTarget);
   const isVisible = cosAngle > Math.cos(fovRadians / 2);
   ```
2. **Menghitung Normal Segitiga dari 3 Titik (`Cross Product`):**
   `const normal = p2.clone().sub(p1).cross(p3.clone().sub(p1)).normalize();`
3. **Rotasi Mulus Antar Dua Arah (`Quaternion.slerp`):**
   Gunakan `mesh.quaternion.slerp(targetQuaternion, 0.1)` untuk menghindari *Gimbal Lock* pada rotasi 3 sumbu.

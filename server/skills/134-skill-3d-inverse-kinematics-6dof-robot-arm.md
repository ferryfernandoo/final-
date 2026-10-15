---
name: 3d-inverse-kinematics-6dof-robot-arm
description: "Skill pemodelan dan simulasi lengan robot industri 6-DOF (6 Degrees of Freedom): hierarki sendi berantai (Parent-Child Scene Graph), Forward Kinematics (Denavit-Hartenberg), dan algoritma CCD/FABRIK Inverse Kinematics."
---

# 6-DOF Industrial Robot Arm Kinematics & Pick-and-Place 3D Pro

## Hierarki Scene Graph Wajib untuk Lengan Robot Artikulasi
Jangan pernah menghitung posisi dunia setiap segmen lengan secara terpisah! Gunakan **Hierarki Parent-Child `THREE.Group`** seperti di `world3d_kit.py`:
```text
robotBase (Posisi Lantai)
 └── j1Yaw (Rotasi Sumbu Y / Putar Kiri-Kanan)
      └── j2Shoulder (Rotasi Sumbu X / Angkat Lengan Bawah)
           └── lowerArmMesh
           └── j3Elbow (Di ujung lowerArm, Rotasi Sumbu X / Tekuk Siku)
                └── foreArmMesh
                └── j4Wrist (Di ujung foreArm, Capit/Gripper)
```
Dengan struktur berantai ini, saat `j1Yaw` berputar, seluruh bahu, siku, dan capit otomatis ikut berputar secara akurat!

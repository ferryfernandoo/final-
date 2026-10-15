---
name: 3d-procedural-animation-ik-rigging
description: "Skill animasi prosedural 3D tanpa file animasi eksternal: siklus jalan/lari humanoid & robot dengan gelombang sinus berfase, Inverse Kinematics (IK) 2-sendi dengan Hukum Cosinus, dan animasi recoil/idle."
---

# Procedural 3D Animation & 2-Bone Inverse Kinematics (IK) Pro

## Rumus Inverse Kinematics (IK) 2-Sendi dengan Hukum Cosinus
Untuk lengan robot atau kaki karakter dengan panjang lengan atas $L_1$, lengan bawah $L_2$, dan jarak ke titik target $D = \min(\|P_{\text{target}} - P_{\text{bahu}}\|, L_1 + L_2 - 0.001)$:
$$\cos(\theta_{\text{siku}}) = \frac{L_1^2 + L_2^2 - D^2}{2 L_1 L_2}$$
Dengan rumus ini, ujung capit robot atau telapak kaki karakter 3D dapat menyentuh koordinat target `(x, y, z)` mana pun secara presisi matematis!

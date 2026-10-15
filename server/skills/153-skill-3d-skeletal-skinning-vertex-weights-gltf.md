---
name: 3d-skeletal-skinning-vertex-weights-gltf
description: "Skill animasi kerangka 3D (Skeletal Skinning): THREE.Bone, THREE.Skeleton, SkinnedMesh, bobot vertex (skinIndex & skinWeight), dan transisi halus antar animasi dengan AnimationMixer.crossFadeTo."
---

# 3D Skeletal Animation, `SkinnedMesh` & `AnimationMixer` Pro

Saat mengganti animasi karakter 3D dari *Idle* ke *Run*, jangan langsung menghentikan aksi lama (`idleAction.stop()`), tetapi gunakan `idleAction.crossFadeTo(runAction, 0.25, true)` agar transisi gerakan sendi mengalir mulus selama 0,25 detik!

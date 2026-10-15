---
name: 3d-voxel-world-minecraft-chunk-engine
description: "Skill pembuatan dunia Voxel 3D bergaya Minecraft/Sandbox: arsitektur Chunk 16x16x16, Hidden Face Culling (hanya merender sisi blok yang bersentuhan dengan udara), InstancedMesh, dan Raycast pasang/hancurkan blok."
---

# 3D Voxel World & Chunk Engine Pro (Minecraft-Style WebGL)

## Mengapa Dunia Voxel Pemula Macet? (Dan Solusinya)
Membuat `new THREE.Mesh(boxGeo, mat)` terpisah untuk $16 	imes 16 	imes 16 = 4.096$ blok menghasilkan 4.096 *draw calls* yang melumpuhkan GPU.
**Solusi Wajib:**
1. Gunakan **`THREE.InstancedMesh(boxGeo, mat, maxBlocks)`** (1 *draw call* untuk ribuan blok!), atau
2. Lakukan **Hidden Face Culling**: hanya masukkan bidang sisi (`+X, -X, +Y, -Y, +Z, -Z`) ke `BufferGeometry` jika tetangga di arah tersebut bernilai `0` (udara kosong).

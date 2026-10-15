---
name: 3d-curved-conveyors-belts-chains-gears
description: "Skill animasi mekanik industri 3D lanjutan: jalur konveyor melengkung dengan CatmullRomCurve3.getPointAt(u), pasangan roda gigi bertautan dengan rasio gigi presisi, dan rantai penggerak."
---

# 3D Curved Conveyors, Intermeshing Gears & Mechanical Chains Pro

## Rumus Menggerakkan Barang di Atas Konveyor Melengkung 3D
1. Definisikan jalur tengah konveyor dengan `const path = new THREE.CatmullRomCurve3([...points]);`.
2. Untuk setiap paket ke-$i$ dengan progres $u_i = (t \cdot 	ext{speed} + i / N) \pmod 1$:
   ```javascript
   const pos = path.getPointAt(u);
   const tangent = path.getTangentAt(u);
   box.position.copy(pos);
   box.lookAt(pos.clone().add(tangent));
   ```

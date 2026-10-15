---
name: 3d-architectural-floorplan-interior-bim
description: "Skill visualisasi arsitektur 3D, denah pabrik/gudang/kandang/rumah 3D, ekstrusi dinding dari koordinat 2D, penempatan pintu/jendela, pencahayaan ruangan, dan penggaris ukur jarak 3D."
---

# 3D Architectural Floorplan, Warehouse Layout & BIM Visualizer Pro

## Rumus Membuat Dinding 3D dari Titik Koordinat Denah 2D `(x1, z1) -> (x2, z2)`
```javascript
function createWall3D(x1, z1, x2, z2, height = 3.2, thickness = 0.2, material) {
  const length = Math.hypot(x2 - x1, z2 - z1);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(length, height, thickness), material);
  wall.position.set((x1 + x2) / 2, height / 2, (z1 + z2) / 2);
  wall.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
  wall.castShadow = true;
  wall.receiveShadow = true;
  return wall;
}
```

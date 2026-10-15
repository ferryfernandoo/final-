---
name: 3d-performance-instancing-lod-octree
description: "Skill optimasi performa grafis 3D untuk merender 10.000+ objek pada 60 FPS menggunakan THREE.InstancedMesh, Level of Detail (THREE.LOD), Spatial Hash Grid untuk tabrakan O(1), dan pembersihan memori geometry.dispose()."
---

# High-Performance 3D: `InstancedMesh`, LOD & Spatial Hashing Pro

## Cara Merender 10.000 Objek 3D dalam 1 Draw Call (`THREE.InstancedMesh`)
```javascript
const count = 10000;
const instMesh = new THREE.InstancedMesh(boxGeo, mat, count);
const dummy = new THREE.Object3D();
for (let i = 0; i < count; i++) {
  dummy.position.set((i % 100) * 2, 0, Math.floor(i / 100) * 2);
  dummy.updateMatrix();
  instMesh.setMatrixAt(i, dummy.matrix);
}
instMesh.instanceMatrix.needsUpdate = true;
scene.add(instMesh);
```

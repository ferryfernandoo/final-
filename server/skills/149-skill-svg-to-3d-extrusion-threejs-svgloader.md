---
name: svg-to-3d-extrusion-threejs-svgloader
description: "Skill mengubah bentuk 2D SVG atau THREE.Shape (logo, profil roda gigi, dinding denah) menjadi model 3D padat ber-bevel menggunakan THREE.ExtrudeGeometry di Three.js."
---

# 2D SVG Path to 3D Extruded Mesh (`THREE.ExtrudeGeometry`) Pro

```javascript
const shape = new THREE.Shape();
shape.moveTo(0, 0);
shape.lineTo(4, 0);
shape.lineTo(4, 3);
shape.lineTo(0, 3);
shape.closePath();

const extrudeSettings = { depth: 1.2, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.12, bevelThickness: 0.12 };
const mesh3D = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, extrudeSettings), materialPBR);
```

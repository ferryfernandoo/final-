---
name: 3d-picking-gizmo-transform-editor
description: "Skill pembuatan aplikasi Editor Level 3D, Tata Letak Pabrik/Ruangan 3D, dan CAD di browser: Raycast Plane Intersection untuk drag-and-drop objek 3D di atas lantai, snap-to-grid, rotasi 90 derajat, dan ekspor/impor JSON scene."
---

# 3D Scene Editor, Drag-and-Drop Plane Intersection & Grid Snapping Pro

## Cara Menggeser Objek 3D di Atas Lantai dengan Mouse (*Ray-Plane Intersection*)
```javascript
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Bidang Y = 0
const intersectPt = new THREE.Vector3();

function onDragMove(mouseNDC, camera, selectedMesh, gridSize = 1.0) {
  raycaster.setFromCamera(mouseNDC, camera);
  if (raycaster.ray.intersectPlane(floorPlane, intersectPt)) {
    selectedMesh.position.x = Math.round(intersectPt.x / gridSize) * gridSize;
    selectedMesh.position.z = Math.round(intersectPt.z / gridSize) * gridSize;
  }
}
```

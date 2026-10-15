---
name: 3d-game-physics-collision-controls
description: "Skill implementasi fisika game 3D: integrasi kecepatan & gravitasi, deteksi tabrakan 3D (Bounding Sphere distanceTo & AABB THREE.Box3), Raycasting klik/tembakan, kamera pengejar halus (Vector3.lerp), dan kontrol joystick virtual layar sentuh."
---

# 3D Game Physics, Collision Detection & Camera Controls Pro

## 1. Tiga Metode Deteksi Tabrakan 3D Paling Cepat & Akurat
1. **Bounding Sphere Collision (Paling Cepat untuk Peluru, Koin & Karakter):**
   ```javascript
   const dist = objA.position.distanceTo(objB.position);
   if (dist < (radiusA + radiusB)) {
     // Tabrakan terjadi!
   }
   ```
2. **Axis-Aligned Bounding Box (`THREE.Box3` untuk Dinding, Gedung & Rintangan Kotak):**
   ```javascript
   const boxA = new THREE.Box3().setFromObject(meshA);
   const boxB = new THREE.Box3().setFromObject(meshB);
   if (boxA.intersectsBox(boxB)) {
     // Tabrakan kotak 3D!
   }
   ```
3. **Raycasting (`THREE.Raycaster` untuk Klik Mouse 3D, Laser Instan & Deteksi Lantai):**
   ```javascript
   const raycaster = new THREE.Raycaster(originPos, directionVec.normalize(), 0, maxDistance);
   const hits = raycaster.intersectObjects(obstacleMeshes, true);
   ```

## 2. Kamera Third-Person Halus (`camera.position.lerp`)
Jangan menempelkan posisi kamera secara kaku; gunakan interpolasi linear (`lerp`) agar kamera mengikuti pemain dengan mulus seperti game AAA:
```javascript
const idealOffset = new THREE.Vector3(player.position.x * 0.7, 15, player.position.z + 14);
camera.position.lerp(idealOffset, 0.08);
camera.lookAt(player.position.x * 0.4, 1.2, player.position.z * 0.4);
```

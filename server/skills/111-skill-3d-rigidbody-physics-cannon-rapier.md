---
name: 3d-rigidbody-physics-cannon-rapier
description: "Skill simulasi fisika benda tegar 3D (RigidBody Physics): sinkronisasi mesh Three.js dengan body fisika (position & quaternion), impuls tumbukan, koefisien restitusi (pantulan), gesekan, dan engsel (HingeConstraint)."
---

# 3D RigidBody Physics & Impulse Solver Pro

## Sinkronisasi Fisika ke Visual Three.js
Di setiap frame `animate(dt)`:
1. Jalankan langkah fisika dengan langkah waktu tetap (`world.step(1 / 60, dt, 3)`).
2. Salin posisi dan rotasi dari objek fisika ke objek visual Three.js:
   ```javascript
   mesh.position.copy(body.position);
   mesh.quaternion.copy(body.quaternion);
   ```

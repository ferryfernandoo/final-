---
name: 3d-postprocessing-bloom-ssao-outline
description: "Skill efek visual 3D tingkat lanjut: efek pijar cahaya (Neon Glow / Bloom), garis tepi kartun/teknis (Inverted Hull Toon Outline & Wireframe Overlay), dan efek bayangan sudut (Ambient Occlusion)."
---

# 3D Visual Polish: Neon Glow, Inverted-Hull Outline & Technical Wireframe Pro

## Cara Membuat Garis Tepi (*Outline*) atau Efek Pijar Tanpa Post-Processing Berat
1. **Technical CAD Wireframe Overlay:** Tambahkan `new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 15), new THREE.LineBasicMaterial({ color: 0x38bdf8 }))` sebagai anak dari `mesh`.
2. **Inverted-Hull Outline:** Duplikasi geometri dengan skala `1.04`, gunakan `THREE.BackSide` pada `MeshBasicMaterial`, sehingga terbentuk garis luar tegas di sekeliling objek 3D!

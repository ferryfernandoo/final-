---
name: blender-python-bpy-automation-pro
description: "Skill penulisan script Python untuk Blender 3D (modul bpy): pembuatan mesh prosedural, penggunaan modifier (Boolean, Bevel, Array, Subdivision), pembuatan material Principled BSDF, animasi keyframe, dan ekspor .glb/.fbx/.stl otomatis."
---

# Blender 3D Python (`bpy`) Automation & Batch Rendering Pro

## Template Script `bpy` Blender Headless (`blender -b -P script.py`)
```python
import bpy

# 1. Bersihkan scene awal
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Buat objek 3D & tambahkan Bevel Modifier agar sudut tampak realistis
bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0, 0, 1.0))
obj = bpy.context.active_object
obj.name = "MachineBlock"
bevel = obj.modifiers.new(name="Bevel", type="BEVEL")
bevel.width = 0.08
bevel.segments = 3

# 3. Buat Material PBR Metalik
mat = bpy.data.materials.new(name="SteelPBR")
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs["Base Color"].default_value = (0.22, 0.55, 0.88, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.85
    bsdf.inputs["Roughness"].default_value = 0.25
obj.data.materials.append(mat)

# 4. Ekspor ke glTF 2.0 (.glb)
bpy.ops.export_scene.gltf(filepath="machine_block.glb", export_format="GLB")
```

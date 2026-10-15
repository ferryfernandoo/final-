---
name: 3d-raymarching-sdf-signed-distance-fields
description: "Skill teknik grafis 3D Raymarching & Signed Distance Fields (SDF) di dalam GLSL Fragment Shader: penggabungan cairan organik (Smooth Minimum / Metaballs), boolean 3D halus, dan pencahayaan Ambient Occlusion analitik."
---

# 3D Raymarching & Signed Distance Fields (SDF Metaballs) Pro

## Fungsi *Polynomial Smooth Minimum* (`smin`) untuk Peleburan Organik 3D di GLSL
```glsl
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
```
Dengan `smin(sdSphere(p - pos1, r1), sdSphere(p - pos2, r2), 0.35)`, dua bola 3D yang saling mendekat akan melebur mulus seperti tetesan logam cair!

---
name: webgl-glsl-shaders-postprocessing
description: "Skill pemrograman Vertex Shader dan Fragment Shader (GLSL) pada Three.js ShaderMaterial untuk membuat efek air bergelombang, perisai energi hologram, medan gaya, dan efek pencahayaan neon."
---

# WebGL GLSL Shaders & Visual Effects Pro

## Template `THREE.ShaderMaterial` Hologram Berdenyut (Siap Salin)
```javascript
const holoMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
    uColor: { value: new THREE.Color(0x38bdf8) }
  },
  transparent: true,
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      float scanline = sin(vPosition.y * 18.0 - uTime * 6.0) * 0.15 + 0.85;
      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 1.8);
      gl_FragColor = vec4(uColor * scanline, clamp(fresnel + 0.25, 0.2, 0.9));
    }
  `
});
// Di dalam loop animate(now): holoMaterial.uniforms.uTime.value = now * 0.001;
```

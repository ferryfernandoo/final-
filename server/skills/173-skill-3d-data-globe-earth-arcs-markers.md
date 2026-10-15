---
name: 3d-data-globe-earth-arcs-markers
description: "Skill visualisasi Bola Dunia 3D (3D Interactive Data Globe): konversi koordinat Lintang/Bujur (Lat/Lon) ke (x, y, z) permukaan bola, busur jalur logistik 3D (QuadraticBezierCurve3), dan pin kota."
---

# 3D Interactive Data Globe & Supply Chain Arcs Pro

## Rumus Konversi Lintang & Bujur $(\text{lat}, \text{lon})$ ke Titik 3D $(x, y, z)$ di Permukaan Bola Berjari-jari $R$
```javascript
function latLonToVec3(latDeg, lonDeg, radius) {
  const phi = (90 - latDeg) * (Math.PI / 180);
  const theta = (lonDeg + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}
```

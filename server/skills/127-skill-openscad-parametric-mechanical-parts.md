---
name: openscad-parametric-mechanical-parts
description: "Skill penulisan kode OpenSCAD (.scad) untuk komponen mekanik presisi, casing elektronik/ESP32, dudukan sensor, dan suku cadang pabrik menggunakan Constructive Solid Geometry (union, difference, intersection)."
---

# OpenSCAD Parametric Mechanical CAD & 3D Printing Pro (`.scad`)

## Template Casing Kotak Sensor ESP32 dengan Lubang Baut Presisi (`.scad`)
```scad
$fn = 64; // Kehalusan lingkaran

module esp32_enclosure(w = 68, d = 44, h = 26, wall = 2.4) {
  difference() {
    // Bodi luar
    minkowski() {
      cube([w - 6, d - 6, h], center = false);
      cylinder(r = 3, h = 0.01);
    }
    // Rongga dalam
    translate([wall, wall, wall])
      cube([w - 2 * wall, d - 2 * wall, h]);
    // Lubang kabel USB-C
    translate([-1, d / 2 - 5, wall + 4])
      cube([wall + 2, 10, 6]);
  }
}

esp32_enclosure();
```
Ingat aturan toleransi cetak FDM 3D Printer: selalu tambahkan kelonggaran (*clearance*) **+0,20 mm s/d +0,30 mm** pada lubang baut atau tutup geser agar komponen pas saat dirakit!

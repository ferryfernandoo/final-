---
name: svg-industrial-pid-scada-electrical-schematics
description: "Skill menggambar skema teknik industri di SVG: diagram perpipaan P&ID (Piping & Instrumentation), simbol katup, pompa, tangki silo dengan indikator level cairan, skema rangkaian listrik, dan pinout mikrokontroler ESP32."
---

# Industrial P&ID, SCADA & Electrical Schematics in SVG Pro

## Gunakan `<defs>` dan `<symbol>` untuk Komponen Teknik Berulang
Definisikan simbol katup (*valve*), pompa, sensor, atau resistor satu kali di dalam `<defs><symbol id="symValve" viewBox="0 0 40 40">...</symbol></defs>`, lalu panggil berkali-kali di berbagai posisi dengan `<use href="#symValve" x="220" y="140" width="40" height="40"/>`.

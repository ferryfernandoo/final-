---
name: threejs-3d-game-model-kecil-kit
description: "Panduan praktis bagi model LLM kecil maupun besar untuk langsung membuat Game 3D WebGL interaktif dan Simulasi 3D Digital Twin lengkap dengan kontrol keyboard + layar sentuh HP, fisika tabrakan, efek partikel, dan suara sintetis menggunakan game3d_kit.py."
---

# 3D Game & Digital Twin Kit (`game3d_kit.py`) — Panduan Mudah Model Kecil

## 1. Cara Cepat Membuat Game 3D Lengkap Tanpa Pusing Matematika Matriks
Cukup buat file `spec_3d.json` sederhana lalu jalankan:
```bash
python3 kits/game3d_kit.py spec_3d.json game_3d_interaktif.html
```
Mesin `game3d_kit.py` otomatis menghasilkan 1 file `.html` yang berisi:
- Dunia 3D WebGL lengkap dengan pencahayaan bayangan, kabut atmosferik (`FogExp2`), dan lantai grid 3D.
- Unit Drone/Mecha 3D pemain, Reaktor Inti 3D yang berputar, gelombang musuh 3D, tembakan laser 3D, dan ledakan partikel 3D.
- Kontrol ganda (WASD / Panah + Tombol Sentuh Layar HP) dan synthesizer suara Web Audio API.

## 2. Contoh `spec_3d.json` Siap Salin
```json
{
  "title": "Cyber Factory 3D: Automated Core Defender",
  "subtitle": "Pertahankan Reaktor Inti Pabrik dari Anomali — WASD / Tombol Layar + Spasi",
  "primary_color": "0x38bdf8",
  "enemy_color": "0xf43f5e",
  "core_color": "0x10b981"
}
```

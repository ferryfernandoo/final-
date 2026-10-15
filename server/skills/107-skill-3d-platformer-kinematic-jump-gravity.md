---
name: 3d-platformer-kinematic-jump-gravity
description: "Skill fisika game 3D Platformer & Parkour: lompatan responsif (Coyote Time & Jump Buffering), gravitasi jatuh lebih cepat dari naik, platform bergerak, dan bayangan lingkaran di bawah kaki (Drop Shadow Blob) untuk presisi pendaratan 3D."
---

# 3D Platformer Physics, Jump Feel & Drop-Shadow Landing Pro

## Wajib Pasang *Drop-Shadow Blob* di Bawah Karakter 3D!
Dalam ruang 3D, pemain sering kesulitan menebak di mana karakternya akan mendarat saat melompat. Selalu tembakkan raycast vertikal ke bawah dari posisi pemain, lalu letakkan lingkaran gelap semi-transparan (`CircleGeometry` dengan `opacity: 0.45`) tepat di titik lantai di bawah kaki pemain!

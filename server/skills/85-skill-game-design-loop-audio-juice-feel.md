---
name: game-design-loop-audio-juice-feel
description: "Skill perancangan mekanika game (Core Loop), kurva kesulitan dinamis, umpan balik visual/audio (Game Juice: Screen Shake, Hit Flash, Particle Burst), dan synthesizer suara Web Audio API."
---

# Game Design, Core Loop & "Game Juice" Feel Pro

Apa yang membedakan game amatir yang membosankan dari game yang seru dimainkan berulang-ulang? **Umpan Balik Instan (*Game Juice*)**:
1. **Visual Feedback:** Saat musuh terkena tembakan, kedipkan warna material menjadi putih terang selama 60ms dan semburkan 12–16 partikel 3D ke segala arah.
2. **Audio Feedback:** Setiap tembakan, ledakan, dan tombol UI menghasilkan efek suara sintetis (`OscillatorNode` Web Audio API) dengan variasi frekuensi sedikit acak ($\pm 5\%$) agar tidak terdengar monoton.
3. **Progresi Gelombang (*Wave Pacing*):** Naikkan jumlah atau kecepatan tantangan secara bertahap setiap kelipatan skor tertentu sehingga pemain merasakan pencapaian yang jelas.

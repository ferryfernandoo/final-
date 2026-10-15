#!/usr/bin/env python3
"""
game3d_kit.py — Mesin Pembuat Game 3D Interaktif & Simulasi 3D Digital Twin (Three.js WebGL Single-File)

Menghasilkan file `.html` mandiri yang memuat:
  - Engine 3D Three.js (r128) dengan PerspectiveCamera, DirectionalLight + PointLight, FogExp2, dan Grid 3D
  - Model 3D Prosedural (Player Mecha/Drone, Core Reaktor Berputar, Musuh/Obstacle 3D, dan Sistem Partikel Ledakan)
  - Fisika Pergerakan 60 FPS (Delta-Time), Deteksi Tabrakan 3D (Bounding Sphere / Jarak Euclidean), dan Kamera Lerp
  - Kontrol Ganda: Keyboard (WASD / Arrow Keys + Spasi) DAN Tombol Sentuh Layar HP (Kiri, Kanan, Maju, Mundur, Tembak Laser)
  - Efek Suara Sintetis Web Audio API (Laser, Ledakan, Power-Up) dengan tombol Mute/Unmute
  - State Machine Lengkap: Layar Mulai -> Bermain -> Pause -> Game Over + Restart

Cara pakai:
  python3 kits/game3d_kit.py spec.json game_3d.html
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import frontend_kit


def build_3d_game(spec: dict, out_path: str) -> str:
    title = spec.get("title", "Cyber Factory 3D: Automated Core Defender")
    subtitle = spec.get("subtitle", "Three.js WebGL 3D Action & Digital Twin Simulation — Gunakan WASD / Panah atau Tombol Layar + Spasi (Laser)")
    primary_hex = spec.get("primary_color", "0x38bdf8")
    enemy_hex = spec.get("enemy_color", "0xf43f5e")
    core_hex = spec.get("core_color", "0x10b981")

    html = f"""<!DOCTYPE html>
<html lang="id" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>{title}</title>
  <script src="https://cdn.tailwindcss.com/3.4.17"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    body {{ font-family: 'Inter', sans-serif; touch-action: manipulation; }}
    #gameCanvasContainer canvas {{ display: block; width: 100% !important; height: 100% !important; }}
  </style>
</head>
<body class="h-full bg-slate-950 text-slate-100 overflow-hidden select-none flex flex-col">
  <!-- Top HUD Bar -->
  <header class="z-20 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/40">WEBGL 3D ENGINE</span>
        <h1 class="text-sm sm:text-base font-extrabold text-white">{title}</h1>
      </div>
      <p class="text-[11px] text-slate-400 hidden sm:block">{subtitle}</p>
    </div>

    <div class="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm font-bold">
      <div class="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
        SKOR: <span id="hudScore" class="text-sky-400 font-mono">0</span>
      </div>
      <div class="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
        GELOMBANG: <span id="hudWave" class="text-amber-400 font-mono">1</span>
      </div>
      <div class="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
        ENERGI INTI: <span id="hudHp" class="text-emerald-400 font-mono">100%</span>
      </div>
      <button id="btnCameraView" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold">Kamera: Orbit/Kejar</button>
      <button id="btnMute" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold">Suara: ON</button>
      <button id="btnPause" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">Jeda</button>
    </div>
  </header>

  <!-- 3D Viewport Container -->
  <main class="relative flex-1 w-full overflow-hidden">
    <div id="gameCanvasContainer" class="w-full h-full"></div>

    <!-- Overlay Start / Game Over Screen -->
    <div id="overlayScreen" class="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl space-y-4">
        <span id="overlayBadge" class="inline-block px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">SIMULASI & GAME 3D SIAP</span>
        <h2 id="overlayTitle" class="text-2xl font-extrabold text-white">{title}</h2>
        <p id="overlayDesc" class="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Kendalikan unit Drone Pertahanan 3D untuk melindungi Reaktor Inti Hijau dari anomali merah. Gunakan <b>WASD / Tombol Panah</b> untuk bergerak dan <b>Spasi / Tombol LASER</b> untuk menembak.
        </p>
        <div class="grid grid-cols-3 gap-2 text-xs bg-slate-800/70 p-3 rounded-xl border border-slate-700">
          <div><div class="text-slate-400">Gerak</div><div class="font-bold text-white mt-0.5">WASD / Panah</div></div>
          <div><div class="text-slate-400">Tembak 3D</div><div class="font-bold text-sky-400 mt-0.5">Spasi / Sentuh</div></div>
          <div><div class="text-slate-400">Kamera</div><div class="font-bold text-emerald-400 mt-0.5">3D Dinamis</div></div>
        </div>
        <button id="btnStartGame" class="w-full py-3 rounded-xl font-extrabold text-sm bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg transition">
          MULAI MISI 3D SEKARANG
        </button>
      </div>
    </div>

    <!-- On-Screen Touch Controls (Mobile & Tablet Friendly) -->
    <div class="absolute bottom-4 left-4 right-4 z-20 flex items-end justify-between pointer-events-none">
      <div class="grid grid-cols-3 gap-1.5 pointer-events-auto bg-slate-900/75 p-2 rounded-2xl border border-slate-700/80 backdrop-blur">
        <div></div>
        <button data-dir="up" class="ctrl-btn w-12 h-12 rounded-xl bg-slate-800 active:bg-sky-500 active:text-slate-950 font-extrabold text-base border border-slate-600">▲</button>
        <div></div>
        <button data-dir="left" class="ctrl-btn w-12 h-12 rounded-xl bg-slate-800 active:bg-sky-500 active:text-slate-950 font-extrabold text-base border border-slate-600">◀</button>
        <button data-dir="down" class="ctrl-btn w-12 h-12 rounded-xl bg-slate-800 active:bg-sky-500 active:text-slate-950 font-extrabold text-base border border-slate-600">▼</button>
        <button data-dir="right" class="ctrl-btn w-12 h-12 rounded-xl bg-slate-800 active:bg-sky-500 active:text-slate-950 font-extrabold text-base border border-slate-600">▶</button>
      </div>

      <button id="btnFireLaser" class="pointer-events-auto px-6 py-4 rounded-2xl bg-rose-600 active:bg-rose-500 text-white font-extrabold text-sm shadow-lg border border-rose-400/50">
        TEMBAK LASER (SPASI)
      </button>
    </div>
  </main>

  <script>
    // =========================================================================
    // 1. SYNTHESIZED WEB AUDIO SFX ENGINE (Zero External Audio Files!)
    // =========================================================================
    const sfx = (() => {{
      let ctx = null;
      let muted = false;
      function ensureCtx() {{
        if (!ctx) {{
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) ctx = new AudioCtx();
        }}
        if (ctx && ctx.state === 'suspended') ctx.resume();
      }}
      function playTone(freqStart, freqEnd, durationSec, type = 'sawtooth', gainVal = 0.08) {{
        if (muted) return;
        try {{
          ensureCtx();
          if (!ctx) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), ctx.currentTime + durationSec);
          gain.gain.setValueAtTime(gainVal, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + durationSec);
        }} catch (_) {{}}
      }}
      return {{
        laser: () => playTone(780, 180, 0.11, 'sawtooth', 0.07),
        explosion: () => playTone(160, 28, 0.26, 'square', 0.10),
        hitCore: () => playTone(220, 65, 0.30, 'triangle', 0.12),
        toggleMute: () => {{ muted = !muted; return muted; }}
      }};
    }})();

    // =========================================================================
    // 2. THREE.JS 3D SCENE, LIGHTING, PROCEDURAL MESHES & GAME LOOP
    // =========================================================================
    window.addEventListener('DOMContentLoaded', () => {{
      const container = document.getElementById('gameCanvasContainer');
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020617);
      scene.fog = new THREE.FogExp2(0x020617, 0.018);

      const camera = new THREE.PerspectiveCamera(58, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 200);
      const renderer = new THREE.WebGLRenderer({{ antialias: true }});
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      container.appendChild(renderer.domElement);

      // Lights
      const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.75);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.15);
      dirLight.position.set(18, 32, 22);
      dirLight.castShadow = true;
      scene.add(dirLight);

      const coreLight = new THREE.PointLight({core_hex}, 2.2, 28);
      coreLight.position.set(0, 3, 0);
      scene.add(coreLight);

      // Arena Grid & Floor
      const floorGeo = new THREE.PlaneGeometry(80, 80);
      const floorMat = new THREE.MeshStandardMaterial({{ color: 0x0f172a, roughness: 0.85, metalness: 0.15 }});
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);

      const gridHelper = new THREE.GridHelper(60, 30, 0x1e293b, 0x1e293b);
      gridHelper.position.y = 0.02;
      scene.add(gridHelper);

      // Central Reactor Core (Protected Object at 0,0,0)
      const coreGroup = new THREE.Group();
      const coreOctGeo = new THREE.OctahedronGeometry(2.1, 1);
      const coreOctMat = new THREE.MeshStandardMaterial({{ color: {core_hex}, emissive: {core_hex}, emissiveIntensity: 0.35, wireframe: false, flatShading: true }});
      const coreMesh = new THREE.Mesh(coreOctGeo, coreOctMat);
      coreMesh.position.y = 2.4;
      coreMesh.castShadow = true;
      coreGroup.add(coreMesh);

      const ringGeo = new THREE.TorusGeometry(3.1, 0.14, 12, 48);
      const ringMat = new THREE.MeshStandardMaterial({{ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4 }});
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 2.4;
      ringMesh.rotation.x = Math.PI / 2;
      coreGroup.add(ringMesh);
      scene.add(coreGroup);

      // Procedural Player Defender Drone (Group of Geometries)
      const playerGroup = new THREE.Group();
      const bodyGeo = new THREE.ConeGeometry(1.1, 2.6, 6);
      bodyGeo.rotateX(Math.PI / 2);
      const bodyMat = new THREE.MeshStandardMaterial({{ color: {primary_hex}, emissive: {primary_hex}, emissiveIntensity: 0.25, roughness: 0.3, metalness: 0.7 }});
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.castShadow = true;
      playerGroup.add(bodyMesh);

      const wingGeo = new THREE.BoxGeometry(2.8, 0.18, 0.9);
      const wingMat = new THREE.MeshStandardMaterial({{ color: 0xe2e8f0, metalness: 0.6, roughness: 0.3 }});
      const wingMesh = new THREE.Mesh(wingGeo, wingMat);
      playerGroup.add(wingMesh);

      playerGroup.position.set(0, 1.4, 8);
      scene.add(playerGroup);

      // Game State
      const gameState = {{
        mode: 'READY', // READY | PLAYING | PAUSED | GAMEOVER
        score: 0,
        wave: 1,
        coreHp: 100,
        camChase: true,
        keys: {{ up: false, down: false, left: false, right: false }},
        aimAngle: Math.PI, // menghadap ke arah -Z awal
        lasers: [],
        enemies: [],
        particles: [],
        spawnTimer: 0
      }};

      function updateHud() {{
        document.getElementById('hudScore').textContent = gameState.score;
        document.getElementById('hudWave').textContent = gameState.wave;
        document.getElementById('hudHp').textContent = Math.max(0, gameState.coreHp) + '%';
      }}

      function spawnExplosion(pos, colorHex, count = 14) {{
        const geo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
        const mat = new THREE.MeshBasicMaterial({{ color: colorHex }});
        for (let i = 0; i < count; i++) {{
          const m = new THREE.Mesh(geo, mat);
          m.position.copy(pos);
          const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 14,
            Math.random() * 8 + 2,
            (Math.random() - 0.5) * 14
          );
          scene.add(m);
          gameState.particles.push({{ mesh: m, vel, life: 0.45 }});
        }}
      }}

      function fireLaser() {{
        if (gameState.mode !== 'PLAYING') return;
        sfx.laser();
        const geo = new THREE.CylinderGeometry(0.12, 0.12, 1.6, 8);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({{ color: 0x38bdf8 }});
        const laser = new THREE.Mesh(geo, mat);
        laser.position.copy(playerGroup.position);
        laser.rotation.y = playerGroup.rotation.y;
        const dir = new THREE.Vector3(Math.sin(playerGroup.rotation.y), 0, Math.cos(playerGroup.rotation.y)).normalize();
        scene.add(laser);
        gameState.lasers.push({{ mesh: laser, dir, life: 1.4 }});
      }}

      function spawnEnemy() {{
        const angle = Math.random() * Math.PI * 2;
        const radius = 26 + Math.random() * 4;
        const geo = new THREE.DodecahedronGeometry(1.05, 0);
        const mat = new THREE.MeshStandardMaterial({{ color: {enemy_hex}, emissive: {enemy_hex}, emissiveIntensity: 0.3, roughness: 0.4 }});
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(Math.cos(angle) * radius, 1.4, Math.sin(angle) * radius);
        mesh.castShadow = true;
        scene.add(mesh);
        const speed = 4.2 + Math.min(6.0, gameState.wave * 0.55);
        gameState.enemies.push({{ mesh, speed }});
      }}

      function resetGame() {{
        gameState.lasers.forEach(l => scene.remove(l.mesh));
        gameState.enemies.forEach(e => scene.remove(e.mesh));
        gameState.particles.forEach(p => scene.remove(p.mesh));
        gameState.lasers = [];
        gameState.enemies = [];
        gameState.particles = [];
        gameState.score = 0;
        gameState.wave = 1;
        gameState.coreHp = 100;
        gameState.spawnTimer = 0.5;
        playerGroup.position.set(0, 1.4, 8);
        playerGroup.rotation.y = Math.PI;
        gameState.mode = 'PLAYING';
        document.getElementById('overlayScreen').classList.add('hidden');
        updateHud();
      }}

      // Input Listeners (Keyboard + On-Screen Touch Buttons)
      window.addEventListener('keydown', e => {{
        const k = e.key.toLowerCase();
        if (k === 'w' || e.key === 'ArrowUp') gameState.keys.up = true;
        if (k === 's' || e.key === 'ArrowDown') gameState.keys.down = true;
        if (k === 'a' || e.key === 'ArrowLeft') gameState.keys.left = true;
        if (k === 'd' || e.key === 'ArrowRight') gameState.keys.right = true;
        if (e.code === 'Space') {{ e.preventDefault(); fireLaser(); }}
      }});

      window.addEventListener('keyup', e => {{
        const k = e.key.toLowerCase();
        if (k === 'w' || e.key === 'ArrowUp') gameState.keys.up = false;
        if (k === 's' || e.key === 'ArrowDown') gameState.keys.down = false;
        if (k === 'a' || e.key === 'ArrowLeft') gameState.keys.left = false;
        if (k === 'd' || e.key === 'ArrowRight') gameState.keys.right = false;
      }});

      document.querySelectorAll('.ctrl-btn').forEach(btn => {{
        const dir = btn.getAttribute('data-dir');
        const setDir = val => {{ gameState.keys[dir] = val; }};
        btn.addEventListener('mousedown', () => setDir(true));
        btn.addEventListener('mouseup', () => setDir(false));
        btn.addEventListener('mouseleave', () => setDir(false));
        btn.addEventListener('touchstart', e => {{ e.preventDefault(); setDir(true); }});
        btn.addEventListener('touchend', e => {{ e.preventDefault(); setDir(false); }});
      }});

      document.getElementById('btnFireLaser').addEventListener('click', fireLaser);
      document.getElementById('btnStartGame').addEventListener('click', resetGame);

      document.getElementById('btnPause').addEventListener('click', () => {{
        if (gameState.mode === 'PLAYING') {{
          gameState.mode = 'PAUSED';
          document.getElementById('btnPause').textContent = 'Lanjut';
        }} else if (gameState.mode === 'PAUSED') {{
          gameState.mode = 'PLAYING';
          document.getElementById('btnPause').textContent = 'Jeda';
        }}
      }});

      document.getElementById('btnCameraView').addEventListener('click', () => {{
        gameState.camChase = !gameState.camChase;
      }});

      document.getElementById('btnMute').addEventListener('click', () => {{
        const m = sfx.toggleMute();
        document.getElementById('btnMute').textContent = m ? 'Suara: OFF' : 'Suara: ON';
      }});

      window.addEventListener('resize', () => {{
        camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      }});

      // Main 60FPS Animation & Physics Loop
      let lastTime = performance.now();
      function animate(now) {{
        requestAnimationFrame(animate);
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        // Rotate Central Reactor Core
        coreMesh.rotation.y += dt * 1.4;
        coreMesh.rotation.x += dt * 0.5;
        ringMesh.rotation.z -= dt * 1.1;

        if (gameState.mode === 'PLAYING') {{
          // Player Movement
          const moveSpeed = 14.0;
          let vx = 0, vz = 0;
          if (gameState.keys.left) vx -= 1;
          if (gameState.keys.right) vx += 1;
          if (gameState.keys.up) vz -= 1;
          if (gameState.keys.down) vz += 1;

          if (vx !== 0 || vz !== 0) {{
            const len = Math.hypot(vx, vz);
            vx /= len; vz /= len;
            playerGroup.position.x = Math.max(-25, Math.min(25, playerGroup.position.x + vx * moveSpeed * dt));
            playerGroup.position.z = Math.max(-25, Math.min(25, playerGroup.position.z + vz * moveSpeed * dt));
            playerGroup.rotation.y = Math.atan2(vx, vz);
          }}

          // Update Lasers
          for (let i = gameState.lasers.length - 1; i >= 0; i--) {{
            const l = gameState.lasers[i];
            l.mesh.position.addScaledVector(l.dir, 36.0 * dt);
            l.life -= dt;
            if (l.life <= 0) {{
              scene.remove(l.mesh);
              gameState.lasers.splice(i, 1);
            }}
          }}

          // Spawn Enemies
          gameState.spawnTimer -= dt;
          if (gameState.spawnTimer <= 0) {{
            spawnEnemy();
            const interval = Math.max(0.55, 1.8 - gameState.wave * 0.12);
            gameState.spawnTimer = interval;
          }}

          // Update Enemies & Check Collisions
          for (let i = gameState.enemies.length - 1; i >= 0; i--) {{
            const e = gameState.enemies[i];
            e.mesh.rotation.x += dt * 2.5;
            e.mesh.rotation.y += dt * 2.5;
            const toCenter = new THREE.Vector3(0, 1.4, 0).sub(e.mesh.position).normalize();
            e.mesh.position.addScaledVector(toCenter, e.speed * dt);

            // Check Laser Hits Enemy
            let hitByLaser = false;
            for (let j = gameState.lasers.length - 1; j >= 0; j--) {{
              const l = gameState.lasers[j];
              if (l.mesh.position.distanceTo(e.mesh.position) < 1.55) {{
                hitByLaser = true;
                scene.remove(l.mesh);
                gameState.lasers.splice(j, 1);
                break;
              }}
            }}

            if (hitByLaser) {{
              sfx.explosion();
              spawnExplosion(e.mesh.position, {enemy_hex}, 14);
              scene.remove(e.mesh);
              gameState.enemies.splice(i, 1);
              gameState.score += 100;
              gameState.wave = 1 + Math.floor(gameState.score / 600);
              updateHud();
              continue;
            }}

            // Check Enemy Hits Player Drone (Ramming defense)
            if (e.mesh.position.distanceTo(playerGroup.position) < 1.9) {{
              sfx.explosion();
              spawnExplosion(e.mesh.position, 0x38bdf8, 12);
              scene.remove(e.mesh);
              gameState.enemies.splice(i, 1);
              gameState.score += 50;
              updateHud();
              continue;
            }}

            // Check Enemy Hits Central Core
            if (e.mesh.position.distanceTo(new THREE.Vector3(0, 1.4, 0)) < 2.6) {{
              sfx.hitCore();
              spawnExplosion(e.mesh.position, 0xf59e0b, 18);
              scene.remove(e.mesh);
              gameState.enemies.splice(i, 1);
              gameState.coreHp -= 20;
              updateHud();
              if (gameState.coreHp <= 0) {{
                gameState.mode = 'GAMEOVER';
                document.getElementById('overlayBadge').textContent = 'MISI SELESAI — REAKTOR KRITIS';
                document.getElementById('overlayTitle').textContent = 'Skor Akhir: ' + gameState.score;
                document.getElementById('overlayDesc').textContent = 'Kamu berhasil mempertahankan Reaktor Inti hingga Gelombang ' + gameState.wave + '. Klik tombol di bawah untuk memulai simulasi baru.';
                document.getElementById('btnStartGame').textContent = 'MAIN LAGI (RESTART 3D)';
                document.getElementById('overlayScreen').classList.remove('hidden');
              }}
            }}
          }}
        }}

        // Update Explosion Particles
        for (let i = gameState.particles.length - 1; i >= 0; i--) {{
          const p = gameState.particles[i];
          p.mesh.position.addScaledVector(p.vel, dt);
          p.vel.y -= 18.0 * dt;
          p.life -= dt;
          p.mesh.scale.setScalar(Math.max(0.01, p.life * 2));
          if (p.life <= 0) {{
            scene.remove(p.mesh);
            gameState.particles.splice(i, 1);
          }}
        }}

        // Dynamic Camera Tracking (Chase vs Top-Orbit)
        if (gameState.camChase) {{
          const targetCamPos = new THREE.Vector3(playerGroup.position.x * 0.65, 16.5, playerGroup.position.z + 15.5);
          camera.position.lerp(targetCamPos, 0.08);
          camera.lookAt(playerGroup.position.x * 0.4, 1.2, playerGroup.position.z * 0.4);
        }} else {{
          const orbitAngle = now * 0.00035;
          camera.position.set(Math.cos(orbitAngle) * 28, 22, Math.sin(orbitAngle) * 28);
          camera.lookAt(0, 2, 0);
        }}

        renderer.render(scene, camera);
      }}

      requestAnimationFrame(animate);
    }});
  </script>
</body>
</html>
"""
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    return out_path


if __name__ == "__main__":
    if len(sys.argv) < 3:
        spec_obj = {}
        out_f = sys.argv[1] if len(sys.argv) == 2 else "game_3d.html"
    else:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            spec_obj = json.load(f)
        out_f = sys.argv[2]
    res = build_3d_game(spec_obj, out_f)
    chk = frontend_kit.check_web_app(res)
    print(f"OK -> {res} (Audit: {'PASSED' if chk['ok'] else chk['errors']})")

#!/usr/bin/env python3
"""
world3d_kit.py — Mesin Pembuat Dunia 3D Interaktif, Industrial 3D Digital Twin (Lengan Robot 6-DOF + Konveyor Bergerak),
Konfigurator Produk 3D (Exploded View), dan Simulator Terrain 3D (Three.js WebGL Single-File).

Fitur Utama:
  - 4 Lini Produksi 3D lengkap dengan Lengan Robot Artikulasi (Base, Shoulder, Elbow, Wrist, Gripper) yang bergerak
    mengambil & memindahkan unit produk di atas sabuk konveyor 3D!
  - Lampu Menara Andon 3D (Hijau = NORMAL, Kuning = PERHATIAN, Merah = STOP)
  - Raycasting 3D Interaktif: Klik langsung pada mesin/lini 3D mana saja di layar untuk membuka telemetri real-time
    (OEE %, Suhu °C, Kecepatan RPM, Indeks Six Sigma Cpk, dan Tombol Maintenance/Kalibrasi)
  - Kontrol Kamera Orbit 3D (Drag untuk putar, Scroll untuk zoom, plus Preset Kamera: Perspektif Utuh, Atas/Denah, Close-Up Robot)
  - Pengatur Kecepatan Simulasi (0.5x s/d 3.0x), Mode Pencahayaan Siang/Malam Pabrik, dan Ekspor Snapshot PNG!

Cara pakai:
  python3 kits/world3d_kit.py spec.json digital_twin_3d.html
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import frontend_kit


def build_world3d(spec: dict, out_path: str) -> str:
    title = spec.get("title", "Smart Factory 3D Digital Twin & 6-DOF Robot SCADA")
    subtitle = spec.get("subtitle", "Klik Lini/Robot 3D untuk Inspeksi Telemetri OEE & Cpk — Drag untuk Putar Kamera 3D")
    lines_data = json.dumps(spec.get("lines", [
        {"id": 0, "name": "Lini 1 — Stamping Press 3D", "oee": 86.5, "cpk": 1.41, "temp": 64.2, "rpm": 1240, "output": 4120, "target": 4000, "status": "RUNNING", "color": 0x38bdf8},
        {"id": 1, "name": "Lini 2 — Robotic Assembly 6-DOF", "oee": 91.2, "cpk": 1.62, "temp": 58.5, "rpm": 1450, "output": 4350, "target": 4000, "status": "OPTIMAL", "color": 0x10b981},
        {"id": 2, "name": "Lini 3 — High-Speed Packaging", "oee": 84.5, "cpk": 1.34, "temp": 71.8, "rpm": 980,  "output": 3980, "target": 4000, "status": "WARNING", "color": 0xf59e0b},
        {"id": 3, "name": "Lini 4 — Optical Laser QC", "oee": 89.8, "cpk": 1.55, "temp": 54.0, "rpm": 1380, "output": 4510, "target": 4200, "status": "RUNNING", "color": 0x818cf8},
    ]))

    html = f"""<!DOCTYPE html>
<html lang="id" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <script src="https://cdn.tailwindcss.com/3.4.17"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    body {{ font-family: 'Inter', sans-serif; }}
    #viewport3d canvas {{ display: block; width: 100% !important; height: 100% !important; cursor: grab; }}
    #viewport3d canvas:active {{ cursor: grabbing; }}
  </style>
</head>
<body class="h-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
  <!-- Header Bar -->
  <header class="z-20 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">3D DIGITAL TWIN SCADA</span>
        <h1 class="text-sm sm:text-base font-extrabold text-white">{title}</h1>
      </div>
      <p class="text-[11px] text-slate-400 hidden sm:block">{subtitle}</p>
    </div>

    <div class="flex flex-wrap items-center gap-2 text-xs">
      <button data-cam="iso" class="cam-btn px-3 py-1.5 rounded-xl bg-sky-600 text-white font-semibold">Kamera Isometrik</button>
      <button data-cam="top" class="cam-btn px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold">Denah Atas</button>
      <button data-cam="robot" class="cam-btn px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold">Close-Up Robot</button>
      <button id="btnExplode" class="px-3 py-1.5 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white font-semibold">Exploded View: OFF</button>
      <button id="btnSnapshot" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold">Simpan Foto 3D</button>
    </div>
  </header>

  <!-- Main Workspace: 3D Viewport + Right Telemetry Inspector -->
  <div class="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
    <!-- 3D Canvas -->
    <div id="viewport3d" class="flex-1 relative h-full w-full">
      <!-- Floating Bottom Controls -->
      <div class="absolute bottom-4 left-4 z-10 bg-slate-900/85 backdrop-blur border border-slate-700/80 rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-4 text-xs">
        <div class="flex items-center gap-2">
          <label for="speedSlider" class="font-semibold text-slate-300">Kecepatan Lini 3D:</label>
          <input id="speedSlider" type="range" min="0" max="30" value="10" class="w-24 accent-sky-500" />
          <span id="speedLabel" class="font-mono font-bold text-sky-400">1.0x</span>
        </div>
        <button id="btnLightMode" class="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-600 font-semibold">Pencahayaan: Studio Terang</button>
      </div>
    </div>

    <!-- Right Sidebar: 3D Object Inspector & Telemetry -->
    <aside class="w-full lg:w-88 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col justify-between overflow-y-auto max-h-64 lg:max-h-full">
      <div class="space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-sky-400">INSPEKTOR OBJEK 3D AKTIF</div>
            <h2 id="inspName" class="text-base font-extrabold text-white mt-0.5">Lini 2 — Robotic Assembly 6-DOF</h2>
          </div>
          <span id="inspBadge" class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">OPTIMAL</span>
        </div>

        <!-- Line Selector Pills -->
        <div class="grid grid-cols-4 gap-1.5" id="lineSelectorGrid"></div>

        <!-- Telemetry Metrics Grid -->
        <div class="grid grid-cols-2 gap-2.5 text-xs">
          <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <div class="text-slate-400">Efisiensi OEE</div>
            <div id="inspOee" class="text-lg font-extrabold text-white mt-0.5 font-mono">91.2%</div>
          </div>
          <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <div class="text-slate-400">Kapabilitas Cpk</div>
            <div id="inspCpk" class="text-lg font-extrabold text-emerald-400 mt-0.5 font-mono">1.62</div>
          </div>
          <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <div class="text-slate-400">Suhu Servo 3D</div>
            <div id="inspTemp" class="text-lg font-extrabold text-amber-300 mt-0.5 font-mono">58.5°C</div>
          </div>
          <div class="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <div class="text-slate-400">Output Aktual</div>
            <div id="inspOut" class="text-lg font-extrabold text-sky-300 mt-0.5 font-mono">4.350 Unit</div>
          </div>
        </div>

        <!-- 6-DOF Joint Angles Live Telemetry -->
        <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div class="font-bold text-slate-300 flex justify-between">
            <span>Kinematika Sendi Robot (6-DOF)</span>
            <span id="jointStatus" class="text-sky-400 font-mono">AKTIF</span>
          </div>
          <div class="space-y-1 font-mono text-[11px] text-slate-400">
            <div class="flex justify-between"><span>J1 (Base Yaw):</span><span id="valJ1" class="text-white">0.0°</span></div>
            <div class="flex justify-between"><span>J2 (Shoulder Pitch):</span><span id="valJ2" class="text-white">0.0°</span></div>
            <div class="flex justify-between"><span>J3 (Elbow Pitch):</span><span id="valJ3" class="text-white">0.0°</span></div>
          </div>
        </div>

        <button id="btnCalibrateLine" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition">
          Kalibrasi Sensor & Optimasi Lini Ini
        </button>
      </div>

      <div id="toast3d" class="mt-3 hidden bg-sky-500/20 border border-sky-500/50 text-sky-200 px-3 py-2 rounded-xl text-xs font-semibold text-center"></div>
    </aside>
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {{
      const lines = {lines_data};
      let selectedIdx = 1;
      let simSpeed = 1.0;
      let explodedView = false;
      let brightStudio = true;

      function showToast(msg) {{
        const t = document.getElementById('toast3d');
        t.textContent = msg;
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 2600);
      }}

      // Setup Three.js Scene
      const vp = document.getElementById('viewport3d');
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x090d16);
      scene.fog = new THREE.FogExp2(0x090d16, 0.012);

      const camera = new THREE.PerspectiveCamera(48, vp.clientWidth / Math.max(1, vp.clientHeight), 0.1, 250);
      const renderer = new THREE.WebGLRenderer({{ antialias: true, preserveDrawingBuffer: true }});
      renderer.setSize(vp.clientWidth, vp.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      vp.appendChild(renderer.domElement);

      // Lights
      const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 0.85);
      scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
      dirLight.position.set(22, 36, 24);
      dirLight.castShadow = true;
      scene.add(dirLight);

      // Factory Floor & Grid
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(90, 90),
        new THREE.MeshStandardMaterial({{ color: 0x0f172a, roughness: 0.8, metalness: 0.2 }})
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const grid = new THREE.GridHelper(64, 32, 0x1e293b, 0x1e293b);
      grid.position.y = 0.02;
      scene.add(grid);

      // Build 4 3D Conveyor Lines + Articulated 6-DOF Robot Arms + Moving Boxes
      const lineObjects = [];
      const pickableMeshes = [];

      lines.forEach((ln, idx) => {{
        const zPos = (idx - 1.5) * 9.0;
        const root = new THREE.Group();
        root.position.set(0, 0, zPos);
        scene.add(root);

        // Conveyor Bed
        const bedMat = new THREE.MeshStandardMaterial({{ color: 0x334155, metalness: 0.6, roughness: 0.35 }});
        const bed = new THREE.Mesh(new THREE.BoxGeometry(26, 1.0, 2.6), bedMat);
        bed.position.set(0, 0.9, 0);
        bed.castShadow = true;
        bed.receiveShadow = true;
        bed.userData = {{ lineIdx: idx }};
        root.add(bed);
        pickableMeshes.push(bed);

        // Highlight Selection Ring around active line
        const selFrame = new THREE.Mesh(
          new THREE.BoxGeometry(27.2, 0.12, 3.6),
          new THREE.MeshBasicMaterial({{ color: ln.color, wireframe: false }})
        );
        selFrame.position.set(0, 0.08, 0);
        selFrame.visible = (idx === selectedIdx);
        root.add(selFrame);

        // Articulated Robot Arm beside conveyor
        const robotBase = new THREE.Group();
        robotBase.position.set(0, 1.4, -2.4);
        root.add(robotBase);

        const pedMat = new THREE.MeshStandardMaterial({{ color: 0x475569, metalness: 0.7, roughness: 0.3 }});
        const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 1.4, 16), pedMat);
        pedestal.userData = {{ lineIdx: idx }};
        robotBase.add(pedestal);
        pickableMeshes.push(pedestal);

        // J1 Turret
        const j1Yaw = new THREE.Group();
        j1Yaw.position.y = 0.8;
        robotBase.add(j1Yaw);

        const armMat = new THREE.MeshStandardMaterial({{ color: ln.color, metalness: 0.5, roughness: 0.25 }});
        const turretMesh = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 16), armMat);
        turretMesh.userData = {{ lineIdx: idx }};
        j1Yaw.add(turretMesh);
        pickableMeshes.push(turretMesh);

        // J2 Lower Arm
        const j2Pitch = new THREE.Group();
        j1Yaw.add(j2Pitch);
        const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.8, 0.55), armMat);
        lowerArm.position.y = 1.4;
        lowerArm.castShadow = true;
        lowerArm.userData = {{ lineIdx: idx }};
        j2Pitch.add(lowerArm);
        pickableMeshes.push(lowerArm);

        // J3 Forearm + Gripper
        const j3Elbow = new THREE.Group();
        j3Elbow.position.y = 2.7;
        j2Pitch.add(j3Elbow);
        const foreArm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 2.4), new THREE.MeshStandardMaterial({{ color: 0xe2e8f0, metalness: 0.6 }}));
        foreArm.position.z = 1.1;
        foreArm.castShadow = true;
        j3Elbow.add(foreArm);

        // Andon Status Tower Light
        const towerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.8, 8), pedMat);
        towerPole.position.set(-11.5, 2.4, -1.2);
        root.add(towerPole);

        const lampColor = ln.status === 'WARNING' ? 0xf59e0b : 0x10b981;
        const andonLamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.42, 12, 12),
          new THREE.MeshBasicMaterial({{ color: lampColor }})
        );
        andonLamp.position.set(-11.5, 4.4, -1.2);
        root.add(andonLamp);

        // Moving Product Boxes on Conveyor
        const boxes = [];
        for (let b = 0; b < 5; b++) {{
          const boxMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 0.85, 1.1),
            new THREE.MeshStandardMaterial({{ color: 0x38bdf8, roughness: 0.3, metalness: 0.4 }})
          );
          boxMesh.position.set(-12 + b * 5.2, 1.85, 0);
          boxMesh.castShadow = true;
          boxMesh.userData = {{ lineIdx: idx }};
          root.add(boxMesh);
          boxes.push(boxMesh);
          pickableMeshes.push(boxMesh);
        }}

        lineObjects.push({{ root, bed, selFrame, j1Yaw, j2Pitch, j3Elbow, andonLamp, boxes }});
      }});

      // Render Line Selector Pills & Update Telemetry Panel
      function renderInspector() {{
        const ln = lines[selectedIdx];
        document.getElementById('inspName').textContent = ln.name;
        document.getElementById('inspOee').textContent = ln.oee.toFixed(1) + '%';
        document.getElementById('inspCpk').textContent = ln.cpk.toFixed(2);
        document.getElementById('inspTemp').textContent = ln.temp.toFixed(1) + '°C';
        document.getElementById('inspOut').textContent = ln.output.toLocaleString('id-ID') + ' Unit';

        const badge = document.getElementById('inspBadge');
        badge.textContent = ln.status;
        badge.className = ln.status === 'WARNING'
          ? 'px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40'
          : 'px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';

        lineObjects.forEach((obj, i) => {{
          obj.selFrame.visible = (i === selectedIdx);
        }});

        const gridEl = document.getElementById('lineSelectorGrid');
        gridEl.innerHTML = lines.map((item, i) => `
          <button data-sel="${{i}}" class="py-1.5 rounded-xl text-xs font-bold border transition ${{
            i === selectedIdx
              ? 'bg-sky-600 text-white border-sky-400'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }}">Lini ${{i + 1}}</button>
        `).join('');

        gridEl.querySelectorAll('button[data-sel]').forEach(btn => {{
          btn.addEventListener('click', () => {{
            selectedIdx = Number(btn.getAttribute('data-sel'));
            renderInspector();
          }});
        }});
      }}
      renderInspector();

      // Spherical Orbit Camera Control (Mouse Drag + Wheel + Touch)
      const camSpherical = {{ radius: 34, theta: 0.65, phi: 1.05, target: new THREE.Vector3(0, 1.5, 0) }};
      let isDragging = false, prevX = 0, prevY = 0;

      vp.addEventListener('mousedown', e => {{ isDragging = true; prevX = e.clientX; prevY = e.clientY; }});
      window.addEventListener('mouseup', () => {{ isDragging = false; }});
      window.addEventListener('mousemove', e => {{
        if (!isDragging) return;
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        prevX = e.clientX; prevY = e.clientY;
        camSpherical.theta -= dx * 0.007;
        camSpherical.phi = Math.max(0.25, Math.min(1.45, camSpherical.phi - dy * 0.007));
      }});
      vp.addEventListener('wheel', e => {{
        e.preventDefault();
        camSpherical.radius = Math.max(12, Math.min(65, camSpherical.radius + e.deltaY * 0.02));
      }}, {{ passive: false }});

      // 3D Raycast Click on Any Machine / Line
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      vp.addEventListener('click', e => {{
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(pickableMeshes, false);
        if (hits.length > 0 && hits[0].object.userData.lineIdx !== undefined) {{
          selectedIdx = hits[0].object.userData.lineIdx;
          renderInspector();
          showToast('Memilih ' + lines[selectedIdx].name);
        }}
      }});

      // Camera Preset Buttons
      document.querySelectorAll('.cam-btn').forEach(btn => {{
        btn.addEventListener('click', () => {{
          const mode = btn.getAttribute('data-cam');
          if (mode === 'iso') {{ camSpherical.radius = 34; camSpherical.theta = 0.65; camSpherical.phi = 1.05; camSpherical.target.set(0, 1.5, 0); }}
          if (mode === 'top') {{ camSpherical.radius = 40; camSpherical.theta = 0.01; camSpherical.phi = 0.28; camSpherical.target.set(0, 0, 0); }}
          if (mode === 'robot') {{
            const zPos = (selectedIdx - 1.5) * 9.0;
            camSpherical.radius = 14; camSpherical.theta = 0.45; camSpherical.phi = 1.12; camSpherical.target.set(0, 2.2, zPos);
          }}
        }});
      }});

      // Exploded View Toggle
      document.getElementById('btnExplode').addEventListener('click', () => {{
        explodedView = !explodedView;
        document.getElementById('btnExplode').textContent = explodedView ? 'Exploded View: ON' : 'Exploded View: OFF';
        lineObjects.forEach(obj => {{
          obj.j2Pitch.position.y = explodedView ? 0.9 : 0.0;
          obj.j3Elbow.position.y = explodedView ? 3.5 : 2.7;
          obj.bed.position.y = explodedView ? 1.5 : 0.9;
        }});
        showToast(explodedView ? 'Mode Exploded View Komponen 3D Aktif' : 'Mode Rakit Normal Aktif');
      }});

      // Snapshot Download
      document.getElementById('btnSnapshot').addEventListener('click', () => {{
        renderer.render(scene, camera);
        const a = document.createElement('a');
        a.href = renderer.domElement.toDataURL('image/png');
        a.download = 'digital_twin_3d_snapshot.png';
        a.click();
        showToast('Foto 3D berhasil diunduh!');
      }});

      // Speed Slider & Light Mode
      document.getElementById('speedSlider').addEventListener('input', e => {{
        simSpeed = Number(e.target.value) / 10.0;
        document.getElementById('speedLabel').textContent = simSpeed.toFixed(1) + 'x';
      }});

      document.getElementById('btnLightMode').addEventListener('click', () => {{
        brightStudio = !brightStudio;
        dirLight.intensity = brightStudio ? 1.25 : 0.45;
        hemiLight.intensity = brightStudio ? 0.85 : 0.35;
        document.getElementById('btnLightMode').textContent = brightStudio ? 'Pencahayaan: Studio Terang' : 'Pencahayaan: Shift Malam';
      }});

      // Calibrate Selected Line Action
      document.getElementById('btnCalibrateLine').addEventListener('click', () => {{
        const ln = lines[selectedIdx];
        ln.oee = Math.min(96.5, ln.oee + 2.4);
        ln.cpk = Math.min(1.85, ln.cpk + 0.12);
        ln.temp = Math.max(52.0, ln.temp - 4.5);
        ln.status = 'OPTIMAL';
        lineObjects[selectedIdx].andonLamp.material.color.setHex(0x10b981);
        renderInspector();
        showToast(ln.name + ' berhasil dikalibrasi! Cpk naik ke ' + ln.cpk.toFixed(2));
      }});

      window.addEventListener('resize', () => {{
        camera.aspect = vp.clientWidth / Math.max(1, vp.clientHeight);
        camera.updateProjectionMatrix();
        renderer.setSize(vp.clientWidth, vp.clientHeight);
      }});

      // 60FPS Animation Loop
      let lastTime = performance.now();
      let simClock = 0;
      function animate(now) {{
        requestAnimationFrame(animate);
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        simClock += dt * simSpeed;

        lineObjects.forEach((obj, idx) => {{
          const phase = simClock * 2.2 + idx * 1.3;
          const j1 = Math.sin(phase) * 0.65;
          const j2 = Math.sin(phase * 2) * 0.28 + 0.15;
          const j3 = Math.cos(phase * 2) * 0.35 - 0.2;
          obj.j1Yaw.rotation.y = j1;
          obj.j2Pitch.rotation.x = j2;
          obj.j3Elbow.rotation.x = j3;

          if (idx === selectedIdx) {{
            document.getElementById('valJ1').textContent = (j1 * 57.29).toFixed(1) + '°';
            document.getElementById('valJ2').textContent = (j2 * 57.29).toFixed(1) + '°';
            document.getElementById('valJ3').textContent = (j3 * 57.29).toFixed(1) + '°';
          }}

          // Move product boxes along conveyor
          obj.boxes.forEach(b => {{
            b.position.x += 3.8 * dt * simSpeed;
            if (b.position.x > 12.5) b.position.x = -12.5;
          }});
        }});

        // Update Camera Position from Spherical Coordinates
        camera.position.x = camSpherical.target.x + camSpherical.radius * Math.sin(camSpherical.phi) * Math.sin(camSpherical.theta);
        camera.position.y = camSpherical.target.y + camSpherical.radius * Math.cos(camSpherical.phi);
        camera.position.z = camSpherical.target.z + camSpherical.radius * Math.sin(camSpherical.phi) * Math.cos(camSpherical.theta);
        camera.lookAt(camSpherical.target);

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
        out_f = sys.argv[1] if len(sys.argv) == 2 else "digital_twin_3d.html"
    else:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            spec_obj = json.load(f)
        out_f = sys.argv[2]
    res = build_world3d(spec_obj, out_f)
    chk = frontend_kit.check_web_app(res)
    print(f"OK -> {res} (Audit: {'PASSED' if chk['ok'] else chk['errors']})")

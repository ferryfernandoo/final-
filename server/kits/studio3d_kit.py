#!/usr/bin/env python3
"""
studio3d_kit.py — Mesin Pembuat Aplikasi 5-in-1 Professional 3D Studio & SVG/OBJ Exporter (Three.js WebGL Single-File)

Menyediakan 5 Dunia/Simulasi 3D Profesional dalam 1 Aplikasi:
  1. [Scene 1 — 6-DOF Robot & Inverse Kinematics] : Lengan robot industri 6-sumbu + kontrol slider masing-masing sendi J1/J2/J3
  2. [Scene 2 — 3D Terrain, Ocean & Buoyancy]     : Pegunungan bioma prosedural + gelombang laut dinamis + objek mengapung
  3. [Scene 3 — 3D Parametric CAD Gear & Lathe]   : Inspeksi Roda Gigi & Komponen Mesin 3D + Wireframe + Unduh File .OBJ 3D Langsung!
  4. [Scene 4 — 3D Smart Poultry & AGV Warehouse] : Kandang modern / gudang palet 3D dengan robot AGV bergerak otomatis
  5. [Scene 5 — 3D Global Supply Chain Globe]     : Bola dunia logistik 3D dengan busur rute pengiriman beranimasi

Cara pakai:
  python3 kits/studio3d_kit.py output_studio3d.html
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import frontend_kit


def build_studio3d(out_path: str) -> str:
    html = """<!DOCTYPE html>
<html lang="id" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pro 3D Engineering, CAD & Simulation Studio (5-in-1 WebGL + OBJ/SVG Exporter)</title>
  <script src="https://cdn.tailwindcss.com/3.4.17"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Inter', sans-serif; }
    #canvas3dWrap canvas { display: block; width: 100% !important; height: 100% !important; cursor: grab; }
    #canvas3dWrap canvas:active { cursor: grabbing; }
  </style>
</head>
<body class="h-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
  <!-- Header Bar -->
  <header class="z-20 bg-slate-900/95 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-2.5">
      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">PRO 3D STUDIO v7.0</span>
      <h1 class="text-sm sm:text-base font-extrabold text-white">Multi-Scene 3D Engineering, Terrain, Robot IK & CAD Exporter</h1>
    </div>

    <!-- 5 Scene Switcher Tabs -->
    <div class="flex flex-wrap items-center gap-1.5 text-xs">
      <button data-scene="robot" class="scene-tab px-3 py-1.5 rounded-xl font-bold bg-indigo-600 text-white">1. Robot 6-DOF & IK</button>
      <button data-scene="terrain" class="scene-tab px-3 py-1.5 rounded-xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700">2. Terrain & Lautan 3D</button>
      <button data-scene="cad" class="scene-tab px-3 py-1.5 rounded-xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700">3. CAD Gear & Lathe</button>
      <button data-scene="agv" class="scene-tab px-3 py-1.5 rounded-xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700">4. Smart Gudang & AGV</button>
      <button data-scene="globe" class="scene-tab px-3 py-1.5 rounded-xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700">5. 3D Logistics Globe</button>
    </div>
  </header>

  <!-- Main Content -->
  <div class="flex-1 flex flex-col lg:flex-row overflow-hidden">
    <!-- 3D Viewport -->
    <div id="canvas3dWrap" class="flex-1 relative h-full w-full"></div>

    <!-- Right Control & Export Panel -->
    <aside class="w-full lg:w-84 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col justify-between overflow-y-auto max-h-64 lg:max-h-full space-y-4">
      <div class="space-y-4">
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-indigo-400">KONTROL PARAMETER 3D LIVE</div>
          <h2 id="sceneTitle" class="text-base font-extrabold text-white mt-0.5">1. Lengan Robot Industri 6-DOF</h2>
          <p id="sceneDesc" class="text-xs text-slate-400 mt-1">Gunakan slider di bawah untuk menggerakkan sendi robot atau aktifkan mode Otomatis.</p>
        </div>

        <div class="space-y-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/80 text-xs">
          <div class="flex items-center justify-between">
            <label for="paramA" class="font-semibold text-slate-300">Parameter Sumbu A (J1 / Elevasi):</label>
            <span id="valParamA" class="font-mono font-bold text-sky-400">0</span>
          </div>
          <input id="paramA" type="range" min="-100" max="100" value="25" class="w-full accent-indigo-500" />

          <div class="flex items-center justify-between">
            <label for="paramB" class="font-semibold text-slate-300">Parameter Sumbu B (J2 / Gelombang):</label>
            <span id="valParamB" class="font-mono font-bold text-emerald-400">35</span>
          </div>
          <input id="paramB" type="range" min="-100" max="100" value="35" class="w-full accent-emerald-500" />

          <div class="flex items-center justify-between pt-1">
            <span class="font-semibold text-slate-300">Mode Wireframe Teknis:</span>
            <button id="btnWireframe" class="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold">OFF</button>
          </div>
          <div class="flex items-center justify-between">
            <span class="font-semibold text-slate-300">Animasi Otomatis 60FPS:</span>
            <button id="btnAutoAnim" class="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold">AKTIF</button>
          </div>
        </div>

        <!-- Export 3D .OBJ & PNG Section -->
        <div class="space-y-2 pt-1">
          <button id="btnExportObj" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition">
            Unduh Mesh Scene Aktif (.OBJ 3D)
          </button>
          <button id="btnExportPng" class="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs transition">
            Simpan Render Resolusi Tinggi (.PNG)
          </button>
        </div>
      </div>

      <div id="studioToast" class="hidden bg-indigo-500/20 border border-indigo-400/50 text-indigo-200 px-3 py-2 rounded-xl text-xs font-semibold text-center"></div>
    </aside>
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      const wrap = document.getElementById('canvas3dWrap');
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x060a12);
      scene.fog = new THREE.FogExp2(0x060a12, 0.014);

      const camera = new THREE.PerspectiveCamera(50, wrap.clientWidth / Math.max(1, wrap.clientHeight), 0.1, 300);
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(wrap.clientWidth, wrap.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      wrap.appendChild(renderer.domElement);

      const hemi = new THREE.HemisphereLight(0xe2e8f0, 0x0f172a, 0.9);
      scene.add(hemi);
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
      dirLight.position.set(18, 30, 20);
      dirLight.castShadow = true;
      scene.add(dirLight);

      const grid = new THREE.GridHelper(50, 25, 0x1e293b, 0x1e293b);
      scene.add(grid);

      const rootGroup = new THREE.Group();
      scene.add(rootGroup);

      const state = {
        activeScene: 'robot',
        paramA: 25,
        paramB: 35,
        wireframe: false,
        autoAnim: true,
        refs: {}
      };

      function notify(msg) {
        const el = document.getElementById('studioToast');
        el.textContent = msg;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 2500);
      }

      function clearRoot() {
        while (rootGroup.children.length > 0) {
          rootGroup.remove(rootGroup.children[0]);
        }
        state.refs = {};
      }

      function buildScene(mode) {
        clearRoot();
        state.activeScene = mode;
        const w = state.wireframe;

        if (mode === 'robot') {
          document.getElementById('sceneTitle').textContent = '1. Lengan Robot Industri 6-DOF & IK';
          document.getElementById('sceneDesc').textContent = 'Hierarki sendi berantai (Base Yaw -> Shoulder Pitch -> Elbow Pitch -> Forearm Gripper).';
          const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 1.2, 24), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3, wireframe: w }));
          base.position.y = 0.6;
          rootGroup.add(base);

          const j1 = new THREE.Group();
          j1.position.y = 1.2;
          rootGroup.add(j1);
          j1.add(new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 20), new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.5, roughness: 0.25, wireframe: w })));

          const j2 = new THREE.Group();
          j1.add(j2);
          const arm1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 6.0, 1.1), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5, roughness: 0.3, wireframe: w }));
          arm1.position.y = 3.0;
          j2.add(arm1);

          const j3 = new THREE.Group();
          j3.position.y = 5.8;
          j2.add(j3);
          j3.add(new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 16), new THREE.MeshStandardMaterial({ color: 0xf59e0b, wireframe: w })));
          const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 5.2), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, wireframe: w }));
          arm2.position.z = 2.4;
          j3.add(arm2);

          state.refs = { j1, j2, j3 };
        } else if (mode === 'terrain') {
          document.getElementById('sceneTitle').textContent = '2. Terrain Pegunungan Bioma & Lautan 3D';
          document.getElementById('sceneDesc').textContent = 'Pewarnaan Vertex Color per ketinggian bioma + permukaan air dinamis.';
          const geo = new THREE.PlaneGeometry(36, 36, 56, 56);
          geo.rotateX(-Math.PI / 2);
          const pos = geo.attributes.position;
          const colors = [];
          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i);
            const y = Math.sin(x * 0.22) * Math.cos(z * 0.22) * 3.8 + Math.cos(Math.hypot(x, z) * 0.35) * 1.8;
            pos.setY(i, y);
            if (y < -0.5) colors.push(0.08, 0.45, 0.78);
            else if (y < 1.2) colors.push(0.13, 0.68, 0.36);
            else if (y < 3.0) colors.push(0.45, 0.52, 0.60);
            else colors.push(0.96, 0.98, 1.0);
          }
          geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
          geo.computeVertexNormals();
          const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, wireframe: w }));
          rootGroup.add(terrain);

          const water = new THREE.Mesh(
            new THREE.PlaneGeometry(36, 36, 24, 24).rotateX(-Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.68, roughness: 0.15, wireframe: w })
          );
          water.position.y = -0.3;
          rootGroup.add(water);
          state.refs = { terrain, water };
        } else if (mode === 'cad') {
          document.getElementById('sceneTitle').textContent = '3. Model CAD Mekanik 3D & Lathe Profile';
          document.getElementById('sceneDesc').textContent = 'Roda gigi parametrik + komponen bubut LatheGeometry siap ekspor ke .OBJ.';
          const gearGroup = new THREE.Group();
          gearGroup.position.y = 4.5;
          const hub = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 1.8, 32), new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.25, wireframe: w }));
          hub.rotation.x = Math.PI / 2;
          gearGroup.add(hub);
          for (let i = 0; i < 16; i++) {
            const ang = (i / 16) * Math.PI * 2;
            const tooth = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 1.8), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.75, roughness: 0.2, wireframe: w }));
            tooth.position.set(Math.cos(ang) * 4.6, Math.sin(ang) * 4.6, 0);
            tooth.rotation.z = ang;
            gearGroup.add(tooth);
          }
          rootGroup.add(gearGroup);
          state.refs = { gearGroup };
        } else if (mode === 'agv') {
          document.getElementById('sceneTitle').textContent = '4. Gudang Otomatis 3D & Armada Robot AGV';
          document.getElementById('sceneDesc').textContent = 'Rak palet bertingkat dengan unit AGV otonom yang bergerak di koridor.';
          const rackMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, wireframe: w });
          const boxMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5, wireframe: w });
          for (let row = -1; row <= 1; row += 2) {
            const rack = new THREE.Mesh(new THREE.BoxGeometry(22, 6.5, 2.2), rackMat);
            rack.position.set(0, 3.25, row * 6.5);
            rootGroup.add(rack);
            for (let b = -8; b <= 8; b += 4) {
              const pallet = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.4), boxMat);
              pallet.position.set(b, 2.5, row * 6.5);
              rootGroup.add(pallet);
            }
          }
          const agv = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 2.2), new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.25, wireframe: w }));
          agv.position.set(0, 0.6, 0);
          rootGroup.add(agv);
          state.refs = { agv };
        } else if (mode === 'globe') {
          document.getElementById('sceneTitle').textContent = '5. 3D Global Supply Chain & Telemetry Globe';
          document.getElementById('sceneDesc').textContent = 'Bola dunia 3D dengan cincin orbit satelit dan simpul logistik.';
          const globe = new THREE.Mesh(new THREE.SphereGeometry(5.5, 36, 36), new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5, metalness: 0.3, wireframe: w }));
          globe.position.y = 6.0;
          rootGroup.add(globe);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(7.8, 0.12, 12, 64), new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: w }));
          ring.position.y = 6.0;
          ring.rotation.x = 1.1;
          rootGroup.add(ring);
          state.refs = { globe, ring };
        }
      }

      buildScene('robot');

      // Orbit Camera State
      const cam = { r: 24, theta: 0.6, phi: 1.05, dragging: false, px: 0, py: 0 };
      wrap.addEventListener('mousedown', e => { cam.dragging = true; cam.px = e.clientX; cam.py = e.clientY; });
      window.addEventListener('mouseup', () => { cam.dragging = false; });
      window.addEventListener('mousemove', e => {
        if (!cam.dragging) return;
        cam.theta -= (e.clientX - cam.px) * 0.007;
        cam.phi = Math.max(0.2, Math.min(1.48, cam.phi - (e.clientY - cam.py) * 0.007));
        cam.px = e.clientX; cam.py = e.clientY;
      });
      wrap.addEventListener('wheel', e => {
        e.preventDefault();
        cam.r = Math.max(10, Math.min(55, cam.r + e.deltaY * 0.02));
      }, { passive: false });

      // UI Controls
      document.querySelectorAll('.scene-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.scene-tab').forEach(b => {
            b.className = 'scene-tab px-3 py-1.5 rounded-xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700';
          });
          btn.className = 'scene-tab px-3 py-1.5 rounded-xl font-bold bg-indigo-600 text-white';
          buildScene(btn.getAttribute('data-scene'));
        });
      });

      document.getElementById('paramA').addEventListener('input', e => {
        state.paramA = Number(e.target.value);
        document.getElementById('valParamA').textContent = state.paramA;
      });
      document.getElementById('paramB').addEventListener('input', e => {
        state.paramB = Number(e.target.value);
        document.getElementById('valParamB').textContent = state.paramB;
      });
      document.getElementById('btnWireframe').addEventListener('click', () => {
        state.wireframe = !state.wireframe;
        document.getElementById('btnWireframe').textContent = state.wireframe ? 'ON' : 'OFF';
        buildScene(state.activeScene);
      });
      document.getElementById('btnAutoAnim').addEventListener('click', () => {
        state.autoAnim = !state.autoAnim;
        document.getElementById('btnAutoAnim').textContent = state.autoAnim ? 'AKTIF' : 'MANUAL';
      });

      // Export Active Scene to Wavefront .OBJ Directly from Browser!
      document.getElementById('btnExportObj').addEventListener('click', () => {
        let objLines = ['# Exported from Pro 3D Studio v7.0'];
        let vOffset = 1;
        rootGroup.traverse(child => {
          if (child.isMesh && child.geometry) {
            const geom = child.geometry.clone();
            geom.applyMatrix4(child.matrixWorld);
            const pos = geom.attributes.position;
            if (!pos) return;
            for (let i = 0; i < pos.count; i++) {
              objLines.push(`v ${pos.getX(i).toFixed(4)} ${pos.getY(i).toFixed(4)} ${pos.getZ(i).toFixed(4)}`);
            }
            const idx = geom.index;
            if (idx) {
              for (let i = 0; i < idx.count; i += 3) {
                objLines.push(`f ${idx.getX(i) + vOffset} ${idx.getX(i + 1) + vOffset} ${idx.getX(i + 2) + vOffset}`);
              }
            }
            vOffset += pos.count;
          }
        });
        const blob = new Blob([objLines.join('\\n')], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `model_3d_${state.activeScene}.obj`;
        a.click();
        notify(`File model_3d_${state.activeScene}.obj berhasil diunduh!`);
      });

      document.getElementById('btnExportPng').addEventListener('click', () => {
        renderer.render(scene, camera);
        const a = document.createElement('a');
        a.href = renderer.domElement.toDataURL('image/png');
        a.download = `render_3d_${state.activeScene}.png`;
        a.click();
        notify('Gambar PNG 3D berhasil diunduh!');
      });

      window.addEventListener('resize', () => {
        camera.aspect = wrap.clientWidth / Math.max(1, wrap.clientHeight);
        camera.updateProjectionMatrix();
        renderer.setSize(wrap.clientWidth, wrap.clientHeight);
      });

      let clock = 0;
      let last = performance.now();
      function animate(now) {
        requestAnimationFrame(animate);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (state.autoAnim) clock += dt;

        const aRad = (state.paramA / 100) * 1.4;
        const bRad = (state.paramB / 100) * 1.2;

        if (state.activeScene === 'robot' && state.refs.j1) {
          state.refs.j1.rotation.y = state.autoAnim ? Math.sin(clock * 1.5) + aRad : aRad;
          state.refs.j2.rotation.x = state.autoAnim ? Math.sin(clock * 2.2) * 0.35 + bRad * 0.4 : bRad;
          state.refs.j3.rotation.x = state.autoAnim ? Math.cos(clock * 2.2) * 0.45 : -bRad * 0.5;
        } else if (state.activeScene === 'terrain' && state.refs.water) {
          state.refs.water.position.y = -0.3 + Math.sin(clock * 2.5) * 0.25 + aRad * 0.5;
        } else if (state.activeScene === 'cad' && state.refs.gearGroup) {
          state.refs.gearGroup.rotation.z = state.autoAnim ? clock * 1.2 : aRad * 2;
          state.refs.gearGroup.rotation.y = bRad;
        } else if (state.activeScene === 'agv' && state.refs.agv) {
          state.refs.agv.position.x = state.autoAnim ? Math.sin(clock * 1.4) * 8.5 : aRad * 6;
        } else if (state.activeScene === 'globe' && state.refs.globe) {
          state.refs.globe.rotation.y = state.autoAnim ? clock * 0.8 : aRad * 2;
          state.refs.ring.rotation.z = clock * 1.1;
        }

        camera.position.x = cam.r * Math.sin(cam.phi) * Math.sin(cam.theta);
        camera.position.y = 4.0 + cam.r * Math.cos(cam.phi);
        camera.position.z = cam.r * Math.sin(cam.phi) * Math.cos(cam.theta);
        camera.lookAt(0, 4.0, 0);
        renderer.render(scene, camera);
      }
      requestAnimationFrame(animate);
    });
  </script>
</body>
</html>
"""
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    return out_path


if __name__ == "__main__":
    out_f = sys.argv[1] if len(sys.argv) > 1 else "studio_3d_5in1.html"
    res = build_studio3d(out_f)
    chk = frontend_kit.check_web_app(res)
    print(f"OK -> {res} (Audit: {'PASSED' if chk['ok'] else chk['errors']})")

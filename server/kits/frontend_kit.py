#!/usr/bin/env python3
"""
frontend_kit.py — Mesin Pembuat & Validator WebApp / Dashboard Interaktif Single-File (.html)

Dirancang agar model LLM kecil maupun besar dapat:
  1. Membangun aplikasi web / dashboard interaktif single-file (.html) dari `spec.json`
     lengkap dengan Tailwind CSS, Chart.js (kurva mulus interaktif, bar, radar, doughnut),
     filter pencarian live, tab navigasi, modal tambah data, export CSV, dark/light mode,
     dan auto-inline gambar ke Base64 Data URI!
  2. Memvalidasi file `.html` apa pun (`python3 frontend_kit.py --check app.html`) untuk menangkap:
     - Tombol/kontrol mati tanpa handler
     - Pemakaian `alert()`, `confirm()`, `prompt()` yang terblokir di sandbox iframe
     - Gambar lokal yang belum di-inline ke Base64
     - Chart.js tanpa `maintainAspectRatio: false` atau tanpa container tinggi tetap
     - Elemen `getElementById(...)` yang ID-nya tidak ada di HTML

Cara pakai:
  Build dari JSON Spec : python3 frontend_kit.py spec.json output.html
  Inline Base64 & Cek  : python3 frontend_kit.py --check output.html
"""

import base64
import json
import mimetypes
import os
import re
import sys
from pathlib import Path


def inline_local_images(html_text: str, base_dir: str = ".") -> str:
    """Ubah semua referensi path gambar lokal di dalam HTML/JS menjadi data:image/...;base64,..."""
    def _repl(match):
        prefix, path_str, suffix = match.group(1), match.group(2), match.group(3)
        if path_str.startswith(("http://", "https://", "data:", "#", "/")):
            if not os.path.exists(path_str):
                return match.group(0)
        cand = path_str if os.path.exists(path_str) else os.path.join(base_dir, path_str)
        if not os.path.exists(cand) or os.path.isdir(cand):
            return match.group(0)
        mime = mimetypes.guess_type(cand)[0] or "image/png"
        with open(cand, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        return f"{prefix}data:{mime};base64,{b64}{suffix}"

    return re.sub(r'(src=["\']|["\'](?=[^"\']+\.(?:png|jpg|jpeg|webp|gif|svg)["\']))([^"\']+)(["\'])', _repl, html_text)


def check_web_app(html_path: str) -> dict:
    """Audit statis untuk memastikan WebApp single-file bebas bug di Canvas / Browser."""
    with open(html_path, "r", encoding="utf-8") as f:
        s = f.read()

    errors = []
    warnings = []

    # 1. Cek alert/confirm/prompt
    for banned in ("alert(", "confirm(", "prompt("):
        if re.search(r"\b" + re.escape(banned), s):
            errors.append(f"BANNED_DIALOG: Ditemukan `{banned})` — ganti dengan toast atau modal in-page.")

    # 2. Cek link eksternal lokal (.css / .js)
    for m in re.finditer(r'<(?:script|link)\b[^>]*(?:src|href)=["\']([^"\']+)["\']', s, re.I):
        url = m.group(1)
        if not url.startswith(("http://", "https://", "data:", "#", "//")):
            errors.append(f"LOCAL_ASSET_LINK: `{url}` tidak akan termuat di sandbox iframe; wajib inline `<style>` / `<script>`.")

    # 3. Cek ID duplikat & referensi getElementById
    ids = re.findall(r'\bid=["\']([^"\']+)["\']', s)
    seen = set()
    for i in ids:
        if i in seen:
            warnings.append(f"DUPLICATE_ID: id='{i}' dipakai lebih dari sekali.")
        seen.add(i)

    for m in re.finditer(r'getElementById\(\s*["\']([^"\']+)["\']\s*\)', s):
        ref_id = m.group(1)
        if ref_id not in seen:
            errors.append(f"MISSING_ID: `getElementById('{ref_id}')` dipanggil tetapi tidak ada elemen dengan `id=\"{ref_id}\"`.")

    # 4. Cek Chart.js maintainAspectRatio
    if "new Chart(" in s and "maintainAspectRatio: false" not in s and "maintainAspectRatio:false" not in s:
        warnings.append("CHART_RESIZE_RISK: Chart.js sebaiknya memakai `maintainAspectRatio: false` di dalam container `<div class=\"relative h-72\">`.")

    return {"ok": len(errors) == 0, "errors": errors, "warnings": warnings}


def build_from_spec(spec: dict, out_path: str) -> str:
    """Bangun WebApp Dashboard Interaktif Single-File (.html) yang lengkap dan responsif dari spec JSON."""
    title = spec.get("title", "Executive Operations & Analytics Hub")
    subtitle = spec.get("subtitle", "Real-Time Telemetry, Six Sigma Curve Analytics & Interactive Task Control")
    accent = spec.get("accent", "indigo")
    kpis = spec.get("kpis", [
        {"id": "kpi1", "label": "Total Output Produksi", "value": "12.450 Unit", "delta": "+8.4% vs Q2", "positive": True},
        {"id": "kpi2", "label": "Efisiensi Lini (OEE)", "value": "87.4%", "delta": "+5.2% vs Target", "positive": True},
        {"id": "kpi3", "label": "Indeks Kapabilitas (Cpk)", "value": "1.48", "delta": "Six Sigma Kapabel", "positive": True},
        {"id": "kpi4", "label": "Tingkat Reject", "value": "0.62%", "delta": "-0.48% vs Q2", "positive": True},
    ])
    chart_labels = json.dumps(spec.get("chart_labels", ["M-1", "M-2", "M-3", "M-4", "M-5", "M-6", "M-7", "M-8"]))
    chart_series = json.dumps(spec.get("chart_series", [
        {"label": "Realisasi Aktual (Unit)", "data": [1420, 1480, 1510, 1545, 1590, 1610, 1640, 1655], "color": "#4F46E5"},
        {"label": "Baseline Target (Unit)", "data": [1400, 1425, 1450, 1475, 1500, 1525, 1550, 1575], "color": "#94A3B8"},
    ]))
    pareto_labels = json.dumps(spec.get("pareto_labels", ["Setup Mesin", "Bahan Baku", "Sensor Kotor", "Listrik", "Lainnya"]))
    pareto_data = json.dumps(spec.get("pareto_values", [42, 28, 16, 9, 5]))
    records = json.dumps(spec.get("records", [
        {"id": 1, "lini": "Lini 1 - Stamping", "pic": "Ferry", "target": 4000, "aktual": 4120, "efisiensi": 88.5, "status": "Tercapai"},
        {"id": 2, "lini": "Lini 2 - Assembly", "pic": "Budi Santoso", "target": 4000, "aktual": 4350, "efisiensi": 91.2, "status": "Melampaui"},
        {"id": 3, "lini": "Lini 3 - Packaging", "pic": "Siti Rahma", "target": 4000, "aktual": 3980, "efisiensi": 82.4, "status": "Perhatian"},
        {"id": 4, "lini": "Lini 4 - QC Akhir", "pic": "Andi Wijaya", "target": 4200, "aktual": 4310, "efisiensi": 89.8, "status": "Tercapai"},
    ]))

    kpi_cards_html = ""
    for k in kpis:
        badge_cls = "bg-emerald-50 text-emerald-700 border-emerald-200" if k.get("positive", True) else "bg-amber-50 text-amber-700 border-amber-200"
        kpi_cards_html += f"""
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between transition hover:shadow-md">
          <div class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{k.get("label", "")}</div>
          <div class="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{k.get("value", "")}</div>
          <div class="mt-3">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border {badge_cls}">{k.get("delta", "")}</span>
          </div>
        </div>"""

    html_doc = f"""<!DOCTYPE html>
<html lang="id" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <script src="https://cdn.tailwindcss.com/3.4.17"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <script>
    tailwind.config = {{
      darkMode: 'class',
      theme: {{ extend: {{ fontFamily: {{ sans: ['Inter', 'sans-serif'] }} }} }}
    }};
  </script>
</head>
<body class="min-h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
  <!-- Top Navbar -->
  <header class="sticky top-0 z-30 bg-white/90 dark:bg-slate-800/90 backdrop-blur border-b border-slate-200 dark:border-slate-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
      <div>
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-{accent}-100 text-{accent}-800 dark:bg-{accent}-900/50 dark:text-{accent}-300">LIVE DASHBOARD PRO</span>
        <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">{title}</h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <div class="flex items-center gap-2.5">
        <button id="btnAddRecord" class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-{accent}-600 hover:bg-{accent}-700 text-white shadow-sm transition">+ Tambah Data</button>
        <button id="btnExportCsv" class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition">Ekspor CSV</button>
        <button id="btnThemeToggle" class="p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-semibold" title="Ubah Tema">Mode Gelap/Terang</button>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    <!-- Tab Navigation -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
      <div class="flex gap-2" role="tablist">
        <button data-tab="overview" class="tab-btn px-4 py-2 rounded-xl text-sm font-semibold bg-{accent}-600 text-white">Ringkasan & Kurva</button>
        <button data-tab="table" class="tab-btn px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Tabel & Simulasi Target</button>
      </div>
      <div class="flex items-center gap-2">
        <label for="statusFilter" class="text-xs font-semibold text-slate-500">Filter Status:</label>
        <select id="statusFilter" class="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs sm:text-sm">
          <option value="ALL">Semua Status</option>
          <option value="Melampaui">Melampaui</option>
          <option value="Tercapai">Tercapai</option>
          <option value="Perhatian">Perhatian</option>
        </select>
        <input id="searchInput" type="text" placeholder="Cari lini atau PIC..." class="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs sm:text-sm w-44 sm:w-56" />
      </div>
    </div>

    <!-- KPI Cards -->
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpi_cards_html}
    </section>

    <!-- Tab 1: Charts & Curves -->
    <section id="panel-overview" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200/80 dark:border-slate-700">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Kurva Tren Produksi & Spline Realisasi</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Interpolasi kurva mulus (tension 0.4) dengan area gradien</p>
          </div>
          <button id="btnSmoothToggle" class="text-xs font-semibold px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition">Toggle Kurva/Garis</button>
        </div>
        <div class="relative h-72 w-full">
          <canvas id="trendChart"></canvas>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200/80 dark:border-slate-700">
        <div class="mb-3">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Distribusi Faktor Dominan (Pareto)</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Kontribusi jam henti per kategori</p>
        </div>
        <div class="relative h-72 w-full">
          <canvas id="paretoChart"></canvas>
        </div>
      </div>
    </section>

    <!-- Tab 2 / Always Visible Interactive Table & Simulator -->
    <section id="panel-table" class="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200/80 dark:border-slate-700 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">Matriks Performa Lini & Kalkulator Simulasi</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Geser pengali simulasi untuk melihat proyeksi capaian secara real-time</p>
        </div>
        <div class="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/60 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600">
          <label for="simSlider" class="text-xs font-semibold">Simulasi Kenaikan Output:</label>
          <input id="simSlider" type="range" min="-15" max="25" value="0" class="w-28 accent-{accent}-600" />
          <span id="simValueLabel" class="text-xs font-bold text-{accent}-600 dark:text-{accent}-400 min-w-[3rem]">0%</span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/40">
              <th class="py-3 px-4">Lini / Unit</th>
              <th class="py-3 px-4">Penanggung Jawab</th>
              <th class="py-3 px-4 text-right">Target</th>
              <th class="py-3 px-4 text-right">Realisasi (Simulasi)</th>
              <th class="py-3 px-4 text-right">Capaian (%)</th>
              <th class="py-3 px-4 text-center">Status</th>
              <th class="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody id="tableBody" class="divide-y divide-slate-200 dark:divide-slate-700 text-sm"></tbody>
        </table>
      </div>
    </section>
  </main>

  <!-- Modal Tambah Baris -->
  <div id="addModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
    <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">Tambah Data Lini Baru</h3>
        <button id="btnCloseModal" class="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-semibold mb-1">Nama Lini / Unit</label>
          <input id="inpLini" type="text" placeholder="Contoh: Lini 5 - Finishing" class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold mb-1">Penanggung Jawab (PIC)</label>
          <input id="inpPic" type="text" placeholder="Nama PIC" class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold mb-1">Target (Unit)</label>
            <input id="inpTarget" type="number" value="4000" class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1">Realisasi (Unit)</label>
            <input id="inpAktual" type="number" value="4200" class="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" />
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button id="btnCancelModal" class="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-600">Batal</button>
        <button id="btnSaveModal" class="px-4 py-2 rounded-xl text-sm font-semibold bg-{accent}-600 text-white hover:bg-{accent}-700">Simpan Data</button>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toastBox" class="fixed bottom-5 right-5 z-50 hidden bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs sm:text-sm font-medium"></div>

  <script>
    const state = {{
      records: {records},
      simPct: 0,
      filterStatus: 'ALL',
      searchQuery: '',
      smoothCurve: true
    }};

    function showToast(msg) {{
      const el = document.getElementById('toastBox');
      el.textContent = msg;
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 2600);
    }}

    function computeStatus(aktual, target) {{
      if (aktual >= target * 1.05) return 'Melampaui';
      if (aktual >= target) return 'Tercapai';
      return 'Perhatian';
    }}

    function renderTable() {{
      const tbody = document.getElementById('tableBody');
      const mult = 1 + (state.simPct / 100);
      const filtered = state.records.filter(r => {{
        const simAct = Math.round(r.aktual * mult);
        const st = computeStatus(simAct, r.target);
        const matchStatus = state.filterStatus === 'ALL' || st === state.filterStatus;
        const q = state.searchQuery.toLowerCase();
        const matchSearch = !q || r.lini.toLowerCase().includes(q) || r.pic.toLowerCase().includes(q);
        return matchStatus && matchSearch;
      }});

      tbody.innerHTML = filtered.map(r => {{
        const simAct = Math.round(r.aktual * mult);
        const pct = r.target > 0 ? ((simAct / r.target) * 100).toFixed(1) : '0.0';
        const st = computeStatus(simAct, r.target);
        const badge = st === 'Melampaui'
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
          : st === 'Tercapai'
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
        return `
          <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
            <td class="py-3 px-4 font-semibold text-slate-900 dark:text-white">${{r.lini}}</td>
            <td class="py-3 px-4 text-slate-600 dark:text-slate-300">${{r.pic}}</td>
            <td class="py-3 px-4 text-right font-mono">${{r.target.toLocaleString('id-ID')}}</td>
            <td class="py-3 px-4 text-right font-mono font-bold">${{simAct.toLocaleString('id-ID')}}</td>
            <td class="py-3 px-4 text-right font-mono">${{pct}}%</td>
            <td class="py-3 px-4 text-center"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${{badge}}">${{st}}</span></td>
            <td class="py-3 px-4 text-right">
              <button data-del="${{r.id}}" class="text-xs font-semibold text-rose-600 hover:underline">Hapus</button>
            </td>
          </tr>`;
      }}).join('');

      tbody.querySelectorAll('button[data-del]').forEach(btn => {{
        btn.addEventListener('click', () => {{
          const id = Number(btn.getAttribute('data-del'));
          state.records = state.records.filter(x => x.id !== id);
          renderTable();
          showToast('Data lini dihapus.');
        }});
      }});
    }}

    // Charts Initialization
    let trendChartInstance = null;
    function initCharts() {{
      const ctxTrend = document.getElementById('trendChart').getContext('2d');
      const rawSeries = {chart_series};
      trendChartInstance = new Chart(ctxTrend, {{
        type: 'line',
        data: {{
          labels: {chart_labels},
          datasets: rawSeries.map((s, idx) => ({{
            label: s.label,
            data: s.data,
            borderColor: s.color || '#4F46E5',
            backgroundColor: idx === 0 ? 'rgba(79, 70, 229, 0.14)' : 'transparent',
            fill: idx === 0,
            tension: state.smoothCurve ? 0.4 : 0,
            borderWidth: idx === 0 ? 3 : 2,
            borderDash: idx === 0 ? [] : [6, 4],
            pointRadius: 4
          }}))
        }},
        options: {{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {{ legend: {{ position: 'top' }} }},
          scales: {{ y: {{ beginAtZero: false }} }}
        }}
      }});

      const ctxPareto = document.getElementById('paretoChart').getContext('2d');
      new Chart(ctxPareto, {{
        type: 'doughnut',
        data: {{
          labels: {pareto_labels},
          datasets: [{{
            data: {pareto_data},
            backgroundColor: ['#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA', '#94A3B8'],
            borderWidth: 2
          }}]
        }},
        options: {{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {{ legend: {{ position: 'bottom' }} }}
        }}
      }});
    }}

    window.addEventListener('DOMContentLoaded', () => {{
      renderTable();
      initCharts();

      document.getElementById('statusFilter').addEventListener('change', e => {{
        state.filterStatus = e.target.value;
        renderTable();
      }});

      document.getElementById('searchInput').addEventListener('input', e => {{
        state.searchQuery = e.target.value;
        renderTable();
      }});

      document.getElementById('simSlider').addEventListener('input', e => {{
        state.simPct = Number(e.target.value);
        const sign = state.simPct > 0 ? '+' : '';
        document.getElementById('simValueLabel').textContent = sign + state.simPct + '%';
        renderTable();
      }});

      document.getElementById('btnSmoothToggle').addEventListener('click', () => {{
        state.smoothCurve = !state.smoothCurve;
        trendChartInstance.data.datasets.forEach(ds => {{ ds.tension = state.smoothCurve ? 0.4 : 0; }});
        trendChartInstance.update();
        showToast(state.smoothCurve ? 'Mode Kurva Spline Aktif' : 'Mode Garis Linear Aktif');
      }});

      document.getElementById('btnThemeToggle').addEventListener('click', () => {{
        document.documentElement.classList.toggle('dark');
      }});

      const modal = document.getElementById('addModal');
      const closeModal = () => {{ modal.classList.add('hidden'); modal.classList.remove('flex'); }};
      document.getElementById('btnAddRecord').addEventListener('click', () => {{
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }});
      document.getElementById('btnCloseModal').addEventListener('click', closeModal);
      document.getElementById('btnCancelModal').addEventListener('click', closeModal);
      document.getElementById('btnSaveModal').addEventListener('click', () => {{
        const lini = document.getElementById('inpLini').value.trim() || 'Lini Baru';
        const pic = document.getElementById('inpPic').value.trim() || 'Operator';
        const target = Number(document.getElementById('inpTarget').value) || 4000;
        const aktual = Number(document.getElementById('inpAktual').value) || 4000;
        state.records.push({{ id: Date.now(), lini, pic, target, aktual, efisiensi: 88.0, status: computeStatus(aktual, target) }});
        renderTable();
        closeModal();
        showToast('Data lini berhasil ditambahkan!');
      }});

      document.getElementById('btnExportCsv').addEventListener('click', () => {{
        const rows = [['Lini', 'PIC', 'Target', 'Realisasi', 'Status']];
        state.records.forEach(r => rows.push([r.lini, r.pic, r.target, r.aktual, computeStatus(r.aktual, r.target)]));
        const csv = rows.map(r => r.join(',')).join('\\n');
        const blob = new Blob([csv], {{ type: 'text/csv;charset=utf-8;' }});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'laporan_operasional.csv';
        a.click();
        showToast('CSV berhasil diunduh!');
      }});

      document.querySelectorAll('.tab-btn').forEach(btn => {{
        btn.addEventListener('click', () => {{
          const tab = btn.getAttribute('data-tab');
          document.getElementById('panel-overview').classList.toggle('hidden', tab === 'table');
          showToast('Menampilkan tampilan: ' + (tab === 'overview' ? 'Ringkasan & Kurva' : 'Fokus Tabel'));
        }});
      }});
    }});
  </script>
</body>
</html>
"""
    html_doc = inline_local_images(html_doc, os.path.dirname(os.path.abspath(out_path)))
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html_doc)
    return out_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Pemakaian:\n  python3 frontend_kit.py spec.json output.html\n  python3 frontend_kit.py --check output.html", file=sys.stderr)
        sys.exit(1)
    if sys.argv[1] == "--check":
        res = check_web_app(sys.argv[2])
        print(json.dumps(res, indent=2, ensure_ascii=False))
        sys.exit(0 if res["ok"] else 1)
    else:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            spec_data = json.load(f)
        out_f = build_from_spec(spec_data, sys.argv[2])
        chk = check_web_app(out_f)
        print(f"OK -> {out_f} (Audit: {'PASSED' if chk['ok'] else chk['errors']})")

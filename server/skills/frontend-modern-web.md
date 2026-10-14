# 🌐 SKILL: FRONT-END MODERN WEB ARCHITECTURE & DESIGN SYSTEM
Category: Web & UI
Keywords: [html, css, javascript, web, landing page, dashboard, glassmorphism, responsive, interactive]

## 🎯 TUJUAN & STANDAR ARSITEKTUR
Membangun antarmuka web modern kelas dunia (Modern Web Apps, SaaS Dashboards, Interactive Portfolios, Executive Landing Pages) dalam satu berkas mandiri `index.html` (HTML5 + CSS3 Variables + Vanilla JS) yang langsung hidup, responsif, dan interaktif sejak awal.

---

## 🎨 PALET WARNA & TIPOGRAFI MODERN
- **Dark Mode Eksekutif (Default Pilihan Modern)**:
  * Canvas: `#090D16` / `#0F172A`
  * Surface Card: `rgba(30, 41, 59, 0.7)` dengan `backdrop-filter: blur(16px)`
  * Border: `1px solid rgba(255, 255, 255, 0.08)` atau `rgba(148, 163, 184, 0.15)`
  * Accent Utama: `#EA580C` (Vivid Tangerine) atau `#3B82F6` (Electric Blue)
  * Accent Sekunder: `#10B981` (Emerald Green) untuk metrik positif / live indicator
  * Text Primary: `#F8FAFC`, Text Muted: `#94A3B8`
- **Tipografi**:
  * Import Google Fonts: `<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`
  * Font stack: `'Plus Jakarta Sans', -apple-system, sans-serif;`

---

## ⚡ ELEMEN WAJIB DI DALAM WEB
1. **Interactive Glassmorphism Navbar**: Logo brand, menu navigasi, status badge live ("● Sistem Aktif"), dan action button.
2. **Hero Section / KPI Metric Cards**: 3-4 kartu KPI dengan angka metrik besar, badge persentase pertumbuhan (+18.4%), dan micro-sparkline.
3. **Interactive Main Component**: Tabel interaktif dengan live search bar / filter tab, atau canvas chart dinamis, atau kalkulator real-time.
4. **Toast Notification System**: Feedback interaktif saat pengguna mengklik tombol aksi.
5. **Auto Screenshot**: Selalu panggil tag `<screenshot target="index.html" />` agar tangkapan layarnya langsung tampil di chat!

---

## 📋 TEMPLATE KODE MANTAP (BATTLE-TESTED TEMPLATE)

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Executive Analytics Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090D16;
      --surface: rgba(19, 27, 46, 0.75);
      --surface-hover: rgba(30, 41, 69, 0.85);
      --border: rgba(255, 255, 255, 0.08);
      --border-accent: rgba(234, 88, 12, 0.4);
      --primary: #ea580c;
      --primary-glow: rgba(234, 88, 12, 0.25);
      --emerald: #10b981;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --radius: 16px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: radial-gradient(circle at 15% 15%, rgba(234, 88, 12, 0.08) 0%, transparent 40%),
                  radial-gradient(circle at 85% 85%, rgba(59, 130, 246, 0.08) 0%, transparent 40%),
                  var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Header Nav */
    header {
      height: 64px;
      border-bottom: 1px solid var(--border);
      background: rgba(9, 13, 22, 0.8);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 17px; }
    .brand-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 12px var(--primary); }
    .live-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(16, 185, 129, 0.12); color: var(--emerald);
      border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 999px;
      padding: 4px 10px; font-size: 11.5px; font-weight: 700;
    }

    /* Container */
    .container { max-width: 1240px; margin: 0 auto; width: 100%; padding: 28px 24px; flex: 1; }

    /* KPI Grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 20px;
      backdrop-filter: blur(16px); transition: all 0.2s ease;
    }
    .kpi-card:hover { transform: translateY(-2px); border-color: var(--border-accent); box-shadow: 0 8px 24px var(--primary-glow); }
    .kpi-title { font-size: 12.5px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-value { font-size: 28px; font-weight: 800; color: var(--text); margin: 8px 0; }
    .kpi-trend { font-size: 12px; font-weight: 700; color: var(--emerald); }

    /* Interactive Data Section */
    .section-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 22px; backdrop-filter: blur(16px);
    }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
    .search-input {
      background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border);
      color: var(--text); border-radius: 8px; padding: 8px 14px; font-size: 13px; outline: none;
      width: 240px; transition: border-color 0.2s;
    }
    .search-input:focus { border-color: var(--primary); }

    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    th { text-align: left; padding: 12px 14px; color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--border); }
    td { padding: 12px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }
    .tag { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .tag.success { background: rgba(16, 185, 129, 0.15); color: var(--emerald); }

    /* Toast */
    .toast {
      position: fixed; bottom: 24px; right: 24px;
      background: #1e293b; color: #f8fafc; border: 1px solid var(--primary);
      border-radius: 10px; padding: 12px 20px; font-size: 13px; font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4); opacity: 0; transform: translateY(10px);
      transition: all 0.25s ease; pointer-events: none;
    }
    .toast.show { opacity: 1; transform: translateY(0); }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-dot"></div>
      <span>NOVA ANALYTICS</span>
    </div>
    <div class="live-badge">● Live Update</div>
  </header>

  <main class="container">
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">Total Pendapatan</div>
        <div class="kpi-value">Rp 1.428.500.000</div>
        <div class="kpi-trend">↑ +18.4% vs bln lalu</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Pengguna Aktif</div>
        <div class="kpi-value">84.210</div>
        <div class="kpi-trend">↑ +12.1% tumbuh</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Rasio Retensi</div>
        <div class="kpi-value">94.8%</div>
        <div class="kpi-trend">↑ +2.3% stabil</div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-header">
        <h3 style="font-size: 16px; font-weight: 700;">Data Operasional Terkini</h3>
        <input type="text" id="searchInput" class="search-input" placeholder="Cari data...">
      </div>
      <table>
        <thead>
          <tr>
            <th>Entitas / Layanan</th>
            <th>Kategori</th>
            <th>Nilai Transaksi</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="tableBody">
          <tr>
            <td><strong>Cloud Platform Pro</strong></td>
            <td>Infrastruktur</td>
            <td>Rp 450.000.000</td>
            <td><span class="tag success">Selesai</span></td>
          </tr>
          <tr>
            <td><strong>AI Inference Cluster</strong></td>
            <td>Komputasi</td>
            <td>Rp 680.000.000</td>
            <td><span class="tag success">Selesai</span></td>
          </tr>
          <tr>
            <td><strong>Security Audit Enterprise</strong></td>
            <td>Cybersecurity</td>
            <td>Rp 298.500.000</td>
            <td><span class="tag success">Selesai</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>

  <div id="toast" class="toast">Aksi berhasil diproses!</div>

  <script>
    const searchInput = document.getElementById('searchInput');
    const tableBody = document.getElementById('tableBody');
    const rows = tableBody.getElementsByTagName('tr');

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      for (let row of rows) {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      }
    });

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    }
  </script>
</body>
</html>
```

---
name: master-agentic-stepping-os
description: "OTAK UTAMA (Master Agentic Stepping Operating System) untuk membuat segala jenis output profesional (Word, Excel + Macro VBA, PowerPoint 16:9, PDF, LaTeX, Grafik Kurva 300-DPI, Website Full-Stack Semua Framework, Aplikasi Android .apk, Game 2D/3D WebGL/Godot/Unity, Digital Twin 3D SCADA, Model CAD 3D .stl/.obj, Database SQL, REST API, hingga Firmware IoT ESP32). Wajib dibaca pertama kali oleh LLM kecil maupun besar."
---

# MASTER AGENTIC STEPPING OS — Protokol Eksekusi Otonom 7-Langkah untuk Membuat Segala Hal

Dokumen ini adalah **Sistem Operasi Berpikir (*Agentic Stepping OS*)** bagi model LLM (baik model kecil 3B/7B/8B maupun frontier LLM). Dengan mengikuti **7 Langkah Deterministik (`STEP 0` s/d `STEP 6`)** di bawah ini secara berurutan, AI tidak akan pernah kebingungan, tidak perlu mencari-cari file secara buta, tidak pernah menulis kode berlubang (`TODO`/`pass`), dan selalu menghasilkan karya kelas profesional yang lulus uji 100%.

---

## DIAGRAM ALUR AGENTIC STEPPING (7-STEP LOOP)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 0 [INSTANT ROUTE] : Baca KONTEKS_INDEKS_BUKU_SKILL.txt -> Pilih tepat │
│                          1-2 Buku Skill (.md) + 1 Mesin Kit + 1 Template   │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 1 [MEMORY LOCK]   : Tulis [KARTU MEMORI AGEN] (Tujuan, Nama File,     │
│                          Kamus Angka Single-Source-of-Truth, Kontrak Data) │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 2 [LAYOUT & MATH] : Kunci Tata Letak Visual & Matematika Anti-Rusak   │
│                          (Font Floor, Image Split/Bleed, Excel Anchor, 3D) │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 3 [KIT EXECUTION] : Bangun lewat Mesin Kit (spec.json -> Kit CLI)     │
│                          atau Scaffold + Fungsi Atomik (Maks 25-40 Baris)  │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 4 [AUTO VERIFY]   : Jalankan Validator & Render Visual (agentic_kit,  │
│                          validate_excel, validate_pptx, check_web_app)     │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       ▼
                        Apakah Ada Error / Cacat Visual?
                       /                                \
              [YA, ADA]                                  [TIDAK, 0 ERROR]
                 │                                              │
                 ▼                                              ▼
┌──────────────────────────────────────┐      ┌──────────────────────────────┐
│ STEP 5 [SURGICAL SELF-HEAL (Maks 3x)]│      │ STEP 6 [DELIVER & SUMMARIZE] │
│ Baca Baris Terakhir Traceback +      │─────►│ Serahkan File Hasil Uji &    │
│ repair_hints -> Patch Fungsi/JSON    │      │ Ringkas Poin Kunci ke User   │
└──────────────────────────────────────┘      └──────────────────────────────┘
```

---

## STEP 0 — INSTANT BOOK & KIT ROUTING (Tanpa Searching Lama!)

Jangan pernah membuang waktu menjalankan pencarian file (`find` / `grep`) ke seluruh folder. Gunakan tabel komando di bawah ini (atau baca `KONTEKS_INDEKS_BUKU_SKILL.txt`) untuk langsung membuka **Buku Skill**, **Mesin Kit**, dan **Template JSON** yang tepat:

| Kategori Tugas yang Diminta User | Buku Skill yang Langsung Dibuka (`skills/`) | Mesin Kit Eksekutor (`kits/`) | Template Acuan (`templates/` / `samples/`) |
|---|---|---|---|
| **1. Dokumen Word (`.docx`)** (Laporan, Proposal, SOP, Surat, Kontrak MoU, Invoice, CV ATS) | `17-skill-word-docx-lengkap.md`<br>`18-skill-word-docx-model-kecil.md`<br>+ (`29`/`30`/`31`/`32` sesuai topik) | `python3 kits/word_kit.py spec.json out.docx`<br>*(atau `node kits/docx-kit.js`)* | `templates/word_laporan_eksekutif_spec.json`<br>`templates/word_proposal_agribisnis_peternakan_spec.json`<br>`templates/word_sop_iso_k3_pabrik_spec.json`<br>`templates/word_invoice_komersial_spec.json`<br>`templates/word_cv_ats_profesional_spec.json` |
| **2. Spreadsheet Excel (`.xlsx` & Macro VBA `.bas`)** (Dashboard, OEE/Six Sigma, Peternakan, HPP Kuliner, Payroll HRD, Finansial) | `20-skill-excel-xlsx-lengkap.md`<br>`21-skill-excel-xlsx-model-kecil.md`<br>`22-skill-excel-vba-macro-mastery.md`<br>`23-skill-excel-financial-industrial-modeling.md` | `python3 kits/excel_kit.py spec.json out.xlsx` | `templates/excel_dashboard_kurva_macro_spec.json`<br>`templates/excel_pembukuan_peternakan_fcr_hdp_spec.json`<br>`templates/excel_umkm_fnb_hpp_menu_spec.json`<br>`templates/excel_hrd_payroll_kpi_spec.json` |
| **3. Presentasi PowerPoint 16:9 (`.pptx`)** (Laporan Direksi, Pitch Deck Startup/Investor) | `24-skill-ppt-pptx-lengkap.md`<br>`25-skill-ppt-pptx-model-kecil.md`<br>`46-skill-presentasi-storytelling-ted-pitch.md` | `python3 kits/pptx_kit.py spec.json out.pptx` | `templates/pptx_presentasi_eksekutif_spec.json`<br>`templates/pptx_pitch_deck_startup_ai_spec.json` |
| **4. Dokumen PDF Siap Cetak (`.pdf`) & LaTeX Akademik (`.tex`)** | `27-skill-pdf-report-generation-pro.md`<br>`28-skill-latex-academic-math-pro.md` | `python3 kits/pdf_kit.py spec.json out.pdf` | `templates/word_invoice_komersial_spec.json`<br>`templates/word_laporan_eksekutif_spec.json` |
| **5. Grafik Kurva Ilmiah/Bisnis 300-DPI & Payload Gambar (`.png`)** | `26-skill-data-viz-kurva-gila.md`<br>`130-skill-3d-scientific-data-surface-plot-matplotlib.md` | `python3 kits/viz_kit.py spec.json out.png` | 9 Jenis Kurva: `spline_band`, `six_sigma_bell`, `pareto_80_20`, `s_curve`, `waterfall`, `heatmap`, `fan_forecast`, `combo_dual`, `radar_kpi` |
| **6. Website, Dashboard Interaktif, Kalkulator & Semua Framework Web** (HTML/Tailwind/Chart.js, React, Next.js, Vue/Nuxt, Svelte 5, Angular) | `07-skill-frontend-web-lengkap.md`<br>`08-skill-frontend-web-model-kecil.md`<br>`09-skill-react-tailwind-shadcn-pro.md`<br>`86` s/d `93` (Framework spesifik) | `python3 kits/frontend_kit.py spec.json out.html`<br>`python3 kits/frontend_kit.py --check out.html` | `templates/frontend_dashboard_interaktif_spec.json`<br>`templates/frontend_simulator_bisnis_hpp_roi_spec.json` |
| **7. Aplikasi Mobile Android (`.apk`), Kotlin Compose, Flutter, React Native & Capacitor** | `66-skill-android-kotlin-jetpack-compose-pro.md`<br>`67-skill-android-apk-gradle-build-signing-release.md`<br>`70` (Flutter), `71` (React Native), `72` (Capacitor HTML-ke-APK) | `python3 kits/mobile_apk_kit.py out_project_dir` | `templates/mobile_android_apk_spec.json`<br>`samples/android_apk_starter_project/` |
| **8. Game 3D WebGL, Digital Twin 3D Pabrik/Robot 6-DOF, Godot 4 & Unity 3D** | `76`, `77`, `78`, `79`, `80` (Three.js & Shader)<br>`101` s/d `108` (FPS, Racing, Voxel, RPG, Drone, TD)<br>`109` s/d `124`, `134`, `135` (IK, Terrain, Lautan, Digital Twin) | `python3 kits/game3d_kit.py spec.json game3d.html`<br>`python3 kits/world3d_kit.py spec.json twin3d.html` | `templates/game3d_cyber_factory_spec.json`<br>`templates/world3d_digital_twin_spec.json` |
| **9. Model CAD 3D Mekanik Siap Cetak 3D Printer (`.stl` & `.obj`), Blender `bpy` & OpenSCAD** | `125-skill-3d-cad-parametric-stl-obj-generator.md`<br>`126-skill-blender-python-bpy-automation-pro.md`<br>`127-skill-openscad-parametric-mechanical-parts.md` | `python3 kits/cad3d_kit.py out_prefix` | `samples/Roda_Gigi_Transmisi_Lini_3D.stl`<br>`samples/Roda_Gigi_Transmisi_Lini_3D.obj` |
| **10. Coding Otonom, Backend API, Database SQL, Sistem Keputusan TOPSIS & IoT ESP32/Modbus** | `01`, `02`, `03`, `04`, `05` (Agentic & TDD)<br>`10` (API), `11` (SQL), `12` (AppSec), `13` & `52` (ESP32/Modbus), `54` (TOPSIS), `94`–`99` (Backend/Desktop) | `python3 kits/agentic_kit.py --scaffold <tipe> out.py`<br>`python3 kits/agentic_kit.py --audit target.py` | `samples/agentic_sqlite_repo.py`<br>`samples/agentic_etl_six_sigma.py`<br>`samples/agentic_mcdm_decision_topsis.py`<br>`samples/agentic_modbus_crc16_iot.py` |

---

## STEP 1 — SINGLE SOURCE OF TRUTH & KARTU MEMORI AGEN

Sebelum menulis file kode atau `spec.json`, kunci **4 hal ini** di kepala (atau tulis sebagai komentar 8 baris `[KARTU MEMORI AGEN]` di puncak file kode):
1. **Tujuan 1 Kalimat & Target File Eksak:** Apa file akhir yang diminta user? (Jangan pernah mengganti format yang diminta: jika diminta `.docx` buat `.docx`, jika diminta `.xlsx` buat `.xlsx`, jika diminta `.html` 3D buat `.html`).
2. **Kamus Angka Tunggal (*Single Source of Truth*):** Jika membuat beberapa bagian/dokumen, pastikan semua angka (Target, Realisasi, Persentase Capaian, Harga, Cpk, tanggal, nama PIC) **100% konsisten** di setiap tabel, kartu KPI, kurva, dan paragraf.
3. **Kontrak Data (`@dataclass` / Interface / JSON Schema):** Kunci nama atribut di awal agar tidak salah ketik di pertengahan file.
4. **Anti-Karangan Data:** Angka yang belum diketahui dari user dan tidak bisa dihitung ditulis jujur sebagai `[ISI: ...]` (di dokumen) atau dibiarkan sebagai sel input kosong berformat (di template Excel).

---

## STEP 2 — ATURAN DESAIN & MATEMATIKA TATA LETAK (ANTI-RUSAK)

### A. Untuk Word (`.docx`) & PDF (`.pdf`)
- **Lantai Ukuran Font Mutlak:** Teks isi `11pt`, kotak callout `10.5pt`, sel tabel minimal `10pt` (**dilarang `< 10pt`**), caption/footer `9.5pt`.
- **Tata Letak Payload Gambar (`placement`):**
  - Foto fasilitas lebar -> `"full-banner"` (`aspect_ratio: "16:9"`).
  - Grafik kurva 300-DPI -> `"center"` (`width_cm: 14.0`).
  - Diagram alur / foto mesin + penjelasan -> `"split-left"` atau `"split-right"` (otomatis merender diagram 2x2 tajam di samping poin penjelasan!).
  - 2–3 foto berdampingan -> `"gallery"` (`cols: 2` atau `3`).
- **Anti-Orphan:** Jangan menaruh `pagebreak` manual di antara bab biasa; biarkan `keep_with_next` dan `w:cantSplit` di `word_kit.py` bekerja otomatis.

### B. Untuk Excel (`.xlsx` & Macro `.bas`)
- **100% Rumus Hidup:** Gunakan placeholder `{row}`, `{first}`, dan `{last}` di `excel_kit.py` (misal `"=C{row}-B{row}"`, `"=C{row}/B{row}"`, dan `"SUM"` / `"AVERAGE"` di baris `totals`).
- **Matematika Anti-Tabrakan Grafik (*Row Clearance*):**
  - Tabel kompak ($\le 5$ kolom) -> taruh grafik `"placement": "side-by-side"` (di kanan tabel dengan jeda 1 kolom).
  - Tabel lebar ($\ge 6$ kolom) -> taruh grafik `"placement": "stacked"` di bawah tabel pada baris `last_table_row + 3`, atau 2 kurva berdampingan di `A{row}` dan `E{row}`.

### C. Untuk PowerPoint 16:9 (`.pptx`)
- **3 Pita Koordinat Tetap (*Layout Bands*):** Title Band (`0.5"–2.0"`), Body Band (`2.2"–6.8"`), Footer Band (`6.95"–7.3"`).
- **Batas Teks:** Judul maksimal 2 baris, maksimal 3 bullet per kolom, maksimal 6 bullet per slide.
- **Visual Bleed 300-DPI:** Gunakan tipe slide `"kpi"`, `"chart_slide"`, `"split_image"`, `"timeline"`, `"table_slide"`, serta `"cover"` dan `"outro"` berlatar gelap (*Bookend Palette*).

### D. Untuk Website, Dashboard, Mobile `.apk` & Game 3D (`.html` / `.jsx` / `.kt`)
- **Self-Contained:** Dalam mode single-file `.html`, semua CSS (Tailwind CDN), JS (Chart.js / Three.js r128), dan gambar lokal (di-inline ke Base64 Data URI) wajib menyatu dalam 1 file.
- **Zero Dead Controls & Zero `alert()`:** Semua tombol, filter, slider, modal, dan kontrol sentuh HP wajib berfungsi; gunakan Toast/Modal in-page (jangan pernah memakai `alert()`, `confirm()`, `prompt()`).
- **Khusus 3D (`Three.js`):** Batasi `setPixelRatio(Math.min(window.devicePixelRatio, 2))`, gunakan pencahayaan 3-titik (`AmbientLight` + `DirectionalLight` + `PointLight`), kalikan kecepatan gerak dengan `dt` (*delta-time*), dan sediakan kontrol ganda (Keyboard WASD + Tombol Sentuh Layar HP).

---

## STEP 3 — EKSEKUSI BERBASIS KIT & FUNGSI ATOMIK

1. **Utamakan Mesin Kit (`kits/*_kit.py`):**
   - Salin struktur JSON dari `templates/*.json` yang paling mirip dengan permintaan user.
   - Modifikasi judul, data tabel, rumus, dan spesifikasi kurva sesuai kasus user.
   - Jalankan mesin kit via CLI untuk menghasilkan file akhir secara deterministik.
2. **Jika Menulis Kode Program Kustom (`.py`, `.js`, `.sql`, `.cpp`, `.kt`, `.dart`):**
   - Pecah menjadi fungsi-fungsi pendek (**maksimal 25–40 baris per fungsi**).
   - Gunakan pustaka standar terlebih dahulu agar bebas `ModuleNotFoundError`.
   - Wajib sertakan fungsi `test_*()` di bagian bawah file yang menguji **5 Kasus Uji** (*Happy Path, Zero/Empty, Single Element, Boundary, Invalid Input*).

---

## STEP 4 & STEP 5 — VERIFIKASI DETERMINISTIK & SURGICAL SELF-HEALING LOOP

Jangan pernah menyerahkan file sebelum diverifikasi oleh mesin auditor:

```bash
# 1. Untuk kode Python / JS / JSON:
python3 kits/agentic_kit.py --audit path_file.py

# 2. Untuk WebApp / Simulator / Game 3D (.html):
python3 kits/frontend_kit.py --check app_atau_game3d.html

# 3. Untuk Workbook Excel (.xlsx):
python3 skills/excel-processing/scripts/validate_excel.py file.xlsx

# 4. Untuk Presentasi PowerPoint (.pptx):
python3 skills/powerpoint-processing/scripts/validate_pptx.py file.pptx --expect-bullets
```

**Protokol *Surgical Self-Healing* (Maksimal 3 Putaran jika ditemukan Error):**
1. Baca pesan error paling bawah dan baca `repair_hints`.
2. Identifikasi nomor baris atau blok JSON yang bermasalah.
3. **Lakukan *patch* terfokus hanya pada bagian yang salah** (jangan menulis ulang seluruh file dari nol atau menghapus fitur yang sudah benar).
4. Jalankan ulang validator sampai keluar status **`PASSED` / `"ok": true` / `Errors: 0`**.

---

## STEP 6 — PENYERAHAN PROFESIONAL KE USER

Setelah semua file terverifikasi 100% bebas error:
1. Tampilkan/kirim file hasil akhir kepada user.
2. Berikan ringkasan eksekutif yang padat, hangat, dan langsung ke inti (sebutkan apa yang sudah dibuat, angka/temuan kunci, serta cara menggunakannya).

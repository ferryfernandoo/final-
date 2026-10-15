---
name: katalog-kasus-dan-template-pemilih-cepat
description: "Master Case Selector & Indeks Pemilihan Cepat 20+ Studi Kasus Nyata. Gunakan skill ini atau jalankan kits/skill_selector.py untuk memilih kombinasi Skill, Kit Engine, dan Template JSON terbaik sesuai kasus yang diminta user."
---

# Master Case Selector — Katalog Pemilihan Cepat Lintas Kasus

Saat menerima tugas dari user, pilih kasus yang paling sesuai dari tabel ini atau jalankan:
```bash
python3 kits/skill_selector.py "kata kunci kasus user"
```

| Kasus Penggunaan (*Use Case*) | Skill Utama | Template JSON / Script Siap Pakai di `templates/` & `samples/` | Kit Eksekutor |
|---|---|---|---|
| **1. Laporan Produksi Pabrik, OEE & Six Sigma** | `17`, `20`, `23`, `26` | `templates/word_laporan_eksekutif_spec.json`<br>`templates/excel_dashboard_kurva_macro_spec.json` | `word_kit.py`, `excel_kit.py` |
| **2. Agribisnis & Peternakan Unggas (Pakan, HDP, FCR)** | `35`, `20`, `30` | `templates/word_proposal_agribisnis_peternakan_spec.json`<br>`templates/excel_pembukuan_peternakan_fcr_hdp_spec.json`<br>`samples/agentic_agribisnis_ransum_fcr.py` | `word_kit.py`, `excel_kit.py`, `agentic_kit.py` |
| **3. UMKM Kuliner / F&B (HPP Resep & Menu Engineering)** | `36`, `20`, `45` | `templates/excel_umkm_fnb_hpp_menu_spec.json`<br>`templates/frontend_simulator_bisnis_hpp_roi_spec.json` | `excel_kit.py`, `frontend_kit.py` |
| **4. HRD, Payroll, Lembur, BPJS & KPI Karyawan** | `39`, `20` | `templates/excel_hrd_payroll_kpi_spec.json` | `excel_kit.py` |
| **5. SOP Pabrik, ISO 9001, K3, FMEA & 8D** | `29`, `17`, `27` | `templates/word_sop_iso_k3_pabrik_spec.json` | `word_kit.py`, `pdf_kit.py` |
| **6. Pitch Deck Startup / Proyek Otomasi & AI** | `24`, `25`, `30`, `46` | `templates/pptx_pitch_deck_startup_ai_spec.json`<br>`templates/pptx_presentasi_eksekutif_spec.json` | `pptx_kit.py` |
| **7. Invoice Tagihan, Kontrak MoU/PKS & Surat Resmi** | `31`, `18`, `27` | `templates/word_invoice_komersial_spec.json`<br>`templates/word_surat_perjanjian_mou_spec.json` | `word_kit.py`, `pdf_kit.py` |
| **8. CV / Resume ATS-Friendly & Portofolio** | `32`, `18`, `27` | `templates/word_cv_ats_profesional_spec.json` | `word_kit.py`, `pdf_kit.py` |
| **9. Sistem Pendukung Keputusan (TOPSIS / Pemilihan Vendor)** | `54`, `01` | `samples/agentic_mcdm_decision_topsis.py` | `agentic_kit.py` |
| **10. Industrial IoT, ESP32, Sensor Filter & Modbus CRC16** | `13`, `52`, `01` | `samples/agentic_modbus_crc16_iot.py` | `agentic_kit.py` |

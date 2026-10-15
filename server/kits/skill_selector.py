#!/usr/bin/env python3
"""
skill_selector.py — Mesin Pemilih Skill, Kit & Template Otomatis Berdasarkan Kasus User

Memudahkan model LLM kecil maupun besar memilih kombinasi Skill (.md), Mesin Kit (.py/.js),
dan Template JSON yang paling tepat dari 65 Skill & 14 Template lintas industri.

Cara pakai:
  python3 kits/skill_selector.py "kata kunci permintaan user"
  python3 kits/skill_selector.py --list-cases
"""

import json
import os
import re
import sys
from pathlib import Path

SUITE_DIR = Path(__file__).resolve().parent.parent

CASE_CATALOG = [
    {
        "case_id": "game_3d_webgl_threejs_godot_unity",
        "title": "Pembuatan Game 3D Interaktif, Simulasi 3D Digital Twin (Three.js WebGL, Shaders, Godot 4, Unity C#)",
        "keywords": ["3d", "game", "webgl", "threejs", "three.js", "shader", "godot", "unity", "simulasi 3d", "digital twin"],
        "skills": ["76-skill-threejs-webgl-3d-engine-lengkap.md", "77-skill-threejs-3d-game-model-kecil-kit.md", "78-skill-3d-game-physics-collision-controls.md", "79-skill-3d-procedural-geometry-textures-particles.md", "83-skill-godot-4-gdscript-2d-3d-game-pro.md", "84-skill-unity-csharp-3d-game-architecture.md"],
        "kits": ["kits/game3d_kit.py", "kits/frontend_kit.py"],
        "templates": ["templates/game3d_cyber_factory_spec.json"],
    },
    {
        "case_id": "mobile_android_apk_flutter_reactnative",
        "title": "Pembuatan Aplikasi Android (.apk), Kotlin Jetpack Compose, Flutter, React Native/Expo & Capacitor Web-to-APK",
        "keywords": ["apk", "android", "mobile", "hp", "kotlin", "compose", "flutter", "react native", "expo", "capacitor", "play store"],
        "skills": ["66-skill-android-kotlin-jetpack-compose-pro.md", "67-skill-android-apk-gradle-build-signing-release.md", "70-skill-flutter-dart-multiplatform-apk-pro.md", "71-skill-react-native-expo-mobile-pro.md", "72-skill-capacitor-html-to-apk-pwa-wrapper.md"],
        "kits": ["kits/mobile_apk_kit.py", "kits/frontend_kit.py"],
        "templates": ["templates/mobile_android_apk_spec.json"],
    },
    {
        "case_id": "all_web_backend_desktop_frameworks",
        "title": "Semua Framework Web, Backend & Desktop (Next.js, Vue/Nuxt, Svelte 5, Angular, NestJS, FastAPI, Go, Rust, Laravel, Tauri/Electron)",
        "keywords": ["nextjs", "next.js", "vue", "nuxt", "svelte", "angular", "nestjs", "fastapi", "django", "golang", "rust", "laravel", "tauri", "electron", "framework", "website"],
        "skills": ["86-skill-nextjs-app-router-fullstack-pro.md", "87-skill-vue3-composition-api-pinia-nuxt.md", "88-skill-svelte5-runes-sveltekit-pro.md", "89-skill-angular-signals-standalone-rxjs-pro.md", "94-skill-nodejs-nestjs-fastify-hono-pro.md", "95-skill-python-fastapi-django-flask-sqlalchemy.md", "96-skill-golang-gin-fiber-concurrency-pro.md", "97-skill-rust-axum-tokio-memory-safety-pro.md", "98-skill-php-laravel-eloquent-mvc-pro.md", "99-skill-desktop-apps-tauri-electron-pyqt6.md"],
        "kits": ["kits/agentic_kit.py", "kits/frontend_kit.py"],
        "templates": ["templates/frontend_dashboard_interaktif_spec.json"],
    },
    {
        "case_id": "manufaktur_oee_sixsigma",
        "title": "Laporan & Dashboard Produksi Pabrik, OEE, Downtime Pareto & Six Sigma (Cp/Cpk)",
        "keywords": ["pabrik", "produksi", "lini", "oee", "six sigma", "cpk", "downtime", "pareto", "mesin", "shift"],
        "skills": ["17-skill-word-docx-lengkap.md", "20-skill-excel-xlsx-lengkap.md", "23-skill-excel-financial-industrial-modeling.md", "26-skill-data-viz-kurva-gila.md"],
        "kits": ["kits/word_kit.py", "kits/excel_kit.py", "kits/pptx_kit.py"],
        "templates": ["templates/word_laporan_eksekutif_spec.json", "templates/excel_dashboard_kurva_macro_spec.json", "templates/pptx_presentasi_eksekutif_spec.json"],
    },
    {
        "case_id": "agribisnis_peternakan_unggas",
        "title": "Agribisnis & Peternakan Unggas/Bebek/Ayam (Ransum Pakan, HDP, FCR, HPP Telur & Proposal)",
        "keywords": ["bebek", "ayam", "unggas", "ternak", "peternakan", "telur", "pakan", "ransum", "fcr", "hdp", "kandang", "agribisnis"],
        "skills": ["35-skill-agribisnis-peternakan-unggas-pakan.md", "20-skill-excel-xlsx-lengkap.md", "30-skill-proposal-bisnis-pitch-investor.md"],
        "kits": ["kits/word_kit.py", "kits/excel_kit.py", "kits/agentic_kit.py"],
        "templates": ["templates/word_proposal_agribisnis_peternakan_spec.json", "templates/excel_pembukuan_peternakan_fcr_hdp_spec.json"],
    },
    {
        "case_id": "umkm_fnb_kuliner_hpp",
        "title": "UMKM Kuliner, Restoran, Kafe & Katering (HPP Resep, Yield Loss, Food Cost % & Menu Engineering)",
        "keywords": ["kuliner", "fnb", "makanan", "minuman", "resep", "hpp", "food cost", "menu", "restoran", "kafe", "warung", "umkm"],
        "skills": ["36-skill-umkm-fnb-kuliner-hpp-resep.md", "21-skill-excel-xlsx-model-kecil.md", "45-skill-interactive-calculator-simulator-web.md"],
        "kits": ["kits/excel_kit.py", "kits/frontend_kit.py"],
        "templates": ["templates/excel_umkm_fnb_hpp_menu_spec.json", "templates/frontend_simulator_bisnis_hpp_roi_spec.json"],
    },
    {
        "case_id": "hrd_payroll_lembur_kpi",
        "title": "HRD, Penggajian (Payroll), Perhitungan Upah Lembur 1/173, BPJS & Evaluasi KPI Karyawan",
        "keywords": ["hrd", "gaji", "payroll", "lembur", "bpjs", "karyawan", "kpi", "okr", "slip gaji", "absensi"],
        "skills": ["39-skill-hrd-payroll-kpi-karyawan-indonesia.md", "20-skill-excel-xlsx-lengkap.md"],
        "kits": ["kits/excel_kit.py"],
        "templates": ["templates/excel_hrd_payroll_kpi_spec.json"],
    },
    {
        "case_id": "sop_iso_fmea_k3",
        "title": "SOP Operasional Pabrik, Standar ISO 9001, K3/LOTO, Matriks FMEA (RPN) & Laporan 8D",
        "keywords": ["sop", "iso", "k3", "fmea", "rpn", "8d", "prosedur", "keselamatan", "instruksi kerja", "kalibrasi"],
        "skills": ["29-skill-sop-iso-manufacturing-indonesia.md", "17-skill-word-docx-lengkap.md", "27-skill-pdf-report-generation-pro.md"],
        "kits": ["kits/word_kit.py", "kits/pdf_kit.py"],
        "templates": ["templates/word_sop_iso_k3_pabrik_spec.json"],
    },
    {
        "case_id": "startup_pitch_deck_ai",
        "title": "Pitch Deck Startup, Presentasi Investor, Proyeksi Fan Chart & Arsitektur Teknologi",
        "keywords": ["pitch", "deck", "investor", "startup", "presentasi", "ppt", "pptx", "slide", "ai", "otomasi"],
        "skills": ["24-skill-ppt-pptx-lengkap.md", "25-skill-ppt-pptx-model-kecil.md", "30-skill-proposal-bisnis-pitch-investor.md", "46-skill-presentasi-storytelling-ted-pitch.md"],
        "kits": ["kits/pptx_kit.py"],
        "templates": ["templates/pptx_pitch_deck_startup_ai_spec.json", "templates/pptx_presentasi_eksekutif_spec.json"],
    },
    {
        "case_id": "administrasi_invoice_kontrak_cv",
        "title": "Dokumen Administrasi: Invoice Tagihan, Kontrak MoU/PKS, Surat Resmi & CV ATS-Friendly",
        "keywords": ["invoice", "tagihan", "faktur", "surat", "kontrak", "mou", "pks", "cv", "resume", "lamaran", "ats"],
        "skills": ["31-skill-surat-resmi-kontrak-notulen-indonesia.md", "32-skill-cv-resume-ats-portofolio.md", "18-skill-word-docx-model-kecil.md"],
        "kits": ["kits/word_kit.py", "kits/pdf_kit.py"],
        "templates": ["templates/word_invoice_komersial_spec.json", "templates/word_cv_ats_profesional_spec.json", "templates/word_surat_perjanjian_mou_spec.json"],
    },
    {
        "case_id": "agentic_coding_iot_mcdm",
        "title": "Rekayasa Perangkat Lunak Otonom, Database SQLite, Sistem Keputusan TOPSIS & IoT ESP32/Modbus",
        "keywords": ["kode", "coding", "python", "sql", "sqlite", "api", "esp32", "iot", "modbus", "sensor", "topsis", "keputusan", "algoritma"],
        "skills": ["01-skill-agentic-coding-flow-lengkap.md", "02-skill-agentic-coding-model-kecil.md", "13-skill-iot-esp32-embedded-c-pro.md", "52-skill-network-protocol-mqtt-modbus-websocket.md", "54-skill-analisis-keputusan-mcdm-ahp-topsis.md"],
        "kits": ["kits/agentic_kit.py", "kits/coding_kit.py"],
        "templates": [],
    },
]


def search_skills_and_cases(query: str) -> dict:
    tokens = [t.lower() for t in re.findall(r"[a-zA-Z0-9_]+", query) if len(t) >= 2]
    matched_cases = []
    for c in CASE_CATALOG:
        hay = (c["title"] + " " + " ".join(c["keywords"])).lower()
        score = sum(3 if tok in c["keywords"] else (1 if tok in hay else 0) for tok in tokens)
        if score > 0:
            matched_cases.append({"score": score, **c})
    matched_cases.sort(key=lambda x: x["score"], reverse=True)

    skills_dir = SUITE_DIR / "skills"
    matched_skills = []
    for fname in sorted(os.listdir(skills_dir)):
        if not fname.endswith(".md"):
            continue
        txt = (skills_dir / fname).read_text(encoding="utf-8")[:900].lower()
        score = sum(2 if tok in fname.lower() else (1 if tok in txt else 0) for tok in tokens)
        if score > 0:
            matched_skills.append({"file": f"skills/{fname}", "score": score})
    matched_skills.sort(key=lambda x: x["score"], reverse=True)

    return {
        "query": query,
        "recommended_cases": matched_cases[:3] if matched_cases else CASE_CATALOG[:2],
        "top_matching_skills": matched_skills[:6],
    }


def test_selector() -> None:
    res = search_skills_and_cases("peternakan bebek pakan fcr hpp")
    assert len(res["recommended_cases"]) >= 1
    assert res["recommended_cases"][0]["case_id"] == "agribisnis_peternakan_unggas"
    print("SKILL SELECTOR SELF-TEST PASSED!")


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] == "--selftest":
        test_selector()
    elif sys.argv[1] == "--list-cases":
        print(json.dumps(CASE_CATALOG, indent=2, ensure_ascii=False))
    else:
        q = " ".join(sys.argv[1:])
        print(json.dumps(search_skills_and_cases(q), indent=2, ensure_ascii=False))

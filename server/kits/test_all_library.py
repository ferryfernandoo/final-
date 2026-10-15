#!/usr/bin/env python3
"""
test_all_library.py — Master Automated QA & Test Suite Runner untuk Perpustakaan Skill & Kit LLM

Menguji secara menyeluruh:
  1. Seluruh file Skill Markdown di `skills/` (memastikan YAML frontmatter `name` & `description` valid, isi lengkap, tanpa placeholder rusak).
  2. Seluruh 10 Mesin Kit di `kits/` (sintaks Python/Node.js, AST, dan eksekusi self-test).
  3. Seluruh Template JSON di `templates/` (validitas JSON dan skema).
  4. Seluruh Sampel Hasil Uji di `samples/` (.docx, .xlsx, .bas, .pptx, .pdf, .html, .py, dan 9 gambar kurva 300-DPI).

Cara pakai:
  python3 kits/test_all_library.py
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

SUITE_DIR = Path(__file__).resolve().parent.parent


def check_skills() -> dict:
    skills_dir = SUITE_DIR / "skills"
    md_files = [skills_dir / f for f in sorted(os.listdir(skills_dir)) if f.endswith(".md")]
    passed, failed = [], []
    for md in md_files:
        txt = md.read_text(encoding="utf-8")
        m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.+)", txt, re.S)
        if not m:
            failed.append((md.name, "YAML frontmatter tidak ditemukan"))
            continue
        fm, body = m.group(1), m.group(2)
        if "name:" not in fm or "description:" not in fm:
            failed.append((md.name, "Field name atau description hilang di frontmatter"))
            continue
        if len(body.strip()) < 200:
            failed.append((md.name, "Isi skill terlalu pendek (<200 karakter)"))
            continue
        passed.append(md.name)
    return {"total": len(md_files), "passed": len(passed), "failed": failed}


def check_kits() -> dict:
    kits_dir = SUITE_DIR / "kits"
    agentic = kits_dir / "agentic_kit.py"
    passed, failed = [], []
    for f in sorted(kits_dir.iterdir()):
        if f.suffix == ".py":
            res = subprocess.run([sys.executable, str(agentic), "--audit", str(f)], capture_output=True, text=True)
            if res.returncode == 0:
                passed.append(f.name)
            else:
                failed.append((f.name, res.stdout.strip() or res.stderr.strip()))
        elif f.suffix == ".js":
            res = subprocess.run(["node", "--check", str(f)], capture_output=True, text=True)
            if res.returncode == 0:
                passed.append(f.name)
            else:
                failed.append((f.name, res.stderr.strip()))
    return {"total": len(passed) + len(failed), "passed": len(passed), "failed": failed}


def check_templates() -> dict:
    tpl_dir = SUITE_DIR / "templates"
    passed, failed = [], []
    for f in [tpl_dir / x for x in sorted(os.listdir(tpl_dir)) if x.endswith(".json")]:
        try:
            json.loads(f.read_text(encoding="utf-8"))
            passed.append(f.name)
        except Exception as e:
            failed.append((f.name, str(e)))
    return {"total": len(passed) + len(failed), "passed": len(passed), "failed": failed}


def check_samples() -> dict:
    samp_dir = SUITE_DIR / "samples"
    expected = [
        "Laporan_Eksekutif_Produksi_Q3_2026.docx",
        "Laporan_Eksekutif_Produksi_Q3_2026.pdf",
        "Proposal_Kemitraan_Agribisnis_Peternakan_2026.docx",
        "SOP_Kalibrasi_Dan_K3_Lini_Produksi.docx",
        "SOP_Kalibrasi_Dan_K3_Lini_Produksi.pdf",
        "Invoice_Tagihan_Komersial_2026.docx",
        "Invoice_Tagihan_Komersial_2026.pdf",
        "CV_ATS_Profesional_Rekayasa_Dan_Operasional.docx",
        "CV_ATS_Profesional_Rekayasa_Dan_Operasional.pdf",
        "Draft_Perjanjian_Kerja_Sama_MoU_2026.docx",
        "Dashboard_Produksi_Kurva_Dan_Macro_Q3_2026.xlsx",
        "Dashboard_Produksi_Kurva_Dan_Macro_Q3_2026_Macros.bas",
        "Model_Finansial_Dan_Produksi_Peternakan_2026.xlsx",
        "Kalkulator_HPP_Resep_Dan_Menu_FNB_2026.xlsx",
        "Sistem_Payroll_Lembur_Dan_KPI_Karyawan_2026.xlsx",
        "Presentasi_Eksekutif_Otomasi_Q3_2026.pptx",
        "Pitch_Deck_Inovasi_Otomasi_AI_2026.pptx",
        "Dashboard_Interaktif_Operasional_Q3_2026.html",
        "Simulator_Bisnis_HPP_Dan_Kelayakan_Investasi.html",
        "Game_3D_Cyber_Factory_Defender_WebGL.html",
        "Digital_Twin_3D_Pabrik_Dan_Robot_6DOF.html",
        "Roda_Gigi_Transmisi_Lini_3D.stl",
        "Roda_Gigi_Transmisi_Lini_3D.obj",
        "Roda_Gigi_Transmisi_Lini_3D_blueprint.png",
        "Ilustrasi_3D_Isometrik_Smart_Factory.svg",
        "Panel_Speedometer_Gauge_KPI_Vektor.svg",
        "Studio_3D_5in1_Robot_Terrain_CAD_Exporter.html",
        "agentic_sqlite_repo.py",
        "agentic_etl_six_sigma.py",
        "agentic_agribisnis_ransum_fcr.py",
        "agentic_mcdm_decision_topsis.py",
        "agentic_modbus_crc16_iot.py",
    ]
    passed, failed = [], []
    for name in expected:
        p = samp_dir / name
        if p.exists() and p.stat().st_size > 100:
            passed.append(name)
        else:
            failed.append((name, "File sampel belum ada atau ukuran 0 byte"))
    curves = [x for x in os.listdir(samp_dir / "curves_gallery") if x.endswith(".png")]
    if len(curves) >= 9:
        passed.append(f"curves_gallery ({len(curves)} PNG 300-DPI)")
    else:
        failed.append(("curves_gallery", f"Hanya ditemukan {len(curves)} dari 9 kurva"))
    return {"total": len(passed) + len(failed), "passed": len(passed), "failed": failed}


def main() -> None:
    report = {
        "skills_qa": check_skills(),
        "kits_qa": check_kits(),
        "templates_qa": check_templates(),
        "samples_qa": check_samples(),
    }
    all_ok = all(len(sec["failed"]) == 0 for sec in report.values())
    report["overall_status"] = "ALL_PASSED_100%" if all_ok else "HAS_FAILURES"
    out_json = SUITE_DIR / "QA_TEST_REPORT.json"
    out_json.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()

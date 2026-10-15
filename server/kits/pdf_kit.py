#!/usr/bin/env python3
"""
pdf_kit.py — Mesin Pembuat Dokumen PDF Profesional Siap Cetak dari JSON Spec

Memanfaatkan `word_kit.py` + `viz_kit.py` (untuk tata letak tipografi, kartu KPI,
tabel zebra, gambar split-left/right, dan kurva ilmiah 300-DPI) lalu mengonversinya
secara deterministik ke PDF tervalidasi via LibreOffice Headless & `pypdf`.

Cara pakai (CLI):
  python3 pdf_kit.py spec.json output.pdf
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import word_kit


def build(spec: dict, out_pdf_path: str) -> str:
    tmp_dir = tempfile.mkdtemp(prefix="pdf_kit_")
    tmp_docx = os.path.join(tmp_dir, "source_doc.docx")
    word_kit.build(spec, tmp_docx)

    lo_prof = f"file://{tmp_dir}/lo_prof"
    subprocess.run(
        [
            "libreoffice",
            f"-env:UserInstallation={lo_prof}",
            "--headless",
            "--nologo",
            "--nolockcheck",
            "--norestore",
            "--convert-to",
            "pdf",
            "--outdir",
            tmp_dir,
            tmp_docx,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        timeout=30,
    )
    gen_pdf = os.path.join(tmp_dir, "source_doc.pdf")
    if not os.path.exists(gen_pdf) or os.path.getsize(gen_pdf) == 0:
        raise RuntimeError("[pdf-kit] Gagal mengonversi dokumen ke PDF.")

    os.makedirs(os.path.dirname(os.path.abspath(out_pdf_path)), exist_ok=True)
    shutil.move(gen_pdf, out_pdf_path)
    shutil.rmtree(tmp_dir, ignore_errors=True)
    return out_pdf_path


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Pemakaian: python3 pdf_kit.py spec.json output.pdf", file=sys.stderr)
        sys.exit(1)
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        spec_data = json.load(f)
    res = build(spec_data, sys.argv[2])
    print(f"OK -> {res}")

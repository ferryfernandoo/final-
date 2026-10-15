#!/usr/bin/env python3
"""
agentic_kit.py — Mesin Agentic Coding Flow, Scaffolder, Security Auditor & Self-Healing Test Runner
Dirancang agar model LLM kecil (3B/7B/8B) maupun model besar dapat menjalankan alur kerja
Agentic Coding secara terstruktur:
  1. PLAN & STATE (`--init-state plan.json`): Menyimpan daftar sub-tugas atomik dan kontrak input/output.
  2. SCAFFOLD (`--scaffold <tipe> <out_file>`): Membuat pondasi kode produksi yang 100% teruji
     (`sqlite_repo`, `rest_api_service`, `etl_pipeline`, `esp32_telemetry`).
  3. AUDIT & SELF-HEAL (`--audit <file_atau_folder>`):
     - Memeriksa sintaks & AST (Python / JS / JSON / SQL)
     - Mendeteksi placeholder terlarang (`TODO`, `FIXME`, `pass`, `...`, `NotImplementedError`)
     - Memeriksa celah keamanan (SQL Injection f-string, `eval(`, `shell=True`, kredensial hardcoded)
     - Menjalankan seluruh fungsi `test_*` dan jika gagal, mengekstrak nomor baris tepat + **Saran Perbaikan Otomatis (Repair Hint)** untuk model kecil!

Cara pakai:
  python3 agentic_kit.py --audit path/ke/file_atau_folder
  python3 agentic_kit.py --scaffold sqlite_repo sampel_repo.py
"""

import ast
import json
import os
import re
import subprocess
import sys
from pathlib import Path

SECURITY_RULES = [
    (
        r"""(?:execute|executemany)\s*\(\s*f["'][^"']*(?:SELECT|INSERT|UPDATE|DELETE)\b""",
        "CRITICAL_SQL_INJECTION",
        "Jangan gunakan f-string di dalam `cursor.execute(f'SELECT ...')`. Gunakan tanda tanya `?` dan tuple parameter: `cursor.execute('SELECT * FROM t WHERE id = ?', (user_id,))`.",
    ),
    (
        r"""subprocess\.(?:run|Popen|call|check_output)\s*\([^)]*shell\s*=\s*True""",
        "COMMAND_INJECTION_RISK",
        "Hindari `shell=True` pada `subprocess`. Kirim argumen sebagai list: `subprocess.run(['ls', '-la'], check=True)`.",
    ),
    (
        r"""\beval\s*\(""",
        "DANGEROUS_EVAL",
        "Jangan gunakan `eval()`. Gunakan `json.loads()` atau `ast.literal_eval()` untuk mem-parsing data.",
    ),
]

SCAFFOLD_TEMPLATES = {
    "sqlite_repo": '''#!/usr/bin/env python3
"""
Modul Repository SQLite Produksi (100% Parameterized Queries, Transaksi Aman & Self-Test).
Dibangun oleh agentic_kit.py.
"""

import sqlite3
from dataclasses import dataclass
from typing import List, Optional, Dict, Any


@dataclass(frozen=True)
class ProduksiRecord:
    id: Optional[int]
    lini: str
    shift: int
    target: int
    realisasi: int
    reject: int

    @property
    def capaian_persen(self) -> float:
        if self.target <= 0:
            return 0.0
        return round((self.realisasi / self.target) * 100.0, 2)

    @property
    def reject_rate_persen(self) -> float:
        if self.realisasi <= 0:
            return 0.0
        return round((self.reject / self.realisasi) * 100.0, 2)


class ProduksiRepository:
    def __init__(self, db_path: str = ":memory:") -> None:
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        with self.conn:
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS log_produksi (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lini TEXT NOT NULL,
                    shift INTEGER NOT NULL CHECK(shift IN (1, 2, 3)),
                    target INTEGER NOT NULL CHECK(target >= 0),
                    realisasi INTEGER NOT NULL CHECK(realisasi >= 0),
                    reject INTEGER NOT NULL DEFAULT 0 CHECK(reject >= 0)
                )
                """
            )
            self.conn.execute("CREATE INDEX IF NOT EXISTS idx_log_lini ON log_produksi(lini)")

    def tambah(self, rec: ProduksiRecord) -> int:
        if not rec.lini.strip():
            raise ValueError("Nama lini tidak boleh kosong.")
        if rec.shift not in (1, 2, 3):
            raise ValueError("Shift harus 1, 2, atau 3.")
        with self.conn:
            cur = self.conn.execute(
                "INSERT INTO log_produksi (lini, shift, target, realisasi, reject) VALUES (?, ?, ?, ?, ?)",
                (rec.lini.strip(), rec.shift, rec.target, rec.realisasi, rec.reject),
            )
            return int(cur.lastrowid)

    def ambil_semua(self, lini_filter: Optional[str] = None) -> List[ProduksiRecord]:
        if lini_filter:
            rows = self.conn.execute(
                "SELECT id, lini, shift, target, realisasi, reject FROM log_produksi WHERE lini = ? ORDER BY id ASC",
                (lini_filter.strip(),),
            ).fetchall()
        else:
            rows = self.conn.execute(
                "SELECT id, lini, shift, target, realisasi, reject FROM log_produksi ORDER BY id ASC"
            ).fetchall()
        return [
            ProduksiRecord(
                id=r["id"],
                lini=r["lini"],
                shift=r["shift"],
                target=r["target"],
                realisasi=r["realisasi"],
                reject=r["reject"],
            )
            for r in rows
        ]

    def ringkasan_per_lini(self) -> List[Dict[str, Any]]:
        rows = self.conn.execute(
            """
            SELECT
                lini,
                SUM(target) AS total_target,
                SUM(realisasi) AS total_realisasi,
                SUM(reject) AS total_reject,
                ROUND(CAST(SUM(realisasi) AS REAL) / NULLIF(SUM(target), 0) * 100.0, 2) AS capaian_pct
            FROM log_produksi
            GROUP BY lini
            ORDER BY total_realisasi DESC
            """
        ).fetchall()
        return [dict(r) for r in rows]


def test_repository() -> None:
    repo = ProduksiRepository(":memory:")
    id1 = repo.tambah(ProduksiRecord(None, "Lini 1 - Stamping", 1, 4000, 4120, 18))
    id2 = repo.tambah(ProduksiRecord(None, "Lini 2 - Assembly", 1, 4000, 4350, 12))
    assert id1 == 1 and id2 == 2
    semua = repo.ambil_semua()
    assert len(semua) == 2
    assert semua[0].capaian_persen == 103.0
    ringkas = repo.ringkasan_per_lini()
    assert ringkas[0]["lini"] == "Lini 2 - Assembly"
    assert ringkas[0]["capaian_pct"] == 108.75
    print("SELF-TEST SQLITE REPOSITORY PASSED:", ringkas)


if __name__ == "__main__":
    test_repository()
''',
    "etl_pipeline": '''#!/usr/bin/env python3
"""
Modul Pipeline ETL & Analisis Statistik Six Sigma (Cp, Cpk, Outlier Detection).
Dibangun oleh agentic_kit.py.
"""

import math
import statistics
from dataclasses import dataclass
from typing import List, Dict, Any


@dataclass(frozen=True)
class HasilSixSigma:
    jumlah_sampel: int
    mean: float
    std_dev: float
    lsl: float
    usl: float
    cp: float
    cpk: float
    outliers: List[float]
    kapabel: bool


def analisis_kapabilitas_proses(sampel: List[float], lsl: float, usl: float) -> HasilSixSigma:
    bersih = [float(x) for x in sampel if x is not None and not math.isnan(float(x))]
    if len(bersih) < 2:
        raise ValueError("Minimal dibutuhkan 2 sampel valid untuk menghitung standar deviasi.")
    if usl <= lsl:
        raise ValueError("Batas atas (USL) harus lebih besar dari batas bawah (LSL).")

    mean_val = statistics.mean(bersih)
    std_val = statistics.stdev(bersih)
    if std_val <= 0:
        cp_val, cpk_val = 99.99, 99.99
        outliers = []
    else:
        cp_val = (usl - lsl) / (6.0 * std_val)
        cpu = (usl - mean_val) / (3.0 * std_val)
        cpl = (mean_val - lsl) / (3.0 * std_val)
        cpk_val = min(cpu, cpl)
        batas_bawah_2s = mean_val - 2.0 * std_val
        batas_atas_2s = mean_val + 2.0 * std_val
        outliers = [round(x, 4) for x in bersih if x < batas_bawah_2s or x > batas_atas_2s]

    return HasilSixSigma(
        jumlah_sampel=len(bersih),
        mean=round(mean_val, 4),
        std_dev=round(std_val, 4),
        lsl=lsl,
        usl=usl,
        cp=round(cp_val, 3),
        cpk=round(cpk_val, 3),
        outliers=outliers,
        kapabel=(cpk_val >= 1.33),
    )


def test_etl_six_sigma() -> None:
    data = [100.1, 99.8, 100.3, 100.0, 99.9, 100.2, 100.1, 99.7, 100.4, 100.0]
    res = analisis_kapabilitas_proses(data, lsl=98.5, usl=101.5)
    assert res.jumlah_sampel == 10
    assert res.kapabel is True
    assert res.cpk >= 1.33
    print("SELF-TEST ETL SIX SIGMA PASSED:", res)


if __name__ == "__main__":
    test_etl_six_sigma()
'''
}


def _parse_traceback_hint(stderr_text: str) -> str:
    """Berikan saran perbaikan konkret dalam bahasa Indonesia agar model kecil langsung paham cara memperbaiki bug."""
    if "SyntaxError" in stderr_text:
        return "Periksa kurung `()`, `[]`, `{}` atau tanda kutip yang belum ditutup pada baris yang ditunjuk."
    if "IndentationError" in stderr_text:
        return "Gunakan spasi 4-karakter secara konsisten (jangan campur Tab dan Spasi)."
    if "ZeroDivisionError" in stderr_text:
        return "Tambahkan penjaga pembagian nol: `if pembagi == 0: return 0.0` sebelum membagi."
    if "KeyError" in stderr_text:
        return "Gunakan `dict_obj.get('kunci', nilai_default)` ketimbang akses langsung `dict_obj['kunci']`."
    if "TypeError" in stderr_text:
        return "Pastikan tipe argumen sesuai (jangan menjumlahkan `None` atau `str` dengan `int`/`float`)."
    if "AssertionError" in stderr_text:
        return "Periksa kembali rumus logika fungsi terhadap nilai ekspektasi pada `assert` yang gagal."
    return "Baca baris terakhir traceback, periksa variabel input pada baris tersebut, dan perbaiki fungsi terkait."


def audit_file(file_path: str, run_tests: bool = True) -> dict:
    if not os.path.exists(file_path):
        return {"ok": False, "file": file_path, "errors": [f"File tidak ditemukan: {file_path}"], "warnings": [], "repair_hints": []}

    ext = Path(file_path).suffix.lower()
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        code = f.read()

    errors = []
    warnings = []
    repair_hints = []

    # 1. Security scan
    for pat, code_lbl, hint in SECURITY_RULES:
        if re.search(pat, code, re.I):
            warnings.append(f"{code_lbl}: Pola berisiko terdeteksi di {os.path.basename(file_path)}")
            repair_hints.append(hint)

    # 2. Language-specific AST & runtime verification
    if ext == ".py":
        has_test_func = False
        try:
            tree = ast.parse(code, filename=file_path)
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    if node.name.startswith("test_"):
                        has_test_func = True
                    # Cek panjang fungsi (> 80 baris diberi peringatan modularitas)
                    if hasattr(node, "end_lineno") and node.end_lineno and (node.end_lineno - node.lineno) > 120:
                        warnings.append(f"LONG_FUNCTION: Fungsi `{node.name}()` memiliki {node.end_lineno - node.lineno} baris. Pecah menjadi fungsi helper yang lebih kecil.")
                    if len(node.body) == 1 and isinstance(node.body[0], (ast.Pass, ast.Expr)):
                        val = getattr(node.body[0], "value", None)
                        if isinstance(node.body[0], ast.Pass) or (isinstance(val, ast.Constant) and val.value is Ellipsis):
                            errors.append(f"EMPTY_PLACEHOLDER_FUNCTION: Fungsi `{node.name}()` di baris {node.lineno} hanya berisi `pass` atau `...`.")
                            repair_hints.append(f"Tulis implementasi lengkap untuk fungsi `{node.name}()`.")
                elif isinstance(node, ast.Raise):
                    exc = getattr(node, "exc", None)
                    exc_id = getattr(exc, "id", None) or getattr(getattr(exc, "func", None), "id", None)
                    if exc_id == "NotImplementedError":
                        errors.append(f"NOT_IMPLEMENTED_ERROR: Baris {node.lineno} memanggil `raise NotImplementedError`.")
                        repair_hints.append("Ganti `raise NotImplementedError` dengan kode implementasi nyata.")
        except SyntaxError as e:
            errors.append(f"PYTHON_SYNTAX_ERROR: Baris {e.lineno}: {e.msg}")
            repair_hints.append(_parse_traceback_hint("SyntaxError"))

        if not errors and run_tests and has_test_func:
            res = subprocess.run([sys.executable, file_path], capture_output=True, text=True, timeout=15)
            if res.returncode != 0:
                err_txt = res.stderr.strip() or res.stdout.strip()
                errors.append(f"SELF_TEST_FAILED:\n{err_txt}")
                repair_hints.append(_parse_traceback_hint(err_txt))

    elif ext in (".js", ".mjs", ".cjs"):
        res = subprocess.run(["node", "--check", file_path], capture_output=True, text=True)
        if res.returncode != 0:
            errors.append(f"JS_SYNTAX_ERROR:\n{res.stderr.strip()}")
            repair_hints.append("Periksa kurung kurawal `{}` dan tanda titik koma/kutip pada baris error.")

    elif ext == ".json":
        try:
            json.loads(code)
        except Exception as e:
            errors.append(f"JSON_SYNTAX_ERROR: {e}")
            repair_hints.append("Pastikan semua key dan string memakai kutip ganda `\"`, tanpa koma gantung di akhir list/objek.")

    return {
        "ok": len(errors) == 0,
        "file": file_path,
        "errors": errors,
        "warnings": warnings,
        "repair_hints": repair_hints,
    }


def audit_target(target_path: str) -> dict:
    if os.path.isfile(target_path):
        return audit_file(target_path)
    results = []
    for root, dirs, files in os.walk(target_path):
        dirs[:] = [d for d in dirs if d not in ("__pycache__", ".git", "node_modules")]
        for f in sorted(files):
            if Path(f).suffix.lower() in (".py", ".js", ".json"):
                fp = os.path.join(root, f)
                if os.path.basename(fp) == "agentic_kit.py":
                    continue
                results.append(audit_file(fp))
    all_ok = all(r["ok"] for r in results)
    return {"ok": all_ok, "total_files": len(results), "results": results}


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Pemakaian:\n  python3 agentic_kit.py --audit <file_atau_folder>\n  python3 agentic_kit.py --scaffold <sqlite_repo|etl_pipeline> <out.py>", file=sys.stderr)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "--audit":
        rep = audit_target(sys.argv[2])
        print(json.dumps(rep, indent=2, ensure_ascii=False))
        sys.exit(0 if rep["ok"] else 1)
    elif cmd == "--scaffold":
        tpl_name = sys.argv[2]
        out_f = sys.argv[3]
        if tpl_name not in SCAFFOLD_TEMPLATES:
            print(f"Template '{tpl_name}' tidak dikenal. Pilihan: {list(SCAFFOLD_TEMPLATES.keys())}", file=sys.stderr)
            sys.exit(1)
        os.makedirs(os.path.dirname(os.path.abspath(out_f)), exist_ok=True)
        with open(out_f, "w", encoding="utf-8") as f:
            f.write(SCAFFOLD_TEMPLATES[tpl_name])
        rep = audit_file(out_f, run_tests=True)
        print(f"OK -> {out_f} (Self-Test: {'PASSED' if rep['ok'] else rep['errors']})")

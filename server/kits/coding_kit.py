#!/usr/bin/env python3
"""
coding_kit.py — Mesin Audit Kode, Deteksi Placeholder/Halusinasi & Self-Test Runner untuk Model LLM Kecil & Besar

Fitur:
  1. Pemeriksaan Sintaks & AST Python (`ast.parse`)
  2. Pemeriksaan Sintaks JavaScript (`node --check`)
  3. Deteksi Fungsi Kosong & Placeholder Terlarang di dalam kode aktif
  4. Eksekusi Self-Test otomatis jika file mendefinisikan fungsi `def test_*()`
"""

import ast
import json
import os
import subprocess
import sys
from pathlib import Path


def verify_code_file(file_path: str, run_tests: bool = True) -> dict:
    if not os.path.exists(file_path):
        return {"ok": False, "file": file_path, "errors": [f"File tidak ditemukan: {file_path}"], "warnings": []}

    ext = Path(file_path).suffix.lower()
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        code = f.read()

    errors = []
    warnings = []

    if ext == ".py":
        has_test_func = False
        try:
            tree = ast.parse(code, filename=file_path)
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    if node.name.startswith("test_"):
                        has_test_func = True
                    if len(node.body) == 1 and isinstance(node.body[0], (ast.Pass, ast.Expr)):
                        val = getattr(node.body[0], "value", None)
                        if isinstance(node.body[0], ast.Pass) or (isinstance(val, ast.Constant) and val.value is Ellipsis):
                            warnings.append(f"EMPTY_FUNCTION: Fungsi `{node.name}()` hanya berisi `pass` atau `...`.")
                elif isinstance(node, ast.Raise):
                    exc = getattr(node, "exc", None)
                    exc_id = getattr(exc, "id", None) or getattr(getattr(exc, "func", None), "id", None)
                    if exc_id == "NotImplementedError":
                        warnings.append("NOT_IMPLEMENTED: Ditemukan `raise NotImplementedError` — selesaikan implementasi fungsi.")
        except SyntaxError as e:
            errors.append(f"PYTHON_SYNTAX_ERROR: Baris {e.lineno}: {e.msg}")

        if not errors and run_tests and has_test_func:
            res = subprocess.run([sys.executable, file_path], capture_output=True, text=True, timeout=15)
            if res.returncode != 0:
                errors.append(f"RUNTIME_TEST_FAILED:\n{res.stderr.strip()}")

    elif ext in (".js", ".mjs", ".cjs"):
        res = subprocess.run(["node", "--check", file_path], capture_output=True, text=True)
        if res.returncode != 0:
            errors.append(f"JS_SYNTAX_ERROR:\n{res.stderr.strip()}")

    elif ext == ".json":
        try:
            json.loads(code)
        except Exception as e:
            errors.append(f"JSON_SYNTAX_ERROR: {e}")

    return {"ok": len(errors) == 0, "file": file_path, "errors": errors, "warnings": warnings}


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] != "--verify":
        print("Pemakaian: python3 coding_kit.py --verify <path_file>", file=sys.stderr)
        sys.exit(1)
    report = verify_code_file(sys.argv[2])
    print(json.dumps(report, indent=2, ensure_ascii=False))
    sys.exit(0 if report["ok"] else 1)

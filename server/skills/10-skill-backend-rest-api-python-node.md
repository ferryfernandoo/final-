---
name: backend-rest-api-python-node
description: "Skill rekayasa Backend & REST API (Python FastAPI/Flask/Service Layer & Node.js Express) dengan validasi payload ketat, amplop respons JSON standar, dan unit test tanpa ketergantungan port jaringan."
---

# Backend & REST API Engineering Pro

## 1. Amplop Respons JSON Konsisten
- Sukses (`200` / `201`): `{"ok": true, "data": { ... }, "meta": {"count": 10}}`
- Error (`400` / `404` / `422`): `{"ok": false, "error": {"code": "VALIDATION_ERROR", "message": "Target harus > 0"}}`

## 2. Pisahkan *Service Class* dari *HTTP Route*
Tulis seluruh validasi dan logika bisnis di dalam kelas `Service` murni yang menerima `dict` dan mengembalikan `(status_code, response_dict)`. Dengan cara ini, seluruh endpoint API dapat diuji 100% di dalam fungsi `test_api()` tanpa perlu menyalakan port TCP yang mungkin diblokir di sandbox!

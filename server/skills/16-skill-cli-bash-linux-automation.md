---
name: cli-bash-linux-automation
description: "Skill penulisan script Bash/Shell Linux yang tangguh, idempoten, dan aman (set -euo pipefail, trap cleanup, quoting variabel, timeout guard, dan isolasi konversi LibreOffice)."
---

# Bash Scripting, Linux CLI & Automation Pro

## Standar Header Script Bash Produksi
```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
TMP_DIR="$(mktemp -d -t job_XXXXXX)"
trap 'rm -rf "${TMP_DIR}"' EXIT INT TERM
```
- Selalu kutip ganda variabel (`"${FILE_PATH}"`).
- Gunakan `timeout 25` dan profil `-env:UserInstallation=file://${TMP_DIR}/lo_prof` saat memanggil LibreOffice di latar belakang agar tidak pernah mengunci atau menggantung.

---
name: kotlin-multiplatform-kmp-clean-arch
description: "Skill arsitektur Kotlin Multiplatform (KMP) dan Compose Multiplatform untuk berbagi logika bisnis, jaringan (Ktor), dan database (SQLDelight/Room) di Android, iOS, dan Desktop."
---

# Kotlin Multiplatform (KMP) & Compose Multiplatform Pro

## Pemisahan `commonMain`, `androidMain`, dan `iosMain`
- **`commonMain` (85%–95% Kode):** Berisi model `@Serializable`, perhitungan bisnis, repository database, Ktor HTTP client, dan UI Compose Multiplatform.
- **`expect` / `actual` Declaration:** Gunakan `expect fun getPlatformName(): String` di `commonMain` hanya untuk akses perangkat keras spesifik platform (seperti Bluetooth, Sensor, atau File System).

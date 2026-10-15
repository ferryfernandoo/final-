---
name: mobile-testing-debugging-adb-logcat
description: "Skill debugging dan pengujian aplikasi Android menggunakan ADB (Android Debug Bridge), pemfilteran logcat, analisis Crash/ANR, serta pengujian UI otomatis."
---

# Android Debugging, ADB CLI & Crash Diagnostics Pro

## Perintah Penting `adb` untuk Install & Audit Aplikasi
- **Install APK langsung ke HP/Emulator:** `adb install -r app-debug.apk`
- **Pantau Log Error & Crash dari Paket Aplikasi Kita Saja:**
  `adb logcat | grep -E "(AndroidRuntime|id.co.deepernnova)"`
- **Simulasi Kondisi Jaringan Lambat / Offline:** Matikan WiFi/Data via `adb shell svc wifi disable` dan pastikan aplikasi menampilkan data *cache* lokal tanpa *Force Close*!

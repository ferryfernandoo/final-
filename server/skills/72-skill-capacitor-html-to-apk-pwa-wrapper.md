---
name: capacitor-html-to-apk-pwa-wrapper
description: "Skill tercepat mengubah aplikasi web HTML/CSS/JS, React, Vue, atau game Three.js 3D menjadi file aplikasi Android (.apk) siap install dan Progressive Web App (PWA) menggunakan CapacitorJS dan Service Worker."
---

# HTML5 WebApp & 3D Game to Android `.apk` (CapacitorJS & PWA) Pro

Cara paling praktis bagi developer web atau AI untuk menghasilkan aplikasi Android `.apk` yang memiliki akses penuh ke fitur HP (Kamera, Haptics/Getar, Penyimpanan Lokal, Fullscreen Game 3D) adalah membungkus WebApp menggunakan **CapacitorJS**!

## Langkah Konversi File `.html` Menjadi `.apk` Android
1. Siapkan folder `www/` berisi `index.html` mandiri (seluruh CSS, JS, dan gambar Base64 sudah ter-inline atau lokal di dalam `www/`).
2. Jalankan 5 perintah ini:
   ```bash
   npm init -y
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "NamaAplikasi" "id.perusahaan.app" --web-dir www
   npx cap add android
   npx cap copy android && cd android && ./gradlew assembleDebug
   ```
3. File `android/app/build/outputs/apk/debug/app-debug.apk` langsung siap dikirim dan di-install di HP Android!

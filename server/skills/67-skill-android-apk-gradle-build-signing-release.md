---
name: android-apk-gradle-build-signing-release
description: "Skill konfigurasi Gradle Kotlin DSL (build.gradle.kts), AndroidManifest.xml, ProGuard/R8 shrinking, pembuatan Keystore (.jks), serta kompilasi file .apk dan .aab siap rilis Play Store."
---

# Android `.apk` & `.aab` Build Pipeline, Gradle Kotlin DSL & Signing Pro

## 1. Perintah CLI Kompilasi `.apk` Tanpa Harus Membuka Android Studio GUI
- **Membuat APK Debug (Langsung Bisa Di-install ke HP via Kabel/WhatsApp):**
  ```bash
  ./gradlew assembleDebug
  # Lokasi output: app/build/outputs/apk/debug/app-debug.apk
  ```
- **Membuat Keystore Penandatangan Resmi (`.jks`):**
  ```bash
  keytool -genkey -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias release
  ```
- **Menandatangani & Mengoptimalkan APK Rilis (`zipalign` + `apksigner`):**
  ```bash
  ./gradlew assembleRelease
  ```

## 2. Aturan Wajib `AndroidManifest.xml` (Android 12+ / API 31+)
Setiap `<activity>`, `<service>`, atau `<receiver>` yang memiliki `<intent-filter>` **WAJIB** mencantumkan atribut `android:exported="true"` atau `"false"` secara eksplisit; jika lupa, APK akan gagal ter-install di Android 12 ke atas!

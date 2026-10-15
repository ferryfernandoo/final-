---
name: flutter-dart-multiplatform-apk-pro
description: "Skill pengembangan aplikasi mobile lintas platform (Android .apk, iOS, Web, Desktop) menggunakan Flutter & Dart 3: arsitektur Widget bersih, state management Riverpod/ValueNotifier, penyimpanan lokal, dan optimasi ukuran APK."
---

# Flutter & Dart 3 Multiplatform Mobile App & `.apk` Builder Pro

## 1. Struktur Kode Flutter Bersih & Cepat
- Gunakan `const` pada setiap konstruktor Widget statis (`const Text(...)`, `const SizedBox(height: 12)`) agar Flutter tidak membangun ulang widget yang tidak berubah saat animasi berjalan.
- Gunakan `ValueNotifier<T>` + `ValueListenableBuilder<T>` (atau `Riverpod`) untuk state reaktif tanpa perlu memanggil `setState()` di seluruh halaman.
- Gunakan `ListView.builder` (bukan `Column` di dalam `SingleChildScrollView`) untuk daftar panjang.

## 2. Perintah Kompilasi `.apk` Ringan (Split Per ABI)
Agar ukuran file `.apk` Flutter kecil (~15 MB, bukan 50+ MB):
```bash
flutter build apk --release --split-per-abi
# Menghasilkan app-arm64-v8a-release.apk untuk semua HP Android modern
```

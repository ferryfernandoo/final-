---
name: react-native-expo-mobile-pro
description: "Skill pembuatan aplikasi mobile Android & iOS menggunakan React Native dan Expo (TypeScript): Expo Router, FlatList teroptimasi, React Native Reanimated 60fps, penyimpanan lokal AsyncStorage/SQLite, dan kompilasi APK."
---

# React Native & Expo Mobile Engineering Pro (TypeScript)

## 5 Aturan Penting React Native Bebas Lag
1. **Semua Teks Wajib di Dalam `<Text>`:** Di React Native, menaruh string langsung di dalam `<View>` tanpa `<Text>` akan menyebabkan *crash* instan!
2. **Gunakan `FlatList` dengan `keyExtractor` dan `ListEmptyComponent`:** Jangan pernah memakai `.map()` di dalam `ScrollView` untuk data lebih dari 20 baris.
3. **Gunakan `StyleSheet.create({...})` atau NativeWind (Tailwind):** Hindari membuat objek style inline baru di setiap siklus render.
4. **Gunakan `Pressable` Ketimbang `TouchableOpacity` Lama:** `Pressable` mendukung feedback visual yang lebih responsif di Android (`android_ripple`) dan iOS.
5. **Kompilasi `.apk` Lokal Tanpa Antrian Cloud:**
   ```bash
   npx expo prebuild --platform android
   cd android && ./gradlew assembleRelease
   ```

---
name: android-kotlin-jetpack-compose-pro
description: "Skill lengkap pembuatan aplikasi Android Native menggunakan Kotlin dan Jetpack Compose (Material 3): arsitektur MVVM, State Hoisting, rememberSaveable, LazyColumn, Navigation Compose, dan Coroutines/StateFlow."
---

# Android Native (Kotlin & Jetpack Compose Material 3) Pro

## 5 Hukum Utama Jetpack Compose Modern
1. **Unidirectional Data Flow (UDF) & State Hoisting:**
   State diturunkan dari `ViewModel` ke Composable (`uiState`), sedangkan aksi pengguna dikirim ke atas melalui *lambda event* (`onAddClick: () -> Unit`).
2. **Gunakan `rememberSaveable` untuk State UI Sederhana:**
   Agar data input tidak hilang saat layar HP berputar (*configuration change* portrait ke landscape).
3. **Berikan `key` Unik pada `LazyColumn`:**
   ```kotlin
   LazyColumn {
       items(items = listLini, key = { it.id }) { item ->
           LineMetricCard(item = item)
       }
   }
   ```
4. **Jangan Pernah Menjalankan Operasi Database/Jaringan di Main Thread:**
   Gunakan `viewModelScope.launch(Dispatchers.IO)` untuk operasi berat.
5. **Gunakan `kits/mobile_apk_kit.py`:** Untuk men-*scaffold* struktur proyek Android Kotlin Jetpack Compose lengkap dengan `AndroidManifest.xml` dan `build.gradle.kts`.

#!/usr/bin/env python3
"""
mobile_apk_kit.py — Mesin Pembuat Proyek Aplikasi Android (.apk) Native (Kotlin Jetpack Compose)
dan Hybrid Web-to-APK (CapacitorJS / PWA) + Simulator UI Mobile Interaktif (.html).

Cara pakai:
  python3 kits/mobile_apk_kit.py spec.json output_dir_or_html
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import frontend_kit


def scaffold_android_project(spec: dict, project_dir: str) -> dict:
    p_dir = Path(project_dir)
    app_name = spec.get("app_name", "SmartOpsMobile")
    pkg_name = spec.get("package_name", "id.co.deepernnova.smartops")
    pkg_path = pkg_name.replace(".", "/")

    java_dir = p_dir / "app" / "src" / "main" / "java" / pkg_path
    res_dir = p_dir / "app" / "src" / "main" / "res" / "values"
    java_dir.mkdir(parents=True, exist_ok=True)
    res_dir.mkdir(parents=True, exist_ok=True)

    # 1. settings.gradle.kts
    (p_dir / "settings.gradle.kts").write_text(
        f'rootProject.name = "{app_name}"\ninclude(":app")\n', encoding="utf-8"
    )

    # 2. app/build.gradle.kts
    build_gradle = f"""plugins {{
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}}

android {{
    namespace = "{pkg_name}"
    compileSdk = 34

    defaultConfig {{
        applicationId = "{pkg_name}"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }}

    buildTypes {{
        release {{
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }}
    }}
    buildFeatures {{
        compose = true
    }}
    composeOptions {{
        kotlinCompilerExtensionVersion = "1.5.14"
    }}
    compileOptions {{
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }}
    kotlinOptions {{
        jvmTarget = "17"
    }}
}}

dependencies {{
    val composeBom = platform("androidx.compose:compose-bom:2024.06.00")
    implementation(composeBom)
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.2")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
}}
"""
    (p_dir / "app" / "build.gradle.kts").write_text(build_gradle, encoding="utf-8")

    # 3. AndroidManifest.xml
    manifest = f"""<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <application
        android:allowBackup="true"
        android:label="{app_name}"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.Light.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
"""
    (p_dir / "app" / "src" / "main" / "AndroidManifest.xml").write_text(manifest, encoding="utf-8")

    # 4. MainActivity.kt (Jetpack Compose Material 3)
    main_kt = f"""package {pkg_name}

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

data class LineMetric(val name: String, val target: Int, val actual: Int, val cpk: Double)

class MainActivity : ComponentActivity() {{
    override fun onCreate(savedInstanceState: Bundle?) {{
        super.onCreate(savedInstanceState)
        setContent {{
            MaterialTheme {{
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {{
                    SmartOpsScreen()
                }}
            }}
        }}
    }}
}}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SmartOpsScreen() {{
    var metrics by remember {{
        mutableStateOf(
            listOf(
                LineMetric("Lini 1 - Stamping", 4000, 4120, 1.41),
                LineMetric("Lini 2 - Assembly", 4000, 4350, 1.62),
                LineMetric("Lini 3 - Packaging", 4000, 3980, 1.34),
                LineMetric("Lini 4 - Finishing", 4200, 4510, 1.55)
            )
        )
    }}

    Scaffold(
        topBar = {{
            TopAppBar(title = {{ Text("{app_name} — Android Native", fontWeight = FontWeight.Bold) }})
        }}
    ) {{ innerPadding ->
        LazyColumn(
            modifier = Modifier
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {{
            items(metrics) {{ item ->
                val pct = if (item.target > 0) (item.actual * 100.0 / item.target) else 0.0
                ElevatedCard(modifier = Modifier.fillMaxWidth()) {{
                    Column(modifier = Modifier.padding(16.dp)) {{
                        Text(item.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Realisasi: ${{item.actual}} / ${{item.target}} Unit (${{String.format("%.1f", pct)}}%)")
                        Text("Indeks Kapabilitas Six Sigma Cpk: ${{item.cpk}}", color = MaterialTheme.colorScheme.primary)
                    }}
                }}
            }}
        }}
    }}
}}
"""
    (java_dir / "MainActivity.kt").write_text(main_kt, encoding="utf-8")

    # 5. Capacitor Config (untuk opsi konversi WebApp HTML ke APK dalam 3 perintah)
    cap_cfg = {
        "appId": pkg_name,
        "appName": app_name,
        "webDir": "www",
        "bundledWebRuntime": False,
        "server": {"androidScheme": "https"}
    }
    (p_dir / "capacitor.config.json").write_text(json.dumps(cap_cfg, indent=2), encoding="utf-8")

    # 6. Panduan Build APK Lengkap (Native Gradle, Flutter, React Native, dan Capacitor)
    guide = f"""# Panduan Build File `.apk` Android Siap Install ({app_name})

Proyek ini mendukung **2 Jalur Cepat** untuk menghasilkan file `.apk` yang siap di-install di HP Android:

## Jalur 1 — Build Native Android (Kotlin + Jetpack Compose) via CLI
1. Pastikan **JDK 17** dan **Android SDK Command-Line Tools** terpasang.
2. Jalankan perintah berikut di folder proyek ini:
   ```bash
   ./gradlew assembleDebug
   # Hasil APK Debug siap install ada di:
   # app/build/outputs/apk/debug/app-debug.apk
   ```
3. Untuk membuat **Release APK Tertandatangan (Signed APK)**:
   ```bash
   keytool -genkey -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias app-key
   ./gradlew assembleRelease
   ```

## Jalur 2 — Mengubah WebApp `.html` Menjadi `.apk` via CapacitorJS (Paling Cepat!)
Jika kamu memiliki file WebApp single-file `.html` (dari `frontend_kit.py` atau `game3d_kit.py`):
```bash
mkdir -p www && cp ../Dashboard_Interaktif_Operasional_Q3_2026.html www/index.html
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap copy android
cd android && ./gradlew assembleDebug
```
"""
    (p_dir / "BUILD_APK_GUIDE.md").write_text(guide, encoding="utf-8")
    return {"project_dir": str(p_dir), "package_name": pkg_name}


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "android_apk_starter"
    res = scaffold_android_project({}, target)
    print(f"OK -> {res['project_dir']}")

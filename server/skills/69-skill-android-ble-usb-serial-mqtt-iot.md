---
name: android-ble-usb-serial-mqtt-iot
description: "Skill pembuatan aplikasi Android untuk mengontrol dan memantau perangkat mikrokontroler IoT (ESP32, Arduino, PLC) melalui Bluetooth Low Energy (BLE GATT), USB Serial OTG, dan protokol MQTT/WebSocket."
---

# Android Industrial IoT App: BLE, USB Serial OTG & MQTT Dashboard Pro

## 4 Aturan Koneksi HP Android ke ESP32 / Mikrokontroler
1. **Izin Bluetooth Android 12+ (API 31+):** Wajib meminta `BLUETOOTH_SCAN` (dengan `usesPermissionFlags="neverForLocation"`) dan `BLUETOOTH_CONNECT` saat *runtime*.
2. **Buffer Paket Serial/BLE:** Data BLE GATT memiliki batas MTU (biasanya 20–512 byte). Kumpulkan potongan paket sampai menemukan karakter pembatas baris `\n` sebelum melakukan `JSONObject(line)` parsing.
3. **Reconnect Otomatis dengan Exponential Backoff:** Jika koneksi ESP32 terputus, jadwalkan percobaan koneksi ulang setelah `1s`, `2s`, `4s`, hingga maksimal `15s`.
4. **Foreground Service untuk Monitoring Kontinyu:** Gunakan `ForegroundService` dengan notifikasi tetap agar koneksi telemetri tidak dimatikan oleh penghemat baterai Android saat layar terkunci.

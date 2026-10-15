---
name: iot-esp32-embedded-c-pro
description: "Skill pemrograman Embedded Systems, ESP32, Arduino, FreeRTOS, dan Industrial IoT (C/C++). Mencakup arsitektur non-blocking millis(), filter sensor EMA/Median, kendali relay hysteresis, dan format JSON statis bebas fragmentasi heap."
---

# Embedded Systems, ESP32 & Industrial IoT Pro (C/C++)

## 5 Hukum Firmware Industri 24/7
1. **Non-Blocking `millis()` Loop:** Jangan pernah memakai `delay(>50)` di dalam `loop()`. Gunakan selisih waktu `if (nowMs - lastMs >= INTERVAL_MS)`.
2. **Bebas Heap Fragmentation:** Hindari penggabungan objek `String` di dalam loop cepat; gunakan `char buf[256]; snprintf(buf, sizeof(buf), ...);`.
3. **Filter Pembacaan Sensor:** Saring pembacaan `isnan()` dan terapkan *Exponential Moving Average* (`filtered = alpha * raw + (1 - alpha) * filtered`) sebelum memicu alarm.
4. **Hysteresis (Deadband) pada Relay/Aktuator:** Nyalakan pemanas/pendingin/alarm pada ambang atas (`>= 75.0 C`) dan matikan pada ambang bawah (`<= 72.0 C`) agar relay tidak rusak akibat *chattering*.
5. **Tipe Eksplisit:** Gunakan `uint8_t`, `uint16_t`, `uint32_t`, dan `constexpr`.

---
name: websockets-webrtc-sse-realtime-apps
description: "Skill pembuatan aplikasi web real-time menggunakan WebSocket (ws / Socket.IO), Server-Sent Events (EventSource), auto-reconnect exponential backoff, dan heartbeat ping-pong."
---

# Real-Time WebSockets, Server-Sent Events (SSE) & Telemetry Streaming Pro

## Klien WebSocket dengan Auto-Reconnect & Heartbeat
Selalu bungkus `new WebSocket(url)` di dalam manajer koneksi yang otomatis menyambung ulang dengan jeda bertahap (`1s`, `2s`, `4s`, maks `15s`) saat `onclose` terpanggil, serta mengantrikan pesan keluar saat koneksi sedang menyambung.

---
name: desktop-apps-tauri-electron-pyqt6
description: "Skill pembuatan aplikasi Desktop lintas platform (Windows .exe, macOS .dmg, Linux .AppImage) menggunakan Tauri (Rust + Web), Electron (ContextBridge IPC aman), dan Python GUI (PyQt6 / CustomTkinter)."
---

# Cross-Platform Desktop Apps: Tauri, Electron & Python GUI Pro

## 1. Keamanan Electron (`contextIsolation: true`)
Jangan pernah mengaktifkan `nodeIntegration: true` pada jendela yang memuat konten web. Gunakan script `preload.js` dengan `contextBridge.exposeInMainWorld('api', { ... })` untuk komunikasi IPC yang aman.

## 2. Python Desktop GUI (`PyQt6` / `Tkinter`)
Jangan menjalankan proses baca/tulis besar atau konversi file di *UI Thread* utama agar jendela tidak membeku (*"Not Responding"*). Jalankan pekerjaan berat di `QThread` atau `threading.Thread(..., daemon=True)` lalu kirim pembaruan progres ke UI.

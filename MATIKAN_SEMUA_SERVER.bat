@echo off
title DeeperNova - Mematikan Semua Server
echo ===================================================
echo   Mematikan Semua Server dan Membersihkan RAM
echo ===================================================
echo 1. Menghentikan proses Node.js dan Cloudflared...
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM cloudflared.exe /T 2>nul
echo 2. Membersihkan Working Set RAM...
powershell -ExecutionPolicy Bypass -File "%~dp0scratch\clean_ram.ps1"
echo.
echo ===================================================
echo   Semua server telah nonaktif dan RAM telah lega!
echo ===================================================
pause

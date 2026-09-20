@echo off
title Deepernova AI Ecosystem - Stop All Services
cd /d "%~dp0"
color 0C

echo ===============================================================================
echo          MEMATIKAN SEMUA SERVICE DEEPERNOVA & CLOUDFLARE TUNNEL               
echo ===============================================================================
echo.
echo Mematikan cloudflared.exe dan proses pada port 3000, 3001, 5000, 5173, 5174...
taskkill /f /im cloudflared.exe >nul 2>&1
powershell -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 3000, 3001, 5000, 5173, 5174 } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host 'Menghentikan proses PID' $_.OwningProcess 'pada port' $_.LocalPort }"
echo.
echo ===============================================================================
echo Semua service dan tunnel telah berhasil dihentikan.
echo ===============================================================================
pause

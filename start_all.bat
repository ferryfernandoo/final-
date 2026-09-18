@echo off
setlocal enabledelayedexpansion
title Deepernova AI Ecosystem - Master 1-Click Starter
cd /d "%~dp0"
color 0B

echo ===============================================================================
echo          DEEPERNOVA AI + SEARCH ENGINE + ORDER DTE MASTER STARTER              
echo ===============================================================================
echo.
echo Direktori Terdeteksi:
echo  - Deepernova AI    : %~dp0
echo  - Search Engine    : C:\deepernova-search-main
echo  - Order DTE Server : F:\order dte\server
echo  - Order DTE User   : F:\order dte\user
echo.
echo ===============================================================================
echo Pilih Mode Startup:
echo  [1] Start Semua Service Lokal (Jendela Terbuka & Terpantau) - REKOMENDASI
echo  [2] Start + Cloudflare Tunnel Auto-Deploy Vercel (auto_start_all.mjs)
echo  [3] Tutup / Matikan Semua Service Terkait (Port 3000, 3001, 5000, 5173, 5174)
echo ===============================================================================
echo.

set "CHOICE=1"
set /p "CHOICE=Masukkan pilihan [1, 2, atau 3] (Default: 1): "

if "%CHOICE%"=="2" goto mode_deploy
if "%CHOICE%"=="3" goto mode_kill
goto mode_local

:mode_local
echo.
echo -------------------------------------------------------------------------------
echo [1/5] Menyalakan Deepernova Search Engine (Port 3000)...
if exist "C:\deepernova-search-main" (
    pushd "C:\deepernova-search-main"
    start "Deepernova Search Engine (Port 3000)" cmd /k "node --max-old-space-size=1536 --expose-gc src/server.js"
    popd
) else (
    echo [SKIP] Folder C:\deepernova-search-main tidak ditemukan.
)

timeout /t 2 /nobreak >nul

echo [2/5] Menyalakan Deepernova AI Backend (Port 3001)...
pushd "%~dp0"
start "Deepernova AI Backend (Port 3001)" cmd /k "node server/server.js"
popd

timeout /t 2 /nobreak >nul

echo [3/5] Menyalakan Deepernova AI Frontend Vite (Port 5174)...
pushd "%~dp0"
start "Deepernova AI Frontend (Port 5174)" cmd /k "npm run dev"
popd

timeout /t 2 /nobreak >nul

echo [4/5] Menyalakan Order DTE Backend Server (Port 5000)...
if exist "F:\order dte\server" (
    pushd "F:\order dte\server"
    start "Order DTE Backend Server (Port 5000)" cmd /k "node server.js"
    popd
) else (
    echo [SKIP] Folder F:\order dte\server tidak ditemukan.
)

timeout /t 2 /nobreak >nul

echo [5/5] Menyalakan Order DTE User Frontend (Port 5173)...
if exist "F:\order dte\user" (
    pushd "F:\order dte\user"
    start "Order DTE User Frontend (Port 5173)" cmd /k "npm run dev"
    popd
) else (
    echo [SKIP] Folder F:\order dte\user tidak ditemukan.
)

echo.
echo ===============================================================================
echo                    SEMUA LAYANAN BERHASIL DINYALAKAN!                          
echo ===============================================================================
echo.
echo  [Web App]      Deepernova AI Landing Page : http://localhost:5174
echo  [Search]       Deepernova Search Engine   : http://localhost:3000
echo  [Order DTE]    Order DTE User Web         : http://localhost:5173
echo  [AI API]       Deepernova AI Backend      : http://localhost:3001
echo  [Order API]    Order DTE Backend API      : http://localhost:5000
echo.
echo ===============================================================================
echo Masing-masing service berjalan di jendela command prompt terpisah.
echo Anda dapat melihat log output, request masuk, atau pesan error secara real-time.
echo.
echo Membuka Deepernova AI Landing Page di browser...
start http://localhost:5174
goto end

:mode_deploy
echo.
echo Menjalankan Deepernova Master Orchestrator dengan Cloudflare Tunnel...
node scripts\auto_start_all.mjs
goto end

:mode_kill
echo.
echo Mematikan proses node pada port 3000, 3001, 5000, 5173, 5174...
powershell -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 3000, 3001, 5000, 5173, 5174 } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host 'Menghentikan proses PID' $_.OwningProcess 'pada port' $_.LocalPort }"
echo Selesai.
goto end

:end
echo.
pause

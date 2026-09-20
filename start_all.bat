@echo off
setlocal enabledelayedexpansion
title 🚀 DEEPERNOVA AI - Auto Start All
cd /d "%~dp0"
color 0A

:: ============================================================
::  CHECK ADMIN (optional but helps kill processes on ports)
:: ============================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    color 0E
    echo [WARN] Tidak berjalan sebagai Administrator.
    echo        Jika ada proses yang tidak bisa di-kill, jalankan sebagai Admin.
    echo.
    color 0A
    timeout /t 2 /nobreak >nul
)

cls
echo.
echo  ================================================================
echo     DEEPERNOVA AI ECOSYSTEM  -  1-CLICK AUTO DEPLOYER
echo  ================================================================
echo   Direktori:
echo     AI Backend   : %~dp0
echo     Search Engine: C:\deepernova-search-main
echo     DTE Server   : F:\order dte\server
echo     DTE Frontend : F:\order dte\user
echo  ================================================================
echo.

:: ============================================================
::  STEP 1: Pastikan Node.js tersedia
:: ============================================================
echo [1/7] Memeriksa Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js tidak ditemukan!
    echo         Download dari: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo        Node.js ditemukan: %NODE_VER%
echo.

:: ============================================================
::  STEP 2: Bersihkan sisa proses lama di semua port
:: ============================================================
echo [2/7] Membersihkan proses lama di port 3000, 3001, 5000, 5173, 5174...

:: Kill cloudflared lama
taskkill /f /im cloudflared.exe >nul 2>&1

:: Kill proses di port 3000
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%p >nul 2>&1
)

:: Kill proses di port 3001
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%p >nul 2>&1
)

:: Kill proses di port 5000
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":5000 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%p >nul 2>&1
)

:: Kill proses di port 5173
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%p >nul 2>&1
)

:: Kill proses di port 5174
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":5174 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%p >nul 2>&1
)

echo        Port bersih.
timeout /t 2 /nobreak >nul
echo.

:: ============================================================
::  STEP 3: Cek & install npm dependencies jika belum ada
:: ============================================================
echo [3/7] Memeriksa dependencies Deepernova AI...
if not exist "node_modules" (
    echo        node_modules tidak ditemukan, menjalankan npm install...
    call npm install --prefer-offline
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] npm install gagal!
        pause
        exit /b 1
    )
    echo        Dependencies berhasil diinstall.
) else (
    echo        Dependencies sudah ada.
)
echo.

:: ============================================================
::  STEP 4: Cek dependencies Search Engine
:: ============================================================
echo [4/7] Memeriksa dependencies Search Engine...
if exist "C:\deepernova-search-main" (
    if not exist "C:\deepernova-search-main\node_modules" (
        echo        Menjalankan npm install di Search Engine...
        pushd "C:\deepernova-search-main"
        call npm install --prefer-offline >nul 2>&1
        popd
        echo        Search Engine dependencies selesai.
    ) else (
        echo        Search Engine dependencies sudah ada.
    )
) else (
    echo        [SKIP] Folder Search Engine tidak ditemukan di C:\deepernova-search-main
)
echo.

:: ============================================================
::  STEP 5: Cek dependencies Order DTE
:: ============================================================
echo [5/7] Memeriksa dependencies Order DTE...
if exist "F:\order dte\user" (
    if not exist "F:\order dte\user\node_modules" (
        echo        Menjalankan npm install di DTE User Frontend...
        pushd "F:\order dte\user"
        call npm install --prefer-offline >nul 2>&1
        popd
        echo        DTE User Frontend dependencies selesai.
    ) else (
        echo        DTE User Frontend dependencies sudah ada.
    )
) else (
    echo        [SKIP] Folder DTE User tidak ditemukan.
)
if exist "F:\order dte\server" (
    if not exist "F:\order dte\server\node_modules" (
        echo        Menjalankan npm install di DTE Server...
        pushd "F:\order dte\server"
        call npm install --prefer-offline >nul 2>&1
        popd
        echo        DTE Server dependencies selesai.
    ) else (
        echo        DTE Server dependencies sudah ada.
    )
) else (
    echo        [SKIP] Folder DTE Server tidak ditemukan.
)
echo.

:: ============================================================
::  STEP 6: Cek cloudflared.exe
:: ============================================================
echo [6/7] Memeriksa cloudflared.exe...
if not exist "bin\cloudflared.exe" (
    color 0E
    echo [WARN] bin\cloudflared.exe tidak ditemukan!
    echo        Tunnel Cloudflare tidak akan aktif.
    echo        Download dari: https://github.com/cloudflare/cloudflared/releases
    echo        Letakkan di: %~dp0bin\cloudflared.exe
    color 0A
    echo.
    timeout /t 3 /nobreak >nul
) else (
    echo        cloudflared.exe ditemukan.
)
echo.

:: ============================================================
::  STEP 7: Jalankan Auto-Start Orchestrator (FULL AUTO)
:: ============================================================
echo [7/7] Menjalankan Auto-Start Orchestrator...
echo.
echo  ================================================================
echo   AUTO-CONFIG + BUILD + PUSH sedang berjalan...
echo   Proses ini akan:
echo     - Nyalakan semua service (Search, Backend, Frontend, DTE)
echo     - Buka Cloudflare Tunnel
echo     - Update .env, apiConfig.js, vercel.json, LandingPage.jsx
echo     - Build frontend (npm run build)
echo     - Git commit dan push ke GitHub (Vercel live otomatis)
echo  ================================================================
echo.

node scripts\auto_start_all.mjs

:: ============================================================
::  SELESAI / ERROR HANDLING
:: ============================================================
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  ================================================================
    echo   [ERROR] Auto-Start gagal dengan kode: %errorlevel%
    echo   Cek output di atas untuk detail error.
    echo  ================================================================
    echo.
) else (
    color 0A
    echo.
    echo  ================================================================
    echo   SEMUA LAYANAN AKTIF DAN TERKONFIGURASI!
    echo   Buka browser: http://localhost:5174
    echo  ================================================================
    echo.
)

pause

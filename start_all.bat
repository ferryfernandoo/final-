@echo off
setlocal enabledelayedexpansion
title DEEPERNOVA AI - 1-Click Auto Deploy
cd /d "%~dp0"
color 0A

cls
echo.
echo  ================================================================
echo     DEEPERNOVA AI ECOSYSTEM  -  1-CLICK AUTO DEPLOYER
echo  ================================================================
echo.
echo   Direktori:
echo     AI Project    : %~dp0
echo     Search Engine : C:\deepernova-search-main
echo     DTE Server    : F:\order dte\server
echo     DTE Frontend  : F:\order dte\user
echo.
echo   Proses otomatis:
echo     1. Nyalakan semua server (Search, Backend, Frontend, DTE)
echo     2. Buka Cloudflare Tunnel + tangkap URL publik
echo     3. Update konfigurasi (.env, apiConfig, vercel.json)
echo     4. Build frontend (npm run build)
echo     5. Git commit + push ke GitHub (Vercel live)
echo.
echo  ================================================================
echo.

:: Cek Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js tidak ditemukan!
    echo         Download dari: https://nodejs.org/
    pause
    exit /b 1
)

:: Jalankan orchestrator
node scripts\auto_start_all.mjs

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Auto-Start gagal! Cek output di atas.
    echo.
)

pause

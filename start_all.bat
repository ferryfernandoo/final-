@echo off
setlocal enabledelayedexpansion
title Deepernova AI Ecosystem - 1-Click Auto Cloudflare & GitHub Deployer
cd /d "%~dp0"
color 0B

echo ===============================================================================
echo          DEEPERNOVA AI + SEARCH ENGINE + ORDER DTE AUTO-DEPLOYER               
echo ===============================================================================
echo.
echo Direktori Terdeteksi:
echo  - Deepernova AI    : %~dp0
echo  - Search Engine    : C:\deepernova-search-main
echo  - Order DTE Server : F:\order dte\server
echo  - Order DTE User   : F:\order dte\user
echo.
echo ===============================================================================
echo Menjalankan Auto-Deployer:
echo  1. Menyalakan Search Engine (Port 3000)
echo  2. Menyalakan Deepernova AI Backend (Port 3001)
echo  3. Menyalakan Deepernova AI Frontend Vite (Port 5174)
echo  4. Menyalakan Order DTE Backend (Port 5000)
echo  5. Menyalakan Order DTE User Frontend (Port 5173)
echo  6. Menyalakan 3 Cloudflare Tunnel (AI, Search Engine, Order DTE)
echo  7. Menangkap URL Publik trycloudflare.com
echo  8. Mengupdate Konfigurasi (.env, Vercel, LandingPage, DTE, Search)
echo  9. Build Bundle Frontend (npm run build)
echo 10. Otomatis Git Commit & Push ke GitHub (Vercel Live)
echo ===============================================================================
echo.

node scripts\auto_start_all.mjs

pause

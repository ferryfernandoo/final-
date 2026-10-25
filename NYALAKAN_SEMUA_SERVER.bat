@echo off
title DeeperNova - Menyalakan Semua Server
echo ===================================================
echo   Menyalakan Seluruh Ekosistem Server DeeperNova
echo ===================================================
cd /d "%~dp0"
echo Menjalankan: npm run start:all
npm run start:all
pause

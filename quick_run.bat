@echo off
cls
echo.
echo ========================================
echo   RISBOW Backend - Quick Start
echo ========================================
echo.

echo [1/2] Building...
call npm run build --silent
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo [2/2] Starting server...
echo.
set CLUSTER_MODE=true
node dist/main.js

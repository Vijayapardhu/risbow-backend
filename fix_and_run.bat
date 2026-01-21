@echo off
echo.
echo ======================================
echo  RISBOW Backend - Build and Run
echo ======================================
echo.

echo [1/2] Rebuilding application...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed!
    exit /b 1
)

echo.
echo [2/2] Starting application with cluster mode...
echo.
set CLUSTER_MODE=true
node dist/main.js

@echo off
cls
echo.
echo ==========================================
echo   RISBOW Backend - Clean Start
echo ==========================================
echo.

echo [1/3] Stopping all Node processes...
taskkill /F /IM node.exe 2>nul
if errorlevel 1 (
    echo     No existing Node processes found.
) else (
    echo     All Node processes stopped.
)

echo.
echo [2/3] Waiting for database connections to close...
timeout /t 5 /nobreak >nul

echo.
echo [3/3] Starting server (single instance)...
echo     Press Ctrl+C to stop the server
echo.
echo ==========================================
echo.

set CLUSTER_MODE=false
node dist/main.js

@echo off
cls
echo.
echo ========================================
echo   RISBOW Backend - Starting Server
echo ========================================
echo.

echo Starting single instance mode...
echo (Cluster mode disabled to prevent database connection limit)
echo.

node dist/main.js

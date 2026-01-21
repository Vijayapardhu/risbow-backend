@echo off
echo.
echo Killing all Node.js processes...
taskkill /F /IM node.exe 2>nul
if errorlevel 1 (
    echo No Node.js processes found.
) else (
    echo All Node.js processes terminated.
)
echo.
echo Waiting for connections to close...
timeout /t 3 /nobreak >nul
echo.
echo Starting server in single instance mode...
node dist/main.js

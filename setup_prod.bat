@echo off
echo ==========================================
echo RISBOW Backend - Production Setup
echo ==========================================

echo [1/3] Installing Dependencies...
call npm install
if %errorlevel% neq 0 exit /b %errorlevel%

echo [2/3] Generating Database Client...
call npx prisma generate
if %errorlevel% neq 0 exit /b %errorlevel%

echo [3/3] Building Application...
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%

echo ==========================================
echo Setup Complete!
echo Run 'start_server.bat' to launch.
echo ==========================================
pause

@echo off
echo === RISBOW Backend Build Fix Script ===
echo.

echo Step 1: Regenerating Prisma Client (CRITICAL)...
echo This will regenerate all TypeScript types from the schema.
call npx prisma generate
if errorlevel 1 (
    echo ERROR: Prisma generate failed!
    echo Please check your schema.prisma file for syntax errors.
    pause
    exit /b 1
)
echo Prisma Client generated successfully!
echo.

echo Step 2: Cleaning build directory...
if exist dist rmdir /s /q dist
if exist node_modules\.prisma rmdir /s /q node_modules\.prisma
echo Build directory cleaned!
echo.

echo Step 3: Running TypeScript build...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed! Check errors above.
    pause
    exit /b 1
)
echo Build completed successfully!
echo.

echo Step 4: Committing changes...
git add .
git commit -m "Fix banner controller and add payment status endpoint"
if errorlevel 1 (
    echo Note: No changes to commit or commit failed
)
echo.

echo Step 5: Pushing to master...
git push origin master
if errorlevel 1 (
    echo ERROR: Push failed!
    pause
    exit /b 1
)
echo.

echo === ALL DONE! ===
echo.
echo The following changes were applied:
echo - Fixed banner controller to remove non-existent vendor relation
echo - Restored user relation in BannerImpressionLedger (after Prisma regeneration)
echo - Added payment status update endpoint for admin
echo - Added updatePaymentStatus service method
echo.
pause

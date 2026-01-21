@echo off
echo ============================================
echo Clean Database and Apply Schema
echo ============================================
echo.
echo Step 1: Deleting failed migration folder...
rmdir /s /q "prisma\migrations\20260121043850_jan_21" 2>nul
echo.
echo Step 2: Pushing schema to database (bypasses migration)...
npx prisma db push --force-reset --accept-data-loss
echo.
echo Step 3: Generating Prisma Client...
npx prisma generate
echo.
echo ============================================
echo Done! Database reset and schema applied.
echo ============================================
echo.
echo WARNING: This deleted all data. Run seed scripts if needed.
pause

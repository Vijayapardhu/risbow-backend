@echo off
echo ============================================
echo Pushing Schema Updates to Database
echo ============================================
echo.
echo Deleting any failed migrations...
rmdir /s /q "prisma\migrations\20260121043850_jan_21" 2>nul
echo.
echo Step 1: Pushing schema to database...
npx prisma db push
echo.
echo Step 2: Generating Prisma Client...
npx prisma generate
echo.
echo ============================================
echo Done! All TypeScript errors should be fixed.
echo ============================================
pause

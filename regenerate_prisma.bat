@echo off
echo ============================================
echo Regenerating Prisma Client
echo ============================================
echo.
echo This will push schema changes and regenerate the Prisma Client
echo to fix the remaining 2 TypeScript errors.
echo.
pause
echo.
echo Step 1: Pushing schema to database...
npx prisma db push
echo.
echo Step 2: Generating Prisma Client...
npx prisma generate
echo.
echo ============================================
echo Done! Please wait for TypeScript to recompile.
echo ============================================
echo.
echo The errors should disappear in a few seconds.
echo If not, restart your dev server: npm run start:dev
echo.
pause

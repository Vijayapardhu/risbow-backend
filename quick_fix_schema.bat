@echo off
echo ============================================
echo Quick Fix: Push Schema to Database
echo ============================================
echo.
echo This will push the schema changes directly to your database
echo without creating migrations. Safe for development.
echo.
npx prisma db push --skip-generate
echo.
echo Generating Prisma Client...
npx prisma generate
echo.
echo ============================================
echo Done! Your database is now in sync.
echo ============================================
pause

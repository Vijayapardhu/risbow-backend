@echo off
echo ============================================
echo Fixing Migration Issues
echo ============================================
echo.
echo Option 1: Generate Prisma Client (if schema is correct)
echo npx prisma generate
echo.
echo Option 2: Create migration without applying (safe)
echo npx prisma migrate dev --create-only --name fix_review_and_product_indexes
echo.
echo Option 3: Push schema directly to database (skip migrations)
echo npx prisma db push --accept-data-loss
echo.
echo Option 4: Reset database and apply all migrations (WARNING: deletes data)
echo npx prisma migrate reset --force
echo.
echo ============================================
echo Which option do you want to run?
echo ============================================
echo.
set /p choice="Enter 1, 2, 3, or 4: "

if "%choice%"=="1" (
    echo Running: npx prisma generate
    npx prisma generate
)

if "%choice%"=="2" (
    echo Running: npx prisma migrate dev --create-only --name fix_review_and_product_indexes
    npx prisma migrate dev --create-only --name fix_review_and_product_indexes
)

if "%choice%"=="3" (
    echo Running: npx prisma db push --accept-data-loss
    npx prisma db push --accept-data-loss
)

if "%choice%"=="4" (
    echo Running: npx prisma migrate reset --force
    npx prisma migrate reset --force
)

echo.
echo ============================================
echo Done!
echo ============================================
pause

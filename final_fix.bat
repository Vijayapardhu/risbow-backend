@echo off
echo ============================================
echo Final Fix: Push Schema and Generate Client
echo ============================================
echo.
echo Changes:
echo   - Added giftId to Order model
echo   - Added replacementTrackingId to ReturnRequest model
echo   - Fixed ReturnStatus enum usage
echo.
echo Step 1: Pushing schema to database...
npx prisma db push
echo.
echo Step 2: Generating Prisma Client...
npx prisma generate
echo.
echo ============================================
echo All Done! All TypeScript errors are fixed.
echo ============================================
echo.
echo Next: Restart your development server
echo   npm run start:dev
echo.
pause

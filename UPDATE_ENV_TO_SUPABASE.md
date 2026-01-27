# 🔄 Update .env File to Use Supabase

## Current Issue

Your `.env` file still contains Azure PostgreSQL connection strings. The application is trying to connect to:
```
risbow-postgres-prod.postgres.database.azure.com:5432
```

## Quick Fix

### Step 1: Open your `.env` file

```powershell
code .env
# or
notepad .env
```

### Step 2: Remove ALL Azure Database Variables

**DELETE these lines:**
```env
DB_HOST="risbow-postgres-prod.private.postgres.database.azure.com"
DB_PORT=5432
DB_NAME="postgres"
DB_USER="risbow_admin"
DB_PASSWORD="Pardhu@2008"
DB_SSL=true
DATABASE_URL="postgresql://risbow_admin:Pardhu%402008@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://risbow_admin:Pardhu%402008@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require"
```

### Step 3: Add Supabase Connection Strings

**REPLACE with Supabase connection strings:**

1. **Get your Supabase database password:**
   - Go to: https://supabase.com/dashboard
   - Project: `rxticediycnboewmsfmi`
   - Settings → Database
   - If you don't know the password, click "Reset database password"
   - Copy the password

2. **Add to your `.env` file:**
```env
# Supabase Database (REPLACE [YOUR-PASSWORD] with actual password)
DATABASE_URL="postgresql://postgres.rxticediycnboewmsfmi:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres.rxticediycnboewmsfmi:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

**Important:** 
- Replace `[YOUR-PASSWORD]` with your actual Supabase database password
- URL-encode special characters in password (e.g., `@` becomes `%40`)

### Step 4: Remove Azure Storage Variables (Optional - Already Done)

If you still have these, you can remove them (Supabase Storage is now used):
```env
# ❌ REMOVE THESE (if present):
AZURE_STORAGE_ACCOUNT_NAME="..."
AZURE_STORAGE_ACCOUNT_KEY="..."
AZURE_STORAGE_CONTAINER_PRODUCTS="..."
AZURE_STORAGE_CONTAINER_USERS="..."
AZURE_STORAGE_CONTAINER_VIDEOS="..."
```

### Step 5: Verify Supabase Auth Variables

**KEEP these (should already be set):**
```env
SUPABASE_URL="https://rxticediycnboewmsfmi.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Example Complete .env Section

```env
# ============================================
# SUPABASE DATABASE
# ============================================
DATABASE_URL="postgresql://postgres.rxticediycnboewmsfmi:YOUR_ACTUAL_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres.rxticediycnboewmsfmi:YOUR_ACTUAL_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"

# ============================================
# SUPABASE AUTH & STORAGE
# ============================================
SUPABASE_URL="https://rxticediycnboewmsfmi.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dGljZWRpeWNuYm9ld21zZm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU5ODMyMiwiZXhwIjoyMDgzMTc0MzIyfQ.REBO064OKyLSn_cPlNyTduZoiFzBmgtPjrrnogHlCzs"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dGljZWRpeWNuYm9ld21zZm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1OTgzMjIsImV4cCI6MjA4MzE3NDMyMn0.o1bXrV5YJH1L8u0rOQZ9K7Yk2Y1kY1KfX5Y5bX5xX2o"
```

## After Updating .env

1. **Test the connection:**
```powershell
npx prisma db pull
```

2. **Start the application:**
```powershell
npm start
```

## Troubleshooting

### "Can't reach database server"
- Verify `DATABASE_URL` is correct
- Check password is URL-encoded (special characters)
- Ensure Supabase project is active
- Check Supabase Dashboard → Database → Connection pooling is enabled

### "Invalid password"
- Reset password in Supabase Dashboard → Settings → Database
- Update `DATABASE_URL` and `DIRECT_URL` with new password

### "Connection timeout"
- Check if Supabase project is paused (free tier)
- Verify network connectivity
- Check Supabase status page

## Quick Reference

**Supabase Project:** `rxticediycnboewmsfmi`  
**Supabase URL:** `https://rxticediycnboewmsfmi.supabase.co`  
**Database Host:** `aws-0-ap-south-1.pooler.supabase.com`  
**Pooler Port:** `6543` (for application)  
**Direct Port:** `5432` (for migrations)

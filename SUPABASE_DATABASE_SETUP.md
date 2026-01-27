# Supabase Database Setup Guide

## Overview

This guide shows how to use **Supabase PostgreSQL** as your database and **Azure Blob Storage** for file storage.

## Architecture

- **Database**: Supabase PostgreSQL (managed PostgreSQL with public access)
- **Storage**: Azure Blob Storage (for all file uploads)
- **Auth**: Supabase Auth (for OTP/authentication)

## Step 1: Get Supabase Database Connection String

### From Supabase Dashboard

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project: `rxticediycnboewmsfmi`

2. **Get Connection String:**
   - Go to **Settings** → **Database**
   - Scroll to **Connection string**
   - Select **URI** tab
   - Copy the connection string

   It will look like:
   ```
   postgresql://postgres.rxticediycnboewmsfmi:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```

3. **For Prisma (Direct Connection):**
   - Use the **Direct connection** (not pooler) for migrations
   - Go to **Connection string** → **Direct connection**
   - Copy the connection string

   Example:
   ```
   postgresql://postgres.rxticediycnboewmsfmi:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
   ```

### Connection String Formats

#### For Application (Pooler - Recommended):
```env
DATABASE_URL=postgresql://postgres.rxticediycnboewmsfmi:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

#### For Migrations (Direct Connection):
```env
DIRECT_URL=postgresql://postgres.rxticediycnboewmsfmi:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
```

⚠️ **Replace `[YOUR-PASSWORD]`** with your actual Supabase database password.

## Step 2: Update Environment Variables

### Local Development (.env)

Create or update `risbow-backend/.env`:

```env
# ============================================
# SUPABASE DATABASE
# ============================================
# Use Supabase PostgreSQL instead of Azure PostgreSQL
DATABASE_URL=postgresql://postgres.rxticediycnboewmsfmi:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require

# Direct connection for migrations (optional, but recommended)
DIRECT_URL=postgresql://postgres.rxticediycnboewmsfmi:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require

# ============================================
# SUPABASE AUTH (Already configured)
# ============================================
SUPABASE_URL=https://rxticediycnboewmsfmi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dGljZWRpeWNuYm9ld21zZm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU5ODMyMiwiZXhwIjoyMDgzMTc0MzIyfQ.REBO064OKyLSn_cPlNyTduZoiFzBmgtPjrrnogHlCzs
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dGljZWRpeWNuYm9ld21zZm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1OTgzMjIsImV4cCI6MjA4MzE3NDMyMn0.o1bXrV5YJH1L8u0rOQZ9K7Yk2Y1kY1KfX5Y5bX5xX2o

# ============================================
# AZURE BLOB STORAGE (For file uploads)
# ============================================
AZURE_STORAGE_ACCOUNT_NAME=risbowstorageprod
AZURE_STORAGE_ACCOUNT_KEY=your-azure-storage-key-here
AZURE_STORAGE_CONTAINER_PRODUCTS=products
AZURE_STORAGE_CONTAINER_USERS=users
AZURE_STORAGE_CONTAINER_VIDEOS=videos

# ============================================
# OTHER CONFIGURATION
# ============================================
NODE_ENV=development
PORT=3000
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRY=7d

# Redis (Optional - for queues/caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TLS=false
REDIS_PASSWORD=
```

## Step 3: Update Prisma Schema (If Needed)

Your `prisma/schema.prisma` should already support Supabase. Verify:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // directUrl is optional - only needed when using connection poolers
  // For Supabase, you can use DIRECT_URL for migrations
  directUrl = env("DIRECT_URL")
}
```

If `directUrl` is commented out, uncomment it for Supabase migrations.

## Step 4: Run Database Migrations

```powershell
# 1. Generate Prisma Client
npx prisma generate

# 2. Run migrations (uses DIRECT_URL if set, otherwise DATABASE_URL)
npx prisma migrate deploy

# Or for development (creates migration files):
npx prisma migrate dev
```

## Step 5: Verify Connection

```powershell
# Test connection with Prisma
npx prisma db pull

# Or test with psql
psql $env:DATABASE_URL -c "SELECT version();"
```

## Step 6: Start Application

```powershell
npm start
```

The application should now:
- ✅ Connect to Supabase PostgreSQL database
- ✅ Use Azure Blob Storage for file uploads
- ✅ Use Supabase Auth for OTP/authentication

## Azure Blob Storage Configuration

Azure Blob Storage is already configured in your codebase:

### Containers Used:
- `products` - Product images
- `users` - User avatars and documents
- `videos` - Video uploads (e.g., packing proof videos)

### Verify Storage Setup:

1. **Check Azure Storage Account:**
   - Account Name: `risbowstorageprod`
   - Get the access key from Azure Portal

2. **Update Environment Variables:**
   ```env
   AZURE_STORAGE_ACCOUNT_NAME=risbowstorageprod
   AZURE_STORAGE_ACCOUNT_KEY=your-actual-key-here
   ```

3. **Containers are created automatically** by `AzureStorageService` when files are uploaded.

## Supabase vs Azure PostgreSQL

### Advantages of Supabase:
- ✅ **Public access by default** - Easy to connect from localhost
- ✅ **Free tier available** - Good for development
- ✅ **Built-in Auth** - OTP, user management included
- ✅ **Real-time features** - WebSocket support (if needed)
- ✅ **Dashboard** - Easy database management UI
- ✅ **Automatic backups** - Managed service

### When to Use Each:
- **Supabase**: Development, staging, small to medium production
- **Azure PostgreSQL**: Large scale production, enterprise requirements, VNet integration needed

## Troubleshooting

### "Connection refused" or "Can't reach database server"
- Check if Supabase project is active
- Verify connection string is correct
- Check if password is URL-encoded (special characters)

### "SSL connection required"
- Ensure `?sslmode=require` is in connection string
- Supabase requires SSL connections

### "Authentication failed"
- Verify database password in connection string
- Check if password contains special characters (URL-encode them)
- Reset password in Supabase Dashboard if needed

### "Pooler connection limit exceeded"
- Use direct connection for migrations: `DIRECT_URL`
- Reduce `connection_limit` in pooler URL
- Or use direct connection for application too

### Migrations fail with pooler
- Use `DIRECT_URL` for migrations (port 5432, not 6543)
- Or run migrations from Supabase Dashboard SQL Editor

## Connection String Tips

### URL Encoding Special Characters:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`

Example:
```
Password: P@ssw0rd#123
Encoded:  P%40ssw0rd%23123
```

## Security Best Practices

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use environment variables** - Don't hardcode credentials
3. **Rotate passwords regularly** - Update in Supabase Dashboard
4. **Use service role key only in backend** - Never expose in frontend
5. **Enable Row Level Security (RLS)** - In Supabase Dashboard

## Next Steps

1. ✅ Get Supabase database connection string
2. ✅ Update `.env` with Supabase `DATABASE_URL`
3. ✅ Verify Azure Blob Storage credentials
4. ✅ Run migrations: `npx prisma migrate dev`
5. ✅ Start application: `npm start`

## Summary

- **Database**: Supabase PostgreSQL (public access, easy localhost connection)
- **Storage**: Azure Blob Storage (configured and ready)
- **Auth**: Supabase Auth (OTP, user management)

This setup gives you:
- ✅ Easy localhost access (no VNet/private endpoint issues)
- ✅ Managed database (backups, scaling handled by Supabase)
- ✅ Azure Blob Storage for reliable file storage
- ✅ Integrated authentication system

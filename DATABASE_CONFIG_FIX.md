# Database Configuration Fix

## Problem

The application was failing to start with:
```
PrismaClientConstructorValidationError: Invalid value undefined for datasource "db" provided to Prismaclient constructor.
```

This occurred because `DATABASE_URL` was not set and the individual `DB_*` variables were also incomplete or missing.

## Solution

Added validation in `PrismaService` to:
- ✅ Check if `DATABASE_URL` is set
- ✅ If not, try to construct it from individual `DB_*` variables
- ✅ Fail fast with a clear error message if neither is configured
- ✅ Provide helpful guidance on what needs to be set

## Required Configuration

### Option 1: Full Connection String (Recommended)

Set `DATABASE_URL` in Azure App Service:

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

### Option 2: Individual Variables

Set these individual variables in Azure App Service:

```env
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=postgres
DB_PORT=5432
DB_SSL=true
```

The `PrismaService` will automatically construct `DATABASE_URL` from these variables.

## Azure App Service Configuration

### For Azure PostgreSQL

Based on your Azure setup, you should have:

```env
DATABASE_URL=postgresql://risbow_admin:Pardhu%402008@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require
```

Or using individual variables:

```env
DB_HOST=risbow-postgres-prod.postgres.database.azure.com
DB_USER=risbow_admin
DB_PASSWORD=Pardhu@2008
DB_NAME=postgres
DB_PORT=5432
DB_SSL=true
```

## Error Messages

### Before Fix
```
PrismaClientConstructorValidationError: Invalid value undefined for datasource "db"
```

### After Fix
```
❌ Database connection is not configured!

Please set one of the following:
  1. DATABASE_URL (full connection string)
  2. Or individual variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_SSL

Example DATABASE_URL:
  postgresql://user:password@host:5432/database?sslmode=require
```

## Verification

After setting the environment variables:

1. **Check startup logs:**
   ```
   ✅ Database connected successfully
   ```

2. **If using individual variables:**
   ```
   Constructed DATABASE_URL from individual environment variables
   ✅ Database connected successfully
   ```

## Troubleshooting

### "Database connection is not configured"
- Check that `DATABASE_URL` is set in Azure App Service
- Or verify all `DB_*` variables are set
- Check for typos in variable names

### "Can't reach database server"
- Verify database host is correct
- Check firewall rules allow Azure App Service IP
- Verify credentials are correct
- Check if using private endpoint (requires VPN/Bastion)

### "SSL connection required"
- Set `DB_SSL=true` or add `?sslmode=require` to `DATABASE_URL`
- Azure PostgreSQL requires SSL connections

## Related Files

- `src/prisma/prisma.service.ts` - Database connection service
- `prisma/schema.prisma` - Prisma schema configuration
- `AZURE_ENV_VARIABLES.md` - Complete list of required environment variables

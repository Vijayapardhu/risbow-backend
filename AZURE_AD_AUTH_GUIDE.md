# Azure AD Authentication for PostgreSQL

## Overview

Azure PostgreSQL supports two authentication methods:
1. **Password-based authentication** (currently used)
2. **Azure AD token authentication** (for enhanced security)

## Current Setup (Password-based)

Your application currently uses password-based authentication:

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

## Azure AD Token Authentication

The commands you showed are for `psql` command-line tool using Azure AD:

```bash
export PGHOST=risbow-postgres-prod.postgres.database.azure.com
export PGUSER=vijaypardhu17@gmail.com
export PGPORT=5432
export PGDATABASE=postgres
export PGPASSWORD="$(az account get-access-token --resource https://ossrdbms-aad.database.windows.net --query accessToken --output tsv)"
```

### Important Notes

1. **Prisma Limitation**: Prisma doesn't natively support Azure AD token authentication in connection strings. Tokens expire and need to be refreshed.

2. **For `psql` Only**: The `PGHOST`, `PGUSER`, `PGPASSWORD` environment variables are used by PostgreSQL client tools (`psql`, `pg_dump`, etc.), not by Prisma.

3. **Application Support**: The application now supports reading from `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` environment variables as a fallback, but **still requires a password** (not a token) for Prisma to work.

## Using Azure AD with Prisma

If you want to use Azure AD authentication with Prisma, you have two options:

### Option 1: Use Azure AD Password (Recommended)

Create an Azure AD user in PostgreSQL and use their password:

```sql
-- In Azure PostgreSQL, create Azure AD user
CREATE USER "vijaypardhu17@gmail.com" WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE postgres TO "vijaypardhu17@gmail.com";
```

Then use in connection string:
```
postgresql://vijaypardhu17@gmail.com:password@host:5432/postgres?sslmode=require
```

### Option 2: Token Refresh Script (Advanced)

For token-based auth, you'd need to:
1. Get Azure AD token periodically
2. Update the connection string
3. Restart Prisma client

This is complex and not recommended for production.

## Current Implementation

The application now supports both naming conventions:

### Standard Variables (DB_*)
```env
DB_HOST=risbow-postgres-prod.postgres.database.azure.com
DB_USER=risbow_admin
DB_PASSWORD=Pardhu@2008
DB_NAME=postgres
DB_PORT=5432
DB_SSL=true
```

### PostgreSQL Client Variables (PG*)
```env
PGHOST=risbow-postgres-prod.postgres.database.azure.com
PGUSER=risbow_admin
PGPASSWORD=Pardhu@2008
PGDATABASE=postgres
PGPORT=5432
```

The application will check both sets of variables and use whichever is available.

## Recommendation

**For Production (Azure App Service):**
- Continue using password-based authentication with `risbow_admin` user
- Set `DATABASE_URL` or `DB_*` variables in Azure Portal
- This is simpler, more reliable, and works well with Prisma

**For Local Development:**
- Use the same password-based connection
- Or use `psql` with Azure AD tokens for manual database access
- The application will work with either `DB_*` or `PG*` variables

## Verification

To verify your connection works:

1. **Check environment variables are set:**
   ```bash
   echo $DATABASE_URL
   # or
   echo $DB_HOST
   ```

2. **Test connection with psql:**
   ```bash
   psql $DATABASE_URL -c "SELECT version();"
   ```

3. **Check application logs:**
   - Should see: `✅ Database connected successfully`

## Security Notes

- **Never commit passwords to Git**
- Use Azure Key Vault for sensitive credentials
- Rotate passwords regularly
- Use Azure AD authentication for enhanced security (requires additional setup)

## Related Files

- `src/prisma/prisma.service.ts` - Database connection service
- `AZURE_ENV_VARIABLES.md` - Complete environment variable list
- `AZURE_ENV_VARS_TROUBLESHOOTING.md` - Troubleshooting guide

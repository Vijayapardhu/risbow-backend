# Quick Setup: Supabase Database + Azure Blob Storage

## Quick Start

### 1. Get Supabase Connection String

1. Go to: https://supabase.com/dashboard
2. Select project: `rxticediycnboewmsfmi`
3. Go to **Settings** → **Database**
4. Copy **Connection string** → **URI** (Pooler)

### 2. Update .env File

```env
# Supabase Database (replace [PASSWORD] with your actual password)
DATABASE_URL=postgresql://postgres.rxticediycnboewmsfmi:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require

# Direct connection for migrations (port 5432, not 6543)
DIRECT_URL=postgresql://postgres.rxticediycnboewmsfmi:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require

# Supabase Auth (already configured)
SUPABASE_URL=https://rxticediycnboewmsfmi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dGljZWRpeWNuYm9ld21zZm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU5ODMyMiwiZXhwIjoyMDgzMTc0MzIyfQ.REBO064OKyLSn_cPlNyTduZoiFzBmgtPjrrnogHlCzs

# Azure Blob Storage (for file uploads)
AZURE_STORAGE_ACCOUNT_NAME=risbowstorageprod
AZURE_STORAGE_ACCOUNT_KEY=your-azure-storage-key

# Other required
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret
```

### 3. Run Migrations

```powershell
npx prisma generate
npx prisma migrate dev
```

### 4. Start Application

```powershell
npm start
```

## That's It! ✅

Your app now uses:
- **Supabase PostgreSQL** for database (public access, easy localhost connection)
- **Azure Blob Storage** for file uploads
- **Supabase Auth** for authentication

## Troubleshooting

### Can't find password?
- Supabase Dashboard → Settings → Database
- Click "Reset database password" if needed

### Connection fails?
- Check password is URL-encoded (special characters)
- Verify connection string format
- Try direct connection (port 5432) instead of pooler (6543)

### Migrations fail?
- Use `DIRECT_URL` for migrations (port 5432)
- Or run SQL directly in Supabase Dashboard SQL Editor

See `SUPABASE_DATABASE_SETUP.md` for detailed guide.

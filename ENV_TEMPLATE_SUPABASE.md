# Updated .env Configuration for Supabase Database

## Replace Your Database Section

Replace the database section in your `.env` file with the Supabase configuration below.

## Step 1: Get Supabase Database Connection String

1. Go to: https://supabase.com/dashboard
2. Select project: `rxticediycnboewmsfmi`
3. Go to **Settings** → **Database**
4. Copy **Connection string** → **URI** (Pooler) for `DATABASE_URL`
5. Copy **Connection string** → **Direct connection** for `DIRECT_URL`

## Step 2: Updated .env File

```env
# Application
NODE_ENV="development"
PORT=3001
APP_BASE_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"
CORS_ORIGINS="http://localhost:3000,http://localhost:4000,http://localhost:5173"

# ============================================
# DATABASE: Supabase PostgreSQL
# ============================================
# Replace [YOUR-PASSWORD] with your Supabase database password
# Get connection string from: Supabase Dashboard → Settings → Database

# Pooler connection (for application - port 6543)
DATABASE_URL="postgresql://postgres.rxticediycnboewmsfmi:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"

# Direct connection (for migrations - port 5432)
DIRECT_URL="postgresql://postgres.rxticediycnboewmsfmi:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Optional: Individual DB variables (if needed)
# DB_HOST="aws-0-ap-south-1.pooler.supabase.com"
# DB_PORT=6543
# DB_NAME="postgres"
# DB_USER="postgres.rxticediycnboewmsfmi"
# DB_PASSWORD="[YOUR-PASSWORD]"
# DB_SSL=true

# ============================================
# REDIS (Azure Redis Cache - Keep as is)
# ============================================
REDIS_HOST="risbow-redis-prod.redis.cache.windows.net"
REDIS_PORT=6380
REDIS_PASSWORD="<your-redis-password>"  # ⚠️ Replace with your actual Redis password
REDIS_TLS=true

# ============================================
# AZURE BLOB STORAGE (Keep as is)
# ============================================
AZURE_STORAGE_ACCOUNT_NAME="risbowstorageprod"
AZURE_STORAGE_ACCOUNT_KEY="<your-azure-storage-key>"  # ⚠️ Replace with your actual Azure Storage key
AZURE_STORAGE_CONTAINER_PRODUCTS="products"
AZURE_STORAGE_CONTAINER_USERS="users"
AZURE_STORAGE_CONTAINER_VIDEOS="videos"

# ============================================
# ANALYTICS (Application Insights - Keep as is)
# ============================================
APPLICATIONINSIGHTS_CONNECTION_STRING="<your-application-insights-connection-string>"  # ⚠️ Replace with your actual connection string

# ============================================
# JWT AUTHENTICATION (Keep as is)
# ============================================
JWT_SECRET="<your-jwt-secret>"  # ⚠️ Replace with your actual JWT secret
JWT_EXPIRY="7d"

# ============================================
# PAYMENT GATEWAY (Keep as is)
# ============================================
RAZORPAY_KEY_ID="<your-razorpay-key-id>"  # ⚠️ Replace with your actual Razorpay key
RAZORPAY_KEY_SECRET="<your-razorpay-secret>"  # ⚠️ Replace with your actual Razorpay secret

# ============================================
# RATE LIMITING (Keep as is)
# ============================================
THROTTLE_TTL=60000
THROTTLE_LIMIT=100000

# ============================================
# AI/ML SERVICES (Keep as is)
# ============================================
OPENROUTER_API_KEY="<your-openrouter-api-key>"  # ⚠️ Replace with your actual OpenRouter API key
OPENROUTER_RERANK_MODEL=""

# ============================================
# SUPABASE AUTH (Already configured - Keep as is)
# ============================================
SUPABASE_URL="https://rxticediycnboewmsfmi.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<your-supabase-service-role-key>"  # ⚠️ Replace with your actual service role key
SUPABASE_ANON_KEY="<your-supabase-anon-key>"  # ⚠️ Replace with your actual anon key
```

## Important Notes

### 1. Get Supabase Database Password

If you don't know your Supabase database password:
- Go to Supabase Dashboard → Settings → Database
- Click **"Reset database password"** if needed
- Copy the password and URL-encode special characters

### 2. URL Encoding for Password

If your password contains special characters, encode them:
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

### 3. Connection String Format

**For Application (Pooler - port 6543):**
```
postgresql://postgres.rxticediycnboewmsfmi:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

**For Migrations (Direct - port 5432):**
```
postgresql://postgres.rxticediycnboewmsfmi:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
```

⚠️ **Note**: The hostname might be different. Check your Supabase Dashboard for the exact connection string.

## After Updating .env

1. **Test Connection:**
   ```powershell
   npx prisma db pull
   ```

2. **Run Migrations:**
   ```powershell
   npx prisma migrate dev
   ```

3. **Start Application:**
   ```powershell
   npm start
   ```

## What Changed

- ✅ **Database**: Changed from Azure PostgreSQL to Supabase PostgreSQL
- ✅ **Storage**: Azure Blob Storage (unchanged)
- ✅ **Auth**: Supabase Auth (unchanged)
- ✅ **Redis**: Azure Redis (unchanged)
- ✅ **Other services**: Unchanged

## Troubleshooting

### "Can't reach database server"
- Verify Supabase project is active
- Check connection string format
- Ensure password is URL-encoded

### "Authentication failed"
- Verify database password is correct
- Check if password needs URL encoding
- Reset password in Supabase Dashboard if needed

### "Connection pooler limit exceeded"
- Use direct connection (`DIRECT_URL`) for migrations
- Or reduce `connection_limit` in pooler URL

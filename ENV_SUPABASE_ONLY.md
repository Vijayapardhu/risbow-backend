# Environment Variables - Supabase Only Configuration

## Quick Setup

Copy these variables to your `.env` file and replace the placeholders with your actual values.

## Required Variables

```env
# ============================================
# APPLICATION
# ============================================
NODE_ENV=development
PORT=3001
APP_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:5173

# ============================================
# DATABASE: Supabase PostgreSQL (REQUIRED)
# ============================================
# Get from: Supabase Dashboard → Settings → Database
# Replace [YOUR-PASSWORD] with your Supabase database password

DATABASE_URL=postgresql://postgres.rxticediycnboewmsfmi:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
DIRECT_URL=postgresql://postgres.rxticediycnboewmsfmi:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require

# ============================================
# SUPABASE AUTH (REQUIRED)
# ============================================
SUPABASE_URL=https://rxticediycnboewmsfmi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key

# ============================================
# AZURE BLOB STORAGE (For file uploads)
# ============================================
AZURE_STORAGE_ACCOUNT_NAME=risbowstorageprod
AZURE_STORAGE_ACCOUNT_KEY=your-azure-storage-key
AZURE_STORAGE_CONTAINER_PRODUCTS=products
AZURE_STORAGE_CONTAINER_USERS=users
AZURE_STORAGE_CONTAINER_VIDEOS=videos

# ============================================
# JWT AUTHENTICATION (REQUIRED)
# ============================================
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRY=7d

# ============================================
# PAYMENT GATEWAY (Razorpay)
# ============================================
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-secret

# ============================================
# RATE LIMITING
# ============================================
THROTTLE_TTL=60000
THROTTLE_LIMIT=100000

# ============================================
# AI/ML SERVICES (OpenRouter)
# ============================================
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_RERANK_MODEL=

# ============================================
# REDIS (Optional - for queues/caching)
# ============================================
# Leave empty for local development, or set to your Redis instance
REDIS_HOST=
REDIS_PORT=6379
REDIS_TLS=false
REDIS_PASSWORD=
```

## How to Get Supabase Connection Strings

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select project: `rxticediycnboewmsfmi`

2. **Get Database Connection String:**
   - Go to **Settings** → **Database**
   - Scroll to **Connection string**
   - Copy **URI** (Pooler) for `DATABASE_URL` (port 6543)
   - Copy **Direct connection** for `DIRECT_URL` (port 5432)

3. **Get Supabase Keys:**
   - Go to **Settings** → **API**
   - Copy **Service Role Key** for `SUPABASE_SERVICE_ROLE_KEY`
   - Copy **Anon Key** for `SUPABASE_ANON_KEY`

## Important Notes

- **DATABASE_URL is REQUIRED** - The application will not start without it
- **URL-encode special characters** in password (e.g., `@` becomes `%40`)
- **Do NOT commit `.env` file** to version control
- **Azure Blob Storage** is still used for file uploads (not Supabase Storage)

## After Setting Up

1. **Test connection:**
   ```powershell
   npx prisma db pull
   ```

2. **Run migrations:**
   ```powershell
   npx prisma migrate dev
   ```

3. **Start application:**
   ```powershell
   npm start
   ```

## Troubleshooting

### "Can't reach database server"
- Verify `DATABASE_URL` is set correctly
- Check Supabase project is active
- Ensure password is URL-encoded

### "Authentication failed"
- Verify Supabase database password is correct
- Check if password needs URL encoding
- Reset password in Supabase Dashboard if needed

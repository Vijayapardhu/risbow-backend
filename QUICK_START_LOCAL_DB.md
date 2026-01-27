# Quick Start: Local Database Setup

## Why Public Access is Greyed Out

Your Azure PostgreSQL server was created with **private-only access** and **cannot be changed** to public access. This is by design for security.

## Solution: Use Local PostgreSQL

### Option 1: Docker (If Docker Desktop is Running)

```powershell
# 1. Start Docker Desktop first!

# 2. Start PostgreSQL
cd c:\office\risbow-backend
docker-compose up -d postgres

# 3. Update .env file
# Change DATABASE_URL to:
DATABASE_URL=postgresql://admin:password@localhost:5432/risbow?schema=public

# 4. Run migrations
npx prisma migrate dev

# 5. Start app
npm start
```

### Option 2: Install PostgreSQL Locally (No Docker Needed)

#### Step 1: Download & Install

1. **Download PostgreSQL 15 or 16:**
   - Visit: https://www.postgresql.org/download/windows/
   - Click "Download the installer"
   - Download **PostgreSQL 15.x** or **16.x** for Windows x86-64

2. **Run Installer:**
   - Click through installation wizard
   - **Set password** for `postgres` user (remember this!)
   - Port: `5432` (default)
   - Locale: `Default locale`
   - Complete installation

#### Step 2: Create Database

```powershell
# Open PowerShell and run:
createdb risbow_local

# Or if that doesn't work, use psql:
psql -U postgres
# Then in psql prompt:
CREATE DATABASE risbow_local;
\q
```

#### Step 3: Update .env File

Edit `risbow-backend/.env` and change:

```env
# Change from Azure connection:
# DATABASE_URL=postgresql://risbow_admin:Pardhu%402008@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require

# To local connection:
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/risbow_local?schema=public
```

Replace `YOUR_PASSWORD` with the password you set during installation.

#### Step 4: Run Migrations

```powershell
cd c:\office\risbow-backend
npx prisma migrate dev
```

#### Step 5: Start Application

```powershell
npm start
```

## Verify Connection

```powershell
# Test connection
psql $env:DATABASE_URL -c "SELECT version();"

# Or test with Prisma
npx prisma db pull
```

## Troubleshooting

### "psql: command not found"
- PostgreSQL bin directory not in PATH
- Add to PATH: `C:\Program Files\PostgreSQL\15\bin` (or your version)
- Or use full path: `"C:\Program Files\PostgreSQL\15\bin\psql.exe"`

### "Database does not exist"
```powershell
createdb risbow_local
# or
psql -U postgres -c "CREATE DATABASE risbow_local;"
```

### "Authentication failed"
- Check password in connection string
- Try connecting manually: `psql -U postgres`
- Reset password if needed (see PostgreSQL docs)

### "Port 5432 already in use"
- Another PostgreSQL instance is running
- Stop it or change port in connection string

## Quick Commands Reference

```powershell
# Start PostgreSQL service (if stopped)
# Windows Services → PostgreSQL → Start

# Connect to database
psql -U postgres

# Create database
createdb risbow_local

# List databases
psql -U postgres -l

# Drop database (if needed)
psql -U postgres -c "DROP DATABASE risbow_local;"
```

## Environment Variables

Your `.env` file should have:

```env
# Local Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/risbow_local?schema=public

# Local Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TLS=false

# Other required vars
JWT_SECRET=your-local-secret
NODE_ENV=development
PORT=3000
```

## Next Steps

1. ✅ Install PostgreSQL locally (if not using Docker)
2. ✅ Create database: `createdb risbow_local`
3. ✅ Update `.env` with local connection string
4. ✅ Run migrations: `npx prisma migrate dev`
5. ✅ Start app: `npm start`

Your application will now use local database instead of Azure!

## Why This is Better

- ✅ **Fast**: No network latency
- ✅ **Free**: No Azure costs for development
- ✅ **Safe**: Doesn't affect production
- ✅ **Flexible**: Easy to reset/seed test data
- ✅ **Offline**: Works without internet

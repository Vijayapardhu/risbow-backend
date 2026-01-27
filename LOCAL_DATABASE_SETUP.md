# Local Database Setup Guide

## Problem

Azure PostgreSQL with private endpoint is not accessible from localhost. You need a database for local development.

## Solutions

### Option 1: Use Local PostgreSQL (Recommended for Development)

Install PostgreSQL locally and use it for development:

#### Windows Installation

1. **Download PostgreSQL:**
   - Go to https://www.postgresql.org/download/windows/
   - Download and install PostgreSQL 15 or 16

2. **During Installation:**
   - Set password for `postgres` user (remember this!)
   - Default port: `5432`
   - Default database: `postgres`

3. **Update `.env` file:**
   ```env
   DATABASE_URL=postgresql://postgres:your-local-password@localhost:5432/risbow_local
   ```

4. **Create local database:**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE risbow_local;
   
   # Exit
   \q
   ```

5. **Run migrations:**
   ```bash
   npx prisma migrate dev
   ```

#### Linux/Mac Installation

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# macOS (using Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb risbow_local
```

### Option 2: Enable Public Access on Azure PostgreSQL (Not Recommended)

⚠️ **Security Risk**: This exposes your production database to the internet.

1. **Azure Portal → PostgreSQL Server:**
   - Go to "Networking" or "Connection security"
   - Enable "Allow access to Azure services"
   - Add your current IP address to firewall rules
   - Save changes

2. **Update `.env` to use public endpoint:**
   ```env
   DATABASE_URL=postgresql://risbow_admin:Pardhu%402008@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require
   ```

⚠️ **Warning**: This exposes your production database. Use only for testing, not recommended for regular development.

### Option 3: Use Azure Database for PostgreSQL Flexible Server (Public Access)

If you have a flexible server with public access enabled:

1. **Check firewall rules:**
   - Azure Portal → PostgreSQL → Networking
   - Add your IP address (0.0.0.0 - 255.255.255.255 for testing, but use your specific IP in production)

2. **Use public endpoint:**
   ```env
   DATABASE_URL=postgresql://risbow_admin:Pardhu%402008@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require
   ```

### Option 4: Use Docker PostgreSQL (Quick Setup)

```bash
# Run PostgreSQL in Docker
docker run --name risbow-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=risbow_local \
  -p 5432:5432 \
  -d postgres:15

# Update .env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/risbow_local
```

## Recommended Setup

For local development, use **Option 1 (Local PostgreSQL)**:

1. ✅ Fast and reliable
2. ✅ No internet dependency
3. ✅ Safe - doesn't affect production
4. ✅ Free
5. ✅ Easy to reset/seed test data

## Environment Variables for Local Development

Create a `.env.local` file (or update `.env`):

```env
# Local Database
DATABASE_URL=postgresql://postgres:your-local-password@localhost:5432/risbow_local

# Keep other Azure services for testing (optional)
# Or use local alternatives:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TLS=false
REDIS_PASSWORD=

# Azure Storage (can still use Azure for file uploads)
AZURE_STORAGE_ACCOUNT_NAME=risbowstorageprod
AZURE_STORAGE_ACCOUNT_KEY=your-key

# Or disable Azure Storage and use local file system (requires code changes)
```

## Quick Start Commands

```bash
# 1. Install PostgreSQL locally (if not installed)
# Windows: Download from postgresql.org
# Mac: brew install postgresql@15
# Linux: sudo apt-get install postgresql

# 2. Create database
createdb risbow_local
# or
psql -U postgres -c "CREATE DATABASE risbow_local;"

# 3. Update .env with local database URL
# DATABASE_URL=postgresql://postgres:password@localhost:5432/risbow_local

# 4. Run migrations
npx prisma migrate dev

# 5. (Optional) Seed database
npm run seed

# 6. Start application
npm start
```

## Troubleshooting

### "Can't reach database server"
- Check PostgreSQL is running: `pg_isready` or check services
- Verify connection string in `.env`
- Check firewall/antivirus isn't blocking port 5432

### "Authentication failed"
- Verify username and password in connection string
- Check PostgreSQL authentication settings in `pg_hba.conf`

### "Database does not exist"
- Create the database: `createdb risbow_local`
- Or: `psql -U postgres -c "CREATE DATABASE risbow_local;"`

## Production vs Development

- **Production (Azure)**: Use Azure PostgreSQL with private endpoint
- **Local Development**: Use local PostgreSQL or Docker
- **Staging**: Can use Azure PostgreSQL with public access (with proper firewall rules)

## Next Steps

1. Choose your preferred option (recommended: Local PostgreSQL)
2. Set up the database
3. Update `.env` file
4. Run migrations
5. Start developing!

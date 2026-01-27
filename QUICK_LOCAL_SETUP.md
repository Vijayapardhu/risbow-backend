# Quick Local Setup Guide

## Fastest Way: Use Docker Compose

### Step 1: Start Local PostgreSQL

```bash
# Start PostgreSQL and Redis in Docker
docker-compose up -d postgres redis

# Verify it's running
docker ps
```

### Step 2: Create Database

```bash
# Connect to PostgreSQL
docker exec -it risbow-backend-postgres-1 psql -U admin -d risbow

# Or create a new database
docker exec -it risbow-backend-postgres-1 psql -U admin -c "CREATE DATABASE risbow_local;"
```

### Step 3: Update .env File

Update your `.env` file with local database:

```env
# Local Database (Docker)
DATABASE_URL=postgresql://admin:password@localhost:5432/risbow?schema=public

# Or if you created risbow_local:
# DATABASE_URL=postgresql://admin:password@localhost:5432/risbow_local?schema=public

# Local Redis (Docker)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TLS=false
REDIS_PASSWORD=

# Keep Azure Storage for file uploads (or disable if not needed)
AZURE_STORAGE_ACCOUNT_NAME=risbowstorageprod
AZURE_STORAGE_ACCOUNT_KEY=your-key
```

### Step 4: Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Or push schema (for development)
npx prisma db push
```

### Step 5: Start Application

```bash
npm start
```

## Alternative: Install PostgreSQL Locally

### Windows

1. Download from: https://www.postgresql.org/download/windows/
2. Install with default settings
3. Remember the password you set for `postgres` user
4. Update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:your-password@localhost:5432/risbow_local
   ```
5. Create database:
   ```bash
   createdb risbow_local
   # or
   psql -U postgres -c "CREATE DATABASE risbow_local;"
   ```

### Mac (Homebrew)

```bash
brew install postgresql@15
brew services start postgresql@15
createdb risbow_local
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
createdb risbow_local
```

## Verify Connection

```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"

# Or using Prisma
npx prisma db pull
```

## Stop Docker Services

When done:
```bash
docker-compose down
```

## Troubleshooting

### Port 5432 already in use
- Stop existing PostgreSQL: `docker-compose down`
- Or change port in `docker-compose.yml`: `"5433:5432"`

### "Database does not exist"
```bash
# Create it
createdb risbow_local
# or
docker exec -it risbow-backend-postgres-1 psql -U admin -c "CREATE DATABASE risbow_local;"
```

### "Authentication failed"
- Check username/password in connection string
- For Docker: use `admin:password` (from docker-compose.yml)
- For local: use `postgres:your-installation-password`

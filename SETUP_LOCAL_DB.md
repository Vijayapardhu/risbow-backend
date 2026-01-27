# Setup Local Database for Development

## Quick Solution: Use Docker (Recommended)

### Prerequisites
- Docker Desktop installed and running

### Steps

1. **Start Docker Desktop** (if not running)

2. **Start PostgreSQL container:**
   ```powershell
   cd risbow-backend
   docker-compose up -d postgres
   ```

3. **Update `.env` file:**
   ```env
   DATABASE_URL=postgresql://admin:password@localhost:5432/risbow?schema=public
   ```

4. **Run migrations:**
   ```powershell
   npx prisma migrate dev
   ```

5. **Start application:**
   ```powershell
   npm start
   ```

## Alternative: Install PostgreSQL Locally

### Windows Installation

1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download PostgreSQL 15 or 16 installer
   - Run installer

2. **During Installation:**
   - Choose installation directory (default is fine)
   - Set password for `postgres` superuser (remember this!)
   - Port: `5432` (default)
   - Locale: `Default locale`

3. **After Installation:**
   ```powershell
   # Create database
   createdb risbow_local
   
   # Or using psql
   psql -U postgres
   # Then in psql:
   CREATE DATABASE risbow_local;
   \q
   ```

4. **Update `.env` file:**
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/risbow_local?schema=public
   ```

5. **Run migrations:**
   ```powershell
   npx prisma migrate dev
   ```

6. **Start application:**
   ```powershell
   npm start
   ```

## Quick Test

After setup, verify connection:

```powershell
# Test with psql
psql $env:DATABASE_URL -c "SELECT version();"

# Or test with Prisma
npx prisma db pull
```

## Current Docker Compose Setup

Your `docker-compose.yml` already has PostgreSQL configured:

- **Host**: `localhost`
- **Port**: `5432`
- **User**: `admin`
- **Password**: `password`
- **Database**: `risbow`

Just start it:
```powershell
docker-compose up -d postgres redis
```

## Environment Variables for Local Development

Create or update `.env`:

```env
# Local Database
DATABASE_URL=postgresql://admin:password@localhost:5432/risbow?schema=public

# Local Redis (optional, but recommended)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TLS=false
REDIS_PASSWORD=

# Keep Azure Storage (or disable if not needed)
AZURE_STORAGE_ACCOUNT_NAME=risbowstorageprod
AZURE_STORAGE_ACCOUNT_KEY=your-key-here

# Other required variables
JWT_SECRET=your-local-jwt-secret
NODE_ENV=development
PORT=3000
```

## Troubleshooting

### "Docker Desktop is not running"
- Start Docker Desktop application
- Wait for it to fully start (whale icon in system tray)

### "Port 5432 already in use"
- Another PostgreSQL instance is running
- Stop it or change port in `docker-compose.yml`

### "Database does not exist"
```powershell
# For Docker:
docker exec -it risbow-backend-postgres-1 psql -U admin -c "CREATE DATABASE risbow;"

# For local PostgreSQL:
createdb risbow_local
```

### "Authentication failed"
- Check username/password in connection string
- For Docker: `admin:password`
- For local: `postgres:your-installation-password`

## Next Steps

1. Choose method (Docker or Local PostgreSQL)
2. Start database
3. Update `.env` with local connection string
4. Run migrations: `npx prisma migrate dev`
5. Start app: `npm start`

Your application will now connect to local database instead of Azure!

# Azure App Service Deployment Guide

## Overview

This guide covers deploying the RISBOW backend to Azure App Service (Linux) for **DEVELOPMENT** phase. Production setup (Application Gateway, WAF, custom domain) is documented but **not enforced**.

## Architecture

- **App Service**: Node.js API (Fastify)
- **Database**: Azure PostgreSQL Flexible Server (private endpoint)
- **Cache**: Azure Redis Cache
- **Storage**: Azure Blob Storage

## Environment Variables

### Required Variables

Set these in Azure App Service → Configuration → Application Settings:

```bash
# Application
NODE_ENV=development
PORT=8080  # Azure App Service sets PORT automatically, but we default to 8080
BASE_URL=https://<app-name>.azurewebsites.net

# Database (Azure PostgreSQL Flexible Server)
DB_HOST=<azure-postgres-host>.private.postgres.database.azure.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=<user>@<server-name>
DB_PASSWORD=<password>
DB_SSL=true

# Redis (Azure Redis Cache)
REDIS_HOST=<redis-host>.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=<password>
REDIS_TLS=true

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT_NAME=<name>
AZURE_STORAGE_ACCOUNT_KEY=<key>
AZURE_STORAGE_CONTAINER_PRODUCTS=products
AZURE_STORAGE_CONTAINER_USERS=users
AZURE_STORAGE_CONTAINER_VIDEOS=videos

# JWT Authentication
JWT_SECRET=<strong-secret>
JWT_EXPIRES_IN=7d

# Optional: Application Insights (auto-configured by Azure)
APPLICATIONINSIGHTS_CONNECTION_STRING=<auto-set-by-azure>
```

### Notes

- **DATABASE_URL**: If not set, the app constructs it from `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`.
- **DIRECT_URL**: Optional. Only needed if using a connection pooler (e.g., PgBouncer). If not using a pooler, omit this variable. If using a pooler, set it to the direct database connection string (bypassing the pooler).
- **REDIS_TLS**: Must be `true` for Azure Redis Cache (port 6380).
- **PORT**: Azure App Service sets `process.env.PORT` automatically. The app uses this value.

## Health Check Endpoint

Azure App Service health probes use `/health` (root level, not `/api/v1/health`).

- **Root endpoint**: `GET /health` → Returns `{ status: 'ok', timestamp: '...' }`
- **API endpoint**: `GET /api/v1/health` → Same response (for API clients)

Both endpoints:
- Return HTTP 200 on success
- Check database connectivity
- Return `{ status: 'error', message: 'Database unreachable' }` on failure

## Server Configuration

### Port Handling

The app uses `process.env.PORT` (set by Azure App Service):

```typescript
const port = process.env.PORT || 3000;
await app.listen(port, '0.0.0.0');
```

### HTTPS Redirects

**DEVELOPMENT**: No forced HTTPS redirects. The app accepts both HTTP and HTTPS.

**PRODUCTION** (commented, not enforced):
```typescript
// PRODUCTION: Uncomment to enforce HTTPS
// app.use((req, res, next) => {
//   if (req.header('x-forwarded-proto') !== 'https') {
//     return res.redirect(`https://${req.header('host')}${req.url}`);
//   }
//   next();
// });
```

### CORS Configuration

- **Development**: Allows all origins
- **Production**: Restricts to `CORS_ORIGINS` and `FRONTEND_URL` env vars

```typescript
if (process.env.NODE_ENV !== 'production') return callback(null, true);
```

## Database Connection

### Prisma Configuration

The app supports two connection methods:

1. **Direct DATABASE_URL** (preferred):
   ```bash
   DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
   ```

2. **Individual variables** (Azure-friendly):
   ```bash
   DB_HOST=...
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=...
   DB_PASSWORD=...
   DB_SSL=true
   ```

The app automatically constructs `DATABASE_URL` from individual vars if `DATABASE_URL` is not set.

### SSL/TLS

Azure PostgreSQL requires SSL. Set `DB_SSL=true` or include `?sslmode=require` in `DATABASE_URL`.

## Redis Connection

### TLS Support

Azure Redis Cache requires TLS on port 6380:

```typescript
tls: process.env.REDIS_TLS === 'true' ? {} : undefined
```

### Fallback

If Redis is unavailable, the app falls back to in-memory storage (OTP, caching). This is acceptable for development but **not recommended for production**.

## Azure Blob Storage

The app uses Azure Blob Storage for:
- Product images (`AZURE_STORAGE_CONTAINER_PRODUCTS`)
- User uploads (`AZURE_STORAGE_CONTAINER_USERS`)
- Videos (`AZURE_STORAGE_CONTAINER_VIDEOS`)

Ensure the storage account key is set in `AZURE_STORAGE_ACCOUNT_KEY`.

## Deployment Checklist

### Development Checklist

- [ ] App Service created (Linux, Node.js 20)
- [ ] PostgreSQL Flexible Server created (private endpoint)
- [ ] Redis Cache created
- [ ] Blob Storage account created
- [ ] All environment variables set in App Service Configuration
- [ ] Health check endpoint accessible: `https://<app-name>.azurewebsites.net/health`
- [ ] Database connection verified (check logs)
- [ ] Redis connection verified (check logs)
- [ ] API accessible: `https://<app-name>.azurewebsites.net/api/v1/health`
- [ ] Swagger docs accessible: `https://<app-name>.azurewebsites.net/api/docs`

### Production Checklist (Optional, Not Enforced)

- [ ] Custom domain configured
- [ ] Application Gateway deployed
- [ ] WAF rules configured
- [ ] HTTPS redirect enabled (uncomment in `main.ts`)
- [ ] CORS origins restricted
- [ ] Application Insights enabled
- [ ] Logging configured (Azure Monitor)
- [ ] Auto-scaling configured
- [ ] Backup strategy for PostgreSQL
- [ ] Redis persistence enabled

## Troubleshooting

### Health Check Fails

1. Check database connectivity:
   ```bash
   # From App Service SSH/Console
   psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME>
   ```

2. Check Redis connectivity:
   ```bash
   # From App Service SSH/Console
   redis-cli -h <REDIS_HOST> -p 6380 --tls -a <REDIS_PASSWORD> ping
   ```

### Port Issues

Azure App Service sets `PORT` automatically. If the app doesn't start:
- Check App Service logs: `az webapp log tail --name <app-name> --resource-group <rg-name>`
- Verify `process.env.PORT` is being read

### Database Connection Errors

- Verify `DB_SSL=true` for Azure PostgreSQL
- Check firewall rules allow App Service outbound IPs
- Verify private endpoint is configured (if using private networking)
- **Local Development**: If connecting from your local machine to Azure PostgreSQL with a private endpoint, you'll need:
  - VPN connection to the Azure VNet, OR
  - Azure Bastion/jump host, OR
  - Public endpoint enabled (not recommended for production)
  - For local development, use a local PostgreSQL instance or set up port forwarding via Azure Bastion

### Redis Connection Errors

- Verify `REDIS_TLS=true` and `REDIS_PORT=6380`
- Check firewall rules allow App Service outbound IPs
- Verify Redis cache is in the same region as App Service (for performance)

## Local Development

The app works locally with:

```bash
# .env.local
DATABASE_URL=postgresql://localhost:5432/risbow
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TLS=false
PORT=3000
NODE_ENV=development
```

No Azure-specific configuration needed for local development.

## Security Notes

- **Never commit secrets** to version control
- Use Azure Key Vault for production secrets (optional, not implemented)
- Rotate `JWT_SECRET` periodically
- Use managed identities for Azure resource access (future enhancement)

## Support

For issues:
1. Check App Service logs
2. Check Application Insights (if enabled)
3. Verify environment variables are set correctly
4. Test health endpoint: `curl https://<app-name>.azurewebsites.net/health`

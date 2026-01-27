# Azure App Service Environment Variables Reference

This document contains the production environment variables configured in Azure App Service.

## ⚠️ Security Note

**DO NOT commit actual secrets to version control.** This file serves as a **template/reference** for setting up Azure App Service. Replace placeholder values with your actual production secrets.

## Environment Variables

### Application Configuration

```bash
# Application Environment
NODE_ENV=production  # ⚠️ Change from 'development' to 'production' for production
PORT=3000  # Azure App Service will override this with process.env.PORT
BASE_URL=https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net

# Health Check
WEBSITE_HEALTHCHECK_MAXPINGFAILURES=10
```

### Database (Azure PostgreSQL)

```bash
# Direct Connection String (Preferred)
DATABASE_URL=postgresql://risbow_admin:<password>@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require
# ⚠️ Replace <password> with your actual password (URL-encode special characters: @ becomes %40)

# Individual Variables (Alternative)
DB_HOST=risbow-postgres-prod.private.postgres.database.azure.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=risbow_admin
DB_PASSWORD=<your-database-password>  # ⚠️ Use strong password - DO NOT commit to repo
DB_SSL=true
```

**Note**: If using private endpoint, `DB_HOST` should use `.private.postgres.database.azure.com` domain.

### Redis Cache (Azure Redis)

```bash
REDIS_HOST=risbow-redis-prod.redis.cache.windows.net
REDIS_PORT=6380  # TLS port for Azure Redis
REDIS_PASSWORD=<your-redis-password>  # ⚠️ Use strong password - DO NOT commit to repo
REDIS_TLS=true  # Required for Azure Redis (port 6380)
```

### Azure Blob Storage

```bash
AZURE_STORAGE_ACCOUNT_NAME=risbowstorageprod
AZURE_STORAGE_ACCOUNT_KEY=<your-storage-account-key>  # ⚠️ Use strong key - DO NOT commit to repo
AZURE_STORAGE_CONTAINER_PRODUCTS=products
AZURE_STORAGE_CONTAINER_USERS=users
AZURE_STORAGE_CONTAINER_VIDEOS=videos
```

### Authentication & Security

```bash
JWT_SECRET=<your-jwt-secret>  # ⚠️ Use strong secret - DO NOT commit to repo
JWT_EXPIRY=7  # Days
```

### Payment Gateway (Razorpay)

```bash
# ⚠️ Replace with your actual Razorpay keys
RAZORPAY_KEY_ID=rzp_test_1234567890  # Use live keys in production
RAZORPAY_KEY_SECRET=rzp_secret_1234567890  # Use live keys in production
```

**Note**: The values shown are placeholders. Replace with your actual Razorpay production keys.

### Supabase Integration

```bash
SUPABASE_URL=https://rxticediycnboewmsfmi.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # ⚠️ Use actual key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # ⚠️ Use actual key
```

### Rate Limiting

```bash
THROTTLE_TTL=60000  # Time window in milliseconds (60 seconds)
THROTTLE_LIMIT=100000  # Max requests per window
```

### Application Insights (Auto-configured by Azure)

```bash
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=bbd32ab5-8cac-4fac-9751-2214972ef13b;IngestionEndpoint=https://centralindia-0.in.applicationinsights.azure.com/;LiveEndpoint=https://centralindia.livediagnostics.monitor.azure.com/;ApplicationId=1a4efe71-dd06-4d05-bde6-3a0429ef69de
ApplicationInsightsAgent_EXTENSION_VERSION=~3
XDT_MicrosoftApplicationInsights_Mode=default
```

## Setting Up in Azure Portal

1. Go to **Azure Portal** → Your App Service → **Configuration** → **Application Settings**
2. Click **+ New application setting** for each variable
3. Enter **Name** and **Value**
4. Click **Save**
5. **Restart** the App Service

## Setting Up via Azure CLI

```bash
# Set all environment variables at once
az webapp config appsettings set \
  --resource-group <your-resource-group> \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --settings \
    NODE_ENV=production \
    BASE_URL=https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net \
    DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require" \
    REDIS_HOST=risbow-redis-prod.redis.cache.windows.net \
    REDIS_PORT=6380 \
    REDIS_TLS=true \
    JWT_SECRET="your-secret" \
    # ... add all other variables
```

## Setting Up via GitHub Actions

Add these as **GitHub Secrets** (for reference, not for direct use in workflow):

```bash
# These should be set in GitHub → Settings → Secrets
AZURE_DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
AZURE_REDIS_HOST=risbow-redis-prod.redis.cache.windows.net
AZURE_REDIS_PASSWORD=your-redis-password
# ... etc
```

**Note**: The GitHub Actions workflow uses `AZURE_DATABASE_URL` for migrations. Other variables are set directly in Azure App Service.

## Important Notes

1. **NODE_ENV**: Currently set to `development`. Change to `production` for production deployments.

2. **PORT**: Azure App Service automatically sets `process.env.PORT`. The app reads this value. The `PORT=3000` setting is a fallback.

3. **Database URL Encoding**: Special characters in passwords must be URL-encoded:
   - `@` becomes `%40`
   - `#` becomes `%23`
   - etc.

4. **Private Endpoints**: If using private endpoints, ensure:
   - `DB_HOST` uses `.private.postgres.database.azure.com`
   - App Service is in the same VNet or has network access

5. **Redis TLS**: Azure Redis requires TLS on port 6380. Ensure `REDIS_TLS=true`.

6. **Secrets Rotation**: Regularly rotate:
   - `JWT_SECRET`
   - `REDIS_PASSWORD`
   - `AZURE_STORAGE_ACCOUNT_KEY`
   - Database passwords

## Verification

After setting environment variables:

1. **Restart App Service**
2. **Check logs**: `az webapp log tail --name <app-name> --resource-group <rg-name>`
3. **Test health endpoint**: `curl https://<app-name>.azurewebsites.net/api/v1/health`
4. **Verify database connection** in logs
5. **Verify Redis connection** in logs

## Troubleshooting

### Database Connection Issues

- Verify `DB_SSL=true` for Azure PostgreSQL
- Check firewall rules allow App Service outbound IPs
- Verify private endpoint configuration (if using)
- Test connection: `psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME>`

### Redis Connection Issues

- Verify `REDIS_TLS=true` and `REDIS_PORT=6380`
- Check firewall rules
- Test connection: `redis-cli -h <REDIS_HOST> -p 6380 --tls -a <REDIS_PASSWORD> ping`

### Storage Issues

- Verify storage account key is correct
- Check container names match exactly
- Verify storage account is accessible from App Service

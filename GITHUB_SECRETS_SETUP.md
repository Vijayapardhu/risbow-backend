# GitHub Secrets Setup Guide

This guide explains which values should be set as **GitHub Secrets** (for CI/CD) vs **Azure App Service Configuration** (for runtime).

## 🔐 GitHub Secrets (Required for Deployment)

Set these in **GitHub** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### 1. Azure Authentication

**Name:** `AZURE_CREDENTIALS`  
**Value:** Service Principal JSON (create with Azure CLI)

```bash
# Create Service Principal (with your actual values)
az ad sp create-for-rbac \
  --name "risbow-github-actions" \
  --role contributor \
  --scopes /subscriptions/2ceebe32-f723-441c-b024-b250f48d26b1/resourceGroups/risbow-prod \
  --sdk-auth

# Output will be JSON like:
# {
#   "clientId": "...",
#   "clientSecret": "...",
#   "subscriptionId": "2ceebe32-f723-441c-b024-b250f48d26b1",
#   "tenantId": "..."
# }
```

**Your Azure Details:**
- **Resource Group:** `risbow-prod`
- **Subscription ID:** `2ceebe32-f723-441c-b024-b250f48d26b1`
- **App Service Name:** `risbow-api-prod-f4dua9fsc4d9hqgs`
- **Location:** Central India

**Copy the entire JSON output** and paste it as the secret value.

### 2. Azure App Service Configuration

**Name:** `AZURE_APP_SERVICE_NAME`  
**Value:** `risbow-api-prod-f4dua9fsc4d9hqgs`

**Name:** `AZURE_PUBLISH_PROFILE`  
**Value:** Download from Azure Portal:
1. Go to **Azure Portal** → **App Service** → **Get publish profile**
2. Copy the entire XML content
3. Paste as secret value

**Name:** `AZURE_APP_SERVICE_URL`  
**Value:** `https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net`

**Your Azure Details:**
- **Resource Group:** `risbow-prod`
- **Subscription ID:** `2ceebe32-f723-441c-b024-b250f48d26b1`
- **App Service Name:** `risbow-api-prod-f4dua9fsc4d9hqgs`
- **Location:** Central India

### 3. Database Connection (for Migrations)

**Name:** `AZURE_DATABASE_URL`  
**Value:** `postgresql://risbow_admin:<password>@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require`

**⚠️ Replace `<password>` with your actual database password. URL-encode special characters (e.g., `@` becomes `%40`).**

**⚠️ Security Note:** This contains credentials. Ensure your repository has proper access controls.

---

## 🌐 Azure App Service Configuration (Runtime Environment Variables)

These should be set **directly in Azure App Service**, NOT as GitHub Secrets. They are used by the running application.

### Set via Azure Portal

1. Go to **Azure Portal** → **App Service** → **Configuration** → **Application Settings**
2. Add each variable below

### Set via Azure CLI

```bash
az webapp config appsettings set \
  --resource-group <your-resource-group> \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --settings \
    NODE_ENV=production \
    BASE_URL=https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net \
    PORT=3000 \
    DATABASE_URL="postgresql://risbow_admin:<password>@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require" \
    DB_HOST=risbow-postgres-prod.private.postgres.database.azure.com \
    DB_PORT=5432 \
    DB_NAME=postgres \
    DB_USER=risbow_admin \
    DB_PASSWORD="<your-database-password>" \
    DB_SSL=true \
    REDIS_HOST=risbow-redis-prod.redis.cache.windows.net \
    REDIS_PORT=6380 \
    REDIS_PASSWORD="<your-redis-password>" \
    REDIS_TLS=true \
    AZURE_STORAGE_ACCOUNT_NAME=risbowstorageprod \
    AZURE_STORAGE_ACCOUNT_KEY="<your-storage-account-key>" \
    AZURE_STORAGE_CONTAINER_PRODUCTS=products \
    AZURE_STORAGE_CONTAINER_USERS=users \
    AZURE_STORAGE_CONTAINER_VIDEOS=videos \
    JWT_SECRET="<your-jwt-secret>" \
    JWT_EXPIRY=7 \
    RAZORPAY_KEY_ID="rzp_test_1234567890" \
    RAZORPAY_KEY_SECRET="rzp_secret_1234567890" \
    SUPABASE_URL=https://rxticediycnboewmsfmi.supabase.co \
    SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dGljZWRpeWNuYm9ld21zZm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1OTgzMjIsImV4cCI6MjA4MzE3NDMyMn0.o1bXrV5YJH1L8u0rOQZ9K7Yk2Y1kY1KfX5Y5bX5xX2o" \
    SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dGljZWRpeWNuYm9ld21zZm1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU5ODMyMiwiZXhwIjoyMDgzMTc0MzIyfQ.REBO064OKyLSn_cPlNyTduZoiFzBmgtPjrrnogHlCzs" \
    THROTTLE_TTL=60000 \
    THROTTLE_LIMIT=100000 \
    WEBSITE_HEALTHCHECK_MAXPINGFAILURES=10 \
    APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=bbd32ab5-8cac-4fac-9751-2214972ef13b;IngestionEndpoint=https://centralindia-0.in.applicationinsights.azure.com/;LiveEndpoint=https://centralindia.livediagnostics.monitor.azure.com/;ApplicationId=1a4efe71-dd06-4d05-bde6-3a0429ef69de" \
    ApplicationInsightsAgent_EXTENSION_VERSION="~3" \
    XDT_MicrosoftApplicationInsights_Mode=default
```

---

## 📋 Quick Reference

### GitHub Secrets (5 total)

| Secret Name | Value | Purpose |
|------------|-------|---------|
| `AZURE_CREDENTIALS` | Service Principal JSON | Azure authentication for deployment |
| `AZURE_APP_SERVICE_NAME` | `risbow-api-prod-f4dua9fsc4d9hqgs` | App Service name |
| `AZURE_PUBLISH_PROFILE` | XML from Azure Portal | Deployment authentication |
| `AZURE_DATABASE_URL` | PostgreSQL connection string | Run migrations during deployment |
| `AZURE_APP_SERVICE_URL` | `https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net` | Health check URL |

### Azure App Service Settings (All others)

All environment variables from your list should be set in **Azure App Service Configuration**, not GitHub Secrets.

---

## ✅ Setup Checklist

### Step 1: Create GitHub Secrets

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Add each secret from the table above

### Step 2: Set Azure App Service Configuration

1. Go to **Azure Portal** → **App Service** → **Configuration** → **Application Settings**
2. Add all variables from the Azure CLI command above
3. Click **Save**
4. **Restart** the App Service

### Step 3: Verify

1. Check GitHub Actions can authenticate: Run a test deployment
2. Check Azure App Service has all variables: Review Configuration page
3. Test health endpoint: `curl https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net/api/v1/health`

---

## 🔒 Security Best Practices

1. **Never commit secrets** to version control
2. **Rotate secrets regularly** (especially JWT_SECRET, database passwords)
3. **Use Azure Key Vault** for production secrets (optional, advanced)
4. **Limit GitHub Actions permissions** to only what's needed
5. **Review secret access logs** regularly

---

## 🆘 Troubleshooting

### Deployment Fails with Authentication Error

- Verify `AZURE_CREDENTIALS` is valid JSON
- Check Service Principal has correct permissions
- Verify `AZURE_PUBLISH_PROFILE` is correct

### Migrations Fail

- Verify `AZURE_DATABASE_URL` is correct
- Check database firewall allows GitHub Actions IPs
- Test connection: `psql $AZURE_DATABASE_URL`

### App Starts but Can't Connect to Database

- Verify all database variables are set in Azure App Service
- Check `DATABASE_URL` format (URL encoding for special characters)
- Verify firewall rules

---

## 📚 Related Documentation

- [Azure Deployment Guide](./AZURE_DEPLOYMENT.md)
- [Environment Variables Reference](./AZURE_ENV_VARIABLES.md)
- [GitHub Actions Setup](./.github/workflows/setup.md)

# Quick Setup Guide - Azure App Service

## Your Azure Configuration

- **Resource Group:** `risbow-prod`
- **Subscription ID:** `2ceebe32-f723-441c-b024-b250f48d26b1`
- **App Service Name:** `risbow-api-prod-f4dua9fsc4d9hqgs`
- **Default Domain:** `risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net`
- **Location:** Central India
- **GitHub Repository:** `https://github.com/Vijayapardhu/risbow-backend`

## ⚠️ Health Check Status: Degraded

Your health check shows **0.00% (Healthy 0 / Degraded 1)**. This needs to be fixed.

## Step 1: Create GitHub Secrets

### 1.1 ✅ Service Principal Created

Your Azure Service Principal has been created. Use the JSON output you received for the `AZURE_CREDENTIALS` secret.

### 1.2 Set GitHub Secrets

Go to: **https://github.com/Vijayapardhu/risbow-backend/settings/secrets/actions**

Add these 5 secrets:

| Secret Name | Value |
|------------|-------|
| `AZURE_CREDENTIALS` | Paste the JSON from Step 1.1 |
| `AZURE_APP_SERVICE_NAME` | `risbow-api-prod-f4dua9fsc4d9hqgs` |
| `AZURE_PUBLISH_PROFILE` | Download from Azure Portal → App Service → Get publish profile |
| `AZURE_DATABASE_URL` | `postgresql://risbow_admin:<password>@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require`<br>⚠️ Replace `<password>` with your actual password (URL-encode `@` as `%40`) |
| `AZURE_APP_SERVICE_URL` | `https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net` |

## Step 2: Verify Azure App Service Configuration

### 2.1 Check Startup Command

1. Go to **Azure Portal** → **App Service** → **Configuration** → **General Settings**
2. Verify **Startup Command** is set to:
   ```bash
   npm run start:prod
   ```
   Or:
   ```bash
   bash start.sh
   ```

### 2.2 Check Node.js Version

1. In **General Settings**, verify:
   - **Stack:** `Node.js`
   - **Stack Version:** `22.x` (or latest 22.x LTS)

### 2.3 Verify Environment Variables

All environment variables should already be set. Verify in **Configuration** → **Application Settings**:

- ✅ `NODE_ENV=production` (not `development`)
- ✅ `DATABASE_URL` is set
- ✅ `REDIS_HOST`, `REDIS_PASSWORD`, `REDIS_TLS=true`
- ✅ `JWT_SECRET` is set
- ✅ All other variables from `AZURE_ENV_VARIABLES.md`

## Step 3: Fix Health Check Issue

### 3.1 Check App Service Logs

```bash
az webapp log tail \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod
```

Or in Azure Portal:
- **App Service** → **Log stream**

### 3.2 Test Health Endpoint

```bash
curl https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net/api/v1/health
```

Expected response:
```json
{"status":"ok","timestamp":"..."}
```

### 3.3 Common Health Check Issues

1. **App not listening on correct port:**
   - Verify `main.ts` uses `process.env.PORT` and listens on `0.0.0.0`
   - Check startup command is correct

2. **Database connection failing:**
   - Verify `DATABASE_URL` is correct
   - Check firewall rules allow App Service outbound IPs
   - Test connection: `psql $DATABASE_URL`

3. **App crashing on startup:**
   - Check logs for errors
   - Verify all environment variables are set
   - Check Node.js version is 22.x

4. **Health check path incorrect:**
   - Verify health endpoint is at `/api/v1/health` or `/health`
   - Check Azure health check path in **Configuration** → **General Settings**

## Step 4: Restart App Service

After making changes:

```bash
az webapp restart \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod
```

Or in Azure Portal:
- **App Service** → **Restart**

Wait 60-90 seconds for the app to fully start.

## Step 5: Test Deployment

### 5.1 Manual Deployment Test

1. Go to **GitHub** → **Actions** → **Deploy to Azure App Service**
2. Click **Run workflow**
3. Select branch: `main` or `master`
4. Click **Run workflow**

### 5.2 Automatic Deployment

Push to `main` or `master` branch:

```bash
git push origin main
```

The workflow will automatically:
1. Build the application
2. Deploy to Azure
3. Run migrations
4. Verify health check

## Step 6: Verify Everything Works

### 6.1 Health Check

```bash
curl https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net/api/v1/health
```

### 6.2 Swagger Docs

Open in browser:
```
https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net/api/docs
```

### 6.3 Check Azure Portal Health

- **App Service** → **Health check**
- Should show: **Healthy 1 / Degraded 0**

## Troubleshooting Commands

### Check App Service Status

```bash
az webapp show \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod \
  --query "state"
```

### View Recent Logs

```bash
az webapp log tail \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod
```

### Check Environment Variables

```bash
az webapp config appsettings list \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod \
  --query "[].{Name:name, Value:value}" \
  --output table
```

### Test Database Connection

```bash
az webapp config appsettings list \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod \
  --query "[?name=='DATABASE_URL'].value" \
  --output tsv | \
  xargs -I {} psql {} -c "SELECT version();"
```

## Next Steps

1. ✅ Set GitHub Secrets (Step 1)
2. ✅ Verify Azure Configuration (Step 2)
3. ✅ Fix Health Check (Step 3)
4. ✅ Restart App Service (Step 4)
5. ✅ Test Deployment (Step 5)
6. ✅ Verify Everything Works (Step 6)

## Support

- **GitHub Actions Logs:** https://github.com/Vijayapardhu/risbow-backend/actions
- **Azure Portal:** https://portal.azure.com
- **Documentation:**
  - [GitHub Secrets Setup](./GITHUB_SECRETS_SETUP.md)
  - [Azure Deployment Guide](./AZURE_DEPLOYMENT.md)
  - [Environment Variables](./AZURE_ENV_VARIABLES.md)

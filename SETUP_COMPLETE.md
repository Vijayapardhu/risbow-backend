# Setup Complete - Next Steps

## ✅ Service Principal Created

Your Azure Service Principal has been created successfully. Now you need to set up GitHub Secrets.

## Step 1: Set GitHub Secrets

Go to: **https://github.com/Vijayapardhu/risbow-backend/settings/secrets/actions**

Click **"New repository secret"** for each of the following:

### Secret 1: `AZURE_CREDENTIALS`

**Name:** `AZURE_CREDENTIALS`  
**Value:** Paste the entire JSON you received from the `az ad sp create-for-rbac` command.

**⚠️ DO NOT commit this JSON to the repository.** It contains sensitive credentials.

Example format (replace with your actual values):
```json
{
  "clientId": "<your-client-id>",
  "clientSecret": "<your-client-secret>",
  "subscriptionId": "2ceebe32-f723-441c-b024-b250f48d26b1",
  "tenantId": "<your-tenant-id>",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

### Secret 2: `AZURE_APP_SERVICE_NAME`

**Name:** `AZURE_APP_SERVICE_NAME`  
**Value:** `risbow-api-prod-f4dua9fsc4d9hqgs`

### Secret 3: `AZURE_PUBLISH_PROFILE`   

**Name:** `AZURE_PUBLISH_PROFILE`  
**Value:** 
1. Go to **Azure Portal** → **App Service** (`risbow-api-prod-f4dua9fsc4d9hqgs`)
2. Click **Get publish profile** (top menu)
3. Download the `.PublishSettings` file
4. Open it in a text editor
5. Copy the entire XML content
6. Paste as the secret value

### Secret 4: `AZURE_DATABASE_URL`

**Name:** `AZURE_DATABASE_URL`  
**Value:** `postgresql://risbow_admin:<password>@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require`

**⚠️ Replace `<password>` with your actual database password. URL-encode special characters (e.g., `@` becomes `%40`).**

### Secret 5: `AZURE_APP_SERVICE_URL`

**Name:** `AZURE_APP_SERVICE_URL`  
**Value:** `https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net`

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

### 2.3 Verify NODE_ENV

1. Go to **Configuration** → **Application Settings**
2. Find `NODE_ENV`
3. Ensure it's set to `production` (not `development`)

## Step 3: Fix Health Check Issue

Your health check shows **0.00% (Healthy 0 / Degraded 1)**. Let's fix this:

### 3.1 Check Current Status

```bash
# View logs
az webapp log tail \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod
```

### 3.2 Test Health Endpoint

```bash
curl https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net/api/v1/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### 3.3 Common Issues

1. **App not listening on correct port:**
   - Verify startup command is `npm run start:prod` or `bash start.sh`
   - Check `main.ts` uses `process.env.PORT` and listens on `0.0.0.0`

2. **Database connection failing:**
   - Verify `DATABASE_URL` is correct in Azure App Service Configuration
   - Check firewall rules

3. **App crashing:**
   - Check logs for errors
   - Verify all environment variables are set

## Step 4: Restart App Service

After setting GitHub Secrets and verifying Azure configuration:

```bash
az webapp restart \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod
```

Or in Azure Portal:
- **App Service** → **Restart**

Wait 60-90 seconds.

## Step 5: Test Deployment

### 5.1 Manual Test

1. Go to **GitHub** → **Actions** → **Deploy to Azure App Service**
2. Click **Run workflow**
3. Select branch: `main` or `master`
4. Click **Run workflow**

### 5.2 Automatic Test

Push to `main` or `master`:

```bash
git add .
git commit -m "chore: setup GitHub Actions deployment"
git push origin main
```

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

### 6.3 Check Azure Portal

- **App Service** → **Health check**
- Should show: **Healthy 1 / Degraded 0**

## ⚠️ Security Reminders

1. **Never commit secrets** to version control
2. **Rotate secrets regularly** (especially `clientSecret` and `JWT_SECRET`)
3. **Limit Service Principal permissions** to only what's needed
4. **Review access logs** regularly

## Quick Reference

- **Resource Group:** `risbow-prod`
- **Subscription ID:** `2ceebe32-f723-441c-b024-b250f48d26b1`
- **App Service Name:** `risbow-api-prod-f4dua9fsc4d9hqgs`
- **GitHub Repo:** `https://github.com/Vijayapardhu/risbow-backend`
- **Health Check URL:** `https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net/api/v1/health`

## Support

- **GitHub Actions:** https://github.com/Vijayapardhu/risbow-backend/actions
- **Azure Portal:** https://portal.azure.com
- **Documentation:**
  - [Quick Setup Guide](./QUICK_SETUP.md)
  - [GitHub Secrets Setup](./GITHUB_SECRETS_SETUP.md)
  - [Azure Deployment Guide](./AZURE_DEPLOYMENT.md)

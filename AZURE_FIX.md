# Azure Application Error - Quick Fix Guide

## Problem
Azure App Service shows "Application Error" because it's trying to run the development server instead of the production build.

## Solution

### Step 1: Configure Startup Command in Azure Portal

1. Go to **Azure Portal** → **risbow-api-prod** → **Configuration** → **General Settings**
2. Scroll to **Startup Command**
3. Set it to:
   ```bash
   bash start.sh
   ```
   Or:
   ```bash
   npm run start:azure
   ```
4. Click **Save**
5. **Restart** the App Service

**Note**: The `start.sh` script will automatically build if `dist` folder is missing.

### Step 2: Verify Build Process

Ensure Azure is building the application:

1. Go to **Deployment Center** → **Logs**
2. Check that `npm run build` runs successfully
3. Verify `dist` folder exists after build

### Step 3: Check Logs

After restart, check **Log Stream**:
- You should see: `🚀 RISBOW Backend API Started Successfully`
- If you see errors, check:
  - Database connection
  - Redis connection
  - Missing environment variables

## Alternative: Use Azure CLI

```bash
az webapp config set \
  --resource-group <your-resource-group> \
  --name risbow-api-prod \
  --startup-file "node dist/main.js"
```

## Verification

After fixing:
1. Wait 1-2 minutes for restart
2. Visit: `https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net/health`
3. Should return: `{"status":"ok","timestamp":"..."}`

## Common Issues

### "Cannot find module 'dist/main.js'"
- **Cause**: Build didn't run or failed
- **Fix**: Check deployment logs, ensure `npm run build` succeeds

### "EADDRINUSE: address already in use"
- **Cause**: App already running
- **Fix**: Restart the App Service

### "Database connection failed"
- **Cause**: Missing or incorrect `DATABASE_URL` or `DB_*` variables
- **Fix**: Check Application Settings → Environment Variables

### "Redis connection failed"
- **Cause**: Missing or incorrect Redis credentials
- **Fix**: Check `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS`

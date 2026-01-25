# Quick Fix: Node.js Version in Azure

## Problem

You're seeing this error:
```
TypeError: ansiStyles.bgColor[levelMapping[level]][model] is not a function
```

**Root Cause**: Azure App Service is using Node.js v18.17.1, but the project requires Node.js 22.

## Immediate Fix

### Step 1: Set Node.js Version in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your App Service
3. Click **Configuration** → **General Settings**
4. Under **Stack Settings**:
   - **Stack**: `Node.js`
   - **Stack Version**: `22.x` (or `22-LTS` if available)
5. Click **Save** at the top
6. **Restart** the App Service

### Step 2: Verify

After restart, SSH into your App Service and verify:

```bash
node --version
# Should show: v22.x.x
```

### Step 3: Rebuild

```bash
npm run build
```

## Alternative: Azure CLI Method

If you prefer CLI:

```bash
# Set Node.js version
az webapp config appsettings set \
  --resource-group <your-resource-group> \
  --name <your-app-name> \
  --settings WEBSITE_NODE_DEFAULT_VERSION="~22"

# Restart
az webapp restart \
  --resource-group <your-resource-group> \
  --name <your-app-name>
```

## Why This Happens

- The project is configured for Node.js 22 (see `package.json` engines field)
- Azure App Service defaults to Node.js 18 or 20
- The `chalk` package (used by NestJS CLI) has compatibility issues with Node 18 when certain versions are used
- Node.js 22 resolves these compatibility issues

## After Fixing

Once Node.js 22 is set:
- ✅ Builds will work correctly
- ✅ All dependencies will be compatible
- ✅ No more `chalk` errors

## Documentation

For more details, see:
- [AZURE_NODE_VERSION.md](AZURE_NODE_VERSION.md) - Detailed Node.js configuration guide
- [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md) - Full deployment guide

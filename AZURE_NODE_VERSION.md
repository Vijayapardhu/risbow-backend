# Azure App Service: Node.js 22 Configuration

## Quick Fix for Node.js Version Mismatch

If you're seeing build errors like:
```
TypeError: ansiStyles.bgColor[levelMapping[level]][model] is not a function
```

This means Azure App Service is using Node.js 18, but the project requires Node.js 22.

## Solution: Configure Node.js 22 in Azure

### Method 1: Azure Portal (Recommended)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your App Service
3. Go to **Configuration** → **General Settings**
4. Under **Stack Settings**:
   - **Stack**: Select `Node.js`
   - **Stack Version**: Select `22.x` (or latest 22.x LTS available)
5. Click **Save**
6. **Restart** the App Service

### Method 2: Azure CLI

```bash
# Set Node.js version to 22
az webapp config appsettings set \
  --resource-group <your-resource-group> \
  --name <your-app-name> \
  --settings WEBSITE_NODE_DEFAULT_VERSION="~22"

# Restart the app
az webapp restart \
  --resource-group <your-resource-group> \
  --name <your-app-name>
```

### Method 3: Application Settings

Add this environment variable in Azure Portal → Configuration → Application Settings:

```
WEBSITE_NODE_DEFAULT_VERSION=~22
```

Then restart the App Service.

## Verify Node.js Version

After configuration, verify via SSH/Kudu:

```bash
# SSH into your App Service
# Then run:
node --version

# Should output: v22.x.x
```

## Build Command

After setting Node.js 22, your build should work:

```bash
npm run build
```

## Available Node.js Versions in Azure

Azure App Service supports:
- Node.js 18.x (LTS)
- Node.js 20.x (LTS)
- Node.js 22.x (Current LTS) ← **Use this**

Check available versions:
```bash
az webapp list-runtimes --os-type Linux | grep NODE
```

## Notes

- **Always restart** the App Service after changing Node.js version
- The version change takes effect on the next deployment/restart
- Build artifacts may need to be cleared if cached
- If using deployment slots, configure Node.js version for each slot

## Related Files

- `package.json` - Specifies `engines.node: ">=22.0.0"`
- `.nvmrc` - Contains `22` for local development
- `Dockerfile` - Uses `node:22-alpine`

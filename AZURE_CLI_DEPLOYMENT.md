# Azure CLI Deployment Guide

This guide shows how to deploy the RISBOW backend to Azure App Service using Azure CLI commands.

## Prerequisites

1. **Azure CLI installed:**
   ```bash
   # Check if installed
   az --version
   
   # Install if needed
   # Windows: https://aka.ms/installazurecliwindows
   # macOS: brew install azure-cli
   # Linux: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

2. **Logged into Azure:**
   ```bash
   az login
   ```

3. **Set subscription (if you have multiple):**
   ```bash
   az account set --subscription 2ceebe32-f723-441c-b024-b250f48d26b1
   ```

## Quick Deployment

### Step 1: Build the Application

```bash
cd risbow-backend

# Install dependencies
npm ci

# Generate Prisma Client
npx prisma generate

# Build the application
npm run build
```

### Step 2: Create Deployment Package

```bash
# Create a zip file with all necessary files
zip -r deploy.zip . \
  -x "*.git*" \
  -x "node_modules/.cache/*" \
  -x ".github/*" \
  -x "*.md" \
  -x ".editorconfig" \
  -x ".gitignore" \
  -x "coverage/*" \
  -x "*.log" \
  -x "dist/*"  # We'll include dist separately

# Add dist folder
cd dist && zip -r ../deploy.zip . && cd ..
```

**On Windows (PowerShell):**
```powershell
# Install 7-Zip or use Compress-Archive
Compress-Archive -Path dist,node_modules,package.json,package-lock.json,prisma,start.sh -DestinationPath deploy.zip -Force
```

### Step 3: Deploy to Azure App Service

```bash
# Deploy using Azure CLI
az webapp deploy \
  --resource-group risbow-prod \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --src-path deploy.zip \
  --type zip
```

## Complete Deployment Script

### Linux/macOS Script

Create `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting Azure CLI Deployment..."

# Configuration
RESOURCE_GROUP="risbow-prod"
APP_NAME="risbow-api-prod-f4dua9fsc4d9hqgs"
DEPLOY_PACKAGE="deploy.zip"

# Step 1: Build
echo "📦 Building application..."
npm ci
npx prisma generate
npm run build

# Step 2: Create deployment package
echo "📦 Creating deployment package..."
rm -f $DEPLOY_PACKAGE
zip -r $DEPLOY_PACKAGE . \
  -x "*.git*" \
  -x "node_modules/.cache/*" \
  -x ".github/*" \
  -x "*.md" \
  -x ".editorconfig" \
  -x ".gitignore" \
  -x "coverage/*" \
  -x "*.log"

# Step 3: Deploy
echo "🚀 Deploying to Azure..."
az webapp deploy \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --src-path $DEPLOY_PACKAGE \
  --type zip

# Step 4: Run migrations (optional - they also run in start.sh)
echo "🔄 Running database migrations..."
az webapp ssh --name $APP_NAME --resource-group $RESOURCE_GROUP --command "cd /home/site/wwwroot && npx prisma migrate deploy"

# Step 5: Verify
echo "✅ Verifying deployment..."
sleep 30
curl -f https://$APP_NAME.centralindia-01.azurewebsites.net/api/v1/health || echo "Health check failed"

echo "✅ Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
./deploy.sh
```

### Windows PowerShell Script

Create `deploy.ps1`:

```powershell
# Azure CLI Deployment Script for Windows

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Azure CLI Deployment..." -ForegroundColor Green

# Configuration
$RESOURCE_GROUP = "risbow-prod"
$APP_NAME = "risbow-api-prod-f4dua9fsc4d9hqgs"
$DEPLOY_PACKAGE = "deploy.zip"

# Step 1: Build
Write-Host "📦 Building application..." -ForegroundColor Yellow
npm ci
npx prisma generate
npm run build

# Step 2: Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
if (Test-Path $DEPLOY_PACKAGE) {
    Remove-Item $DEPLOY_PACKAGE -Force
}

# Include necessary files
$filesToInclude = @(
    "dist",
    "node_modules",
    "package.json",
    "package-lock.json",
    "prisma",
    "start.sh"
)

Compress-Archive -Path $filesToInclude -DestinationPath $DEPLOY_PACKAGE -Force

# Step 3: Deploy
Write-Host "🚀 Deploying to Azure..." -ForegroundColor Yellow
az webapp deploy `
  --resource-group $RESOURCE_GROUP `
  --name $APP_NAME `
  --src-path $DEPLOY_PACKAGE `
  --type zip

# Step 4: Verify
Write-Host "✅ Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 30
$healthUrl = "https://$APP_NAME.centralindia-01.azurewebsites.net/api/v1/health"
try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing
    Write-Host "✅ Health check passed!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Health check failed, but deployment completed" -ForegroundColor Yellow
}

Write-Host "✅ Deployment complete!" -ForegroundColor Green
```

Run it:
```powershell
.\deploy.ps1
```

## Alternative: Deploy from Local Directory

You can also deploy directly from a directory without creating a zip:

```bash
# Deploy from current directory
az webapp deploy \
  --resource-group risbow-prod \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --src-path . \
  --type zip
```

## Deploy Specific Files Only

Deploy only the built application:

```bash
# Deploy only dist folder
cd dist
zip -r ../dist.zip .
cd ..

az webapp deploy \
  --resource-group risbow-prod \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --src-path dist.zip \
  --type zip
```

## Run Migrations After Deployment

### Option 1: Via Azure CLI SSH

```bash
az webapp ssh \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod \
  --command "cd /home/site/wwwroot && npx prisma migrate deploy"
```

### Option 2: Via Kudu Console

1. Go to: `https://risbow-api-prod-f4dua9fsc4d9hqgs.scm.centralindia-01.azurewebsites.net`
2. Click **Debug Console** → **Bash**
3. Navigate to: `cd /home/site/wwwroot`
4. Run: `npx prisma migrate deploy`

### Option 3: Automatic (via start.sh)

Migrations run automatically when the app starts (already configured in `start.sh`).

## Verify Deployment

### Check App Status

```bash
az webapp show \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod \
  --query "{name:name, state:state, defaultHostName:defaultHostName}" \
  --output table
```

### Check Logs

```bash
# Stream logs
az webapp log tail \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod

# Download logs
az webapp log download \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod \
  --log-file app-logs.zip
```

### Test Health Endpoint

```bash
curl https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net/api/v1/health
```

## Environment Variables

Set environment variables via Azure CLI:

```bash
# Set single variable
az webapp config appsettings set \
  --resource-group risbow-prod \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --settings NODE_ENV=production

# Set multiple variables
az webapp config appsettings set \
  --resource-group risbow-prod \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --settings \
    NODE_ENV=production \
    PORT=3000 \
    BASE_URL=https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net
```

## Restart App Service

```bash
az webapp restart \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod
```

## Complete Deployment Workflow

```bash
#!/bin/bash
# Complete deployment workflow

# 1. Login (if not already)
az login

# 2. Set subscription
az account set --subscription 2ceebe32-f723-441c-b024-b250f48d26b1

# 3. Build
npm ci
npx prisma generate
npm run build

# 4. Create package
zip -r deploy.zip dist node_modules package.json package-lock.json prisma start.sh

# 5. Deploy
az webapp deploy \
  --resource-group risbow-prod \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --src-path deploy.zip \
  --type zip

# 6. Restart
az webapp restart \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod

# 7. Check status
az webapp show \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod \
  --query "state"
```

## Troubleshooting

### Deployment Fails

```bash
# Check deployment status
az webapp deployment list \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod

# View deployment logs
az webapp log tail \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod
```

### App Not Starting

```bash
# Check startup command
az webapp config show \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod \
  --query "linuxFxVersion"

# Set startup command
az webapp config set \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod \
  --startup-file "bash start.sh"
```

### Database Connection Issues

Migrations run from Azure App Service (via `start.sh`), which can access private endpoints. If migrations fail:

```bash
# Check app logs
az webapp log tail \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod

# Run migrations manually via SSH
az webapp ssh \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod \
  --command "cd /home/site/wwwroot && npx prisma migrate deploy"
```

## Advantages of Azure CLI Deployment

- ✅ **Direct control** - No GitHub Actions needed
- ✅ **Fast iteration** - Deploy quickly during development
- ✅ **Local testing** - Test deployment process locally
- ✅ **Flexible** - Easy to customize deployment steps
- ✅ **Debugging** - Can SSH into app and debug issues

## Comparison: Azure CLI vs GitHub Actions

| Feature | Azure CLI | GitHub Actions |
|---------|-----------|----------------|
| Speed | Fast (direct) | Slower (build + deploy) |
| Automation | Manual | Automatic on push |
| Migrations | Manual or via start.sh | Via start.sh |
| CI/CD | No | Yes |
| Best for | Development, quick deploys | Production, automated |

## Next Steps

1. **For development:** Use Azure CLI for quick deployments
2. **For production:** Use GitHub Actions for automated deployments
3. **For migrations:** They run automatically in `start.sh` on both methods

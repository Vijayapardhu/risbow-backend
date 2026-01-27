# Azure CLI Deployment Script for Windows PowerShell
# Deploys RISBOW backend to Azure App Service

$ErrorActionPreference = "Stop"

# Configuration
$RESOURCE_GROUP = "risbow-prod"
$APP_NAME = "risbow-api-prod-f4dua9fsc4d9hqgs"
$DEPLOY_PACKAGE = "deploy.zip"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 RISBOW Backend - Azure CLI Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Azure CLI
try {
    $null = az --version 2>&1
} catch {
    Write-Host "❌ Error: Azure CLI not found. Install it first:" -ForegroundColor Red
    Write-Host "   https://aka.ms/installazurecliwindows" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
try {
    $null = az account show 2>&1
} catch {
    Write-Host "🔐 Logging into Azure..." -ForegroundColor Yellow
    az login
}

# Set subscription
Write-Host "📋 Setting subscription..." -ForegroundColor Yellow
az account set --subscription 2ceebe32-f723-441c-b024-b250f48d26b1

# Step 1: Build
Write-Host ""
Write-Host "📦 Step 1: Building application..." -ForegroundColor Yellow
npm ci
npx prisma generate
npm run build

# Step 2: Create deployment package
Write-Host ""
Write-Host "📦 Step 2: Creating deployment package..." -ForegroundColor Yellow
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
Write-Host "✅ Package created: $DEPLOY_PACKAGE" -ForegroundColor Green

# Step 3: Deploy
Write-Host ""
Write-Host "🚀 Step 3: Deploying to Azure App Service..." -ForegroundColor Yellow
az webapp deploy `
  --resource-group $RESOURCE_GROUP `
  --name $APP_NAME `
  --src-path $DEPLOY_PACKAGE `
  --type zip

Write-Host "✅ Deployment completed!" -ForegroundColor Green

# Step 4: Restart app
Write-Host ""
Write-Host "🔄 Step 4: Restarting App Service..." -ForegroundColor Yellow
az webapp restart `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP

Write-Host "✅ App Service restarted!" -ForegroundColor Green

# Step 5: Wait and verify
Write-Host ""
Write-Host "⏳ Step 5: Waiting for app to start (60 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

Write-Host ""
Write-Host "🔍 Step 6: Verifying deployment..." -ForegroundColor Yellow
$HEALTH_URL = "https://$APP_NAME.centralindia-01.azurewebsites.net/api/v1/health"

try {
    $response = Invoke-WebRequest -Uri $HEALTH_URL -UseBasicParsing
    Write-Host "✅ Health check passed!" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "⚠️  Health check failed. Check logs:" -ForegroundColor Yellow
    Write-Host "   az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🌐 App URL: https://$APP_NAME.centralindia-01.azurewebsites.net" -ForegroundColor Cyan
Write-Host "📚 API Docs: https://$APP_NAME.centralindia-01.azurewebsites.net/api/docs" -ForegroundColor Cyan
Write-Host "❤️  Health: https://$APP_NAME.centralindia-01.azurewebsites.net/api/v1/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Note: Database migrations run automatically in start.sh" -ForegroundColor Gray
Write-Host ""

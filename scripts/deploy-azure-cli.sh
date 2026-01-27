#!/bin/bash
# Azure CLI Deployment Script
# Deploys RISBOW backend to Azure App Service

set -e

# Configuration
RESOURCE_GROUP="risbow-prod"
APP_NAME="risbow-api-prod-f4dua9fsc4d9hqgs"
DEPLOY_PACKAGE="deploy.zip"

echo "=========================================="
echo "🚀 RISBOW Backend - Azure CLI Deployment"
echo "=========================================="

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo "❌ Error: Azure CLI not found. Install it first: https://aka.ms/installazurecli"
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    echo "🔐 Logging into Azure..."
    az login
fi

# Set subscription
echo "📋 Setting subscription..."
az account set --subscription 2ceebe32-f723-441c-b024-b250f48d26b1

# Step 1: Build
echo ""
echo "📦 Step 1: Building application..."
npm ci
npx prisma generate
npm run build

# Step 2: Create deployment package
echo ""
echo "📦 Step 2: Creating deployment package..."
rm -f $DEPLOY_PACKAGE

# Create zip with necessary files
zip -r $DEPLOY_PACKAGE . \
  -x "*.git*" \
  -x "node_modules/.cache/*" \
  -x ".github/*" \
  -x "*.md" \
  -x ".editorconfig" \
  -x ".gitignore" \
  -x "coverage/*" \
  -x "*.log" \
  -x "deploy.zip" || true

echo "✅ Package created: $DEPLOY_PACKAGE"

# Step 3: Deploy
echo ""
echo "🚀 Step 3: Deploying to Azure App Service..."
az webapp deploy \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --src-path $DEPLOY_PACKAGE \
  --type zip

echo "✅ Deployment completed!"

# Step 4: Restart app
echo ""
echo "🔄 Step 4: Restarting App Service..."
az webapp restart \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP

echo "✅ App Service restarted!"

# Step 5: Wait and verify
echo ""
echo "⏳ Step 5: Waiting for app to start (60 seconds)..."
sleep 60

echo ""
echo "🔍 Step 6: Verifying deployment..."
HEALTH_URL="https://$APP_NAME.centralindia-01.azurewebsites.net/api/v1/health"

if curl -f -s "$HEALTH_URL" > /dev/null; then
    echo "✅ Health check passed!"
    curl -s "$HEALTH_URL" | jq . || curl -s "$HEALTH_URL"
else
    echo "⚠️  Health check failed. Check logs:"
    echo "   az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
fi

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo "🌐 App URL: https://$APP_NAME.centralindia-01.azurewebsites.net"
echo "📚 API Docs: https://$APP_NAME.centralindia-01.azurewebsites.net/api/docs"
echo "❤️  Health: https://$APP_NAME.centralindia-01.azurewebsites.net/api/v1/health"
echo ""
echo "📝 Note: Database migrations run automatically in start.sh"
echo ""

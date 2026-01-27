#!/bin/bash
# Script to set Azure App Service environment variables
# Usage: ./scripts/set-azure-env-vars.sh <resource-group> <app-service-name>

set -e

RESOURCE_GROUP=$1
APP_SERVICE_NAME=$2

if [ -z "$RESOURCE_GROUP" ] || [ -z "$APP_SERVICE_NAME" ]; then
  echo "Usage: $0 <resource-group> <app-service-name>"
  exit 1
fi

echo "Setting environment variables for $APP_SERVICE_NAME in $RESOURCE_GROUP..."

# Read variables from AZURE_ENV_VARIABLES.md or set them here
# This is a template - replace with actual values

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE_NAME" \
  --settings \
    NODE_ENV=production \
    BASE_URL="https://$APP_SERVICE_NAME.azurewebsites.net" \
    PORT=3000 \
    WEBSITE_HEALTHCHECK_MAXPINGFAILURES=10 \
    THROTTLE_TTL=60000 \
    THROTTLE_LIMIT=100000 \
    REDIS_PORT=6380 \
    REDIS_TLS=true \
    DB_PORT=5432 \
    DB_SSL=true \
    DB_NAME=postgres \
    AZURE_STORAGE_CONTAINER_PRODUCTS=products \
    AZURE_STORAGE_CONTAINER_USERS=users \
    AZURE_STORAGE_CONTAINER_VIDEOS=videos \
    ApplicationInsightsAgent_EXTENSION_VERSION="~3" \
    XDT_MicrosoftApplicationInsights_Mode=default

echo ""
echo "✅ Basic environment variables set."
echo ""
echo "⚠️  IMPORTANT: You must manually set these sensitive variables:"
echo "   - DATABASE_URL (or DB_HOST, DB_USER, DB_PASSWORD)"
echo "   - REDIS_HOST, REDIS_PASSWORD"
echo "   - AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY"
echo "   - JWT_SECRET"
echo "   - RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET"
echo "   - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY"
echo "   - APPLICATIONINSIGHTS_CONNECTION_STRING"
echo ""
echo "Set them via Azure Portal or use:"
echo "  az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $APP_SERVICE_NAME --settings KEY=value"

#!/bin/bash
# Azure App Service Startup Script
# This script ensures the application starts correctly in production

set -e

echo "=========================================="
echo "🚀 RISBOW Backend - Starting Application"
echo "=========================================="

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist folder not found. Running build..."
    npm run build
fi

# Check if main.js exists
if [ ! -f "dist/main.js" ]; then
    echo "❌ Error: dist/main.js not found. Running build..."
    npm run build
fi

# Set Node.js to production mode if not set
export NODE_ENV=${NODE_ENV:-production}

# Log environment info
echo "📦 Node.js version: $(node --version)"
echo "📦 NPM version: $(npm --version)"
echo "🌍 Environment: $NODE_ENV"
echo "🔌 Port: ${PORT:-3000}"
echo ""

# Start the application
echo "▶️  Starting application..."
exec node dist/main.js

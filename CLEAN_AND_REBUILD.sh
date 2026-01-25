#!/bin/bash
# Complete clean and rebuild script for Azure/Linux
# This script removes everything and does a fresh install

set -e  # Exit on error

echo "🚀 Starting complete clean and rebuild..."

# Step 1: Remove node_modules
echo "📦 Removing node_modules..."
rm -rf node_modules

# Step 2: Remove package-lock.json
echo "📄 Removing package-lock.json..."
rm -f package-lock.json

# Step 3: Clear npm cache
echo "🗑️  Clearing npm cache..."
npm cache clean --force

# Step 4: Fresh install
echo "📥 Installing dependencies..."
npm install

# Step 5: Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Step 6: Build
echo "🏗️  Building application..."
FORCE_COLOR=0 npm run build || npm run build

echo "✅ Build complete!"
echo ""
echo "Verification:"
ls -la dist/ 2>/dev/null && echo "✅ dist/ folder exists" || echo "⚠️  dist/ folder not found"

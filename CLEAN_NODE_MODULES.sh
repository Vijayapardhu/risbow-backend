#!/bin/bash
# Clean Node.js dependencies and cache
# Run this script to remove all node_modules and related files

echo "🧹 Cleaning Node.js dependencies..."

# Remove node_modules
echo "Removing node_modules..."
rm -rf node_modules

# Remove package-lock.json
echo "Removing package-lock.json..."
rm -f package-lock.json

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

# Remove .next (if exists - for Next.js projects)
echo "Removing .next directory (if exists)..."
rm -rf .next

# Remove dist folder (optional - uncomment if you want to remove build artifacts)
# echo "Removing dist directory..."
# rm -rf dist

# Remove coverage (if exists)
echo "Removing coverage directory (if exists)..."
rm -rf coverage

echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Run: npm install"
echo "2. Run: npm run build"

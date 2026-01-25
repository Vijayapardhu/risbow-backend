# Fix Chalk Error on Azure - Immediate Solutions

## Problem

Even with Node.js 22, you're getting:
```
TypeError: ansiStyles.bgColor[levelMapping[level]][model] is not a function
```

This is a `chalk` package compatibility issue with NestJS CLI.

## Quick Fixes (Try in Order)

### Solution 1: Use .npmrc (Already Applied)

I've created `.npmrc` with `color=false`. This should disable colors globally.

**Try now:**
```bash
npm run build
```

### Solution 2: Clear node_modules and Reinstall

```bash
# Remove everything
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Fresh install
npm install

# Build
npm run build
```

### Solution 3: Update @nestjs/cli

```bash
# Update NestJS CLI to latest
npm install --save-dev @nestjs/cli@latest

# Rebuild
npm run build
```

### Solution 4: Use Environment Variable in Build Script

If `.npmrc` doesn't work, modify `package.json` build script:

```json
{
  "scripts": {
    "build": "prisma generate && FORCE_COLOR=0 nest build"
  }
}
```

### Solution 5: Direct nest build with flags

```bash
# Skip the npm script, run directly
npx prisma generate
FORCE_COLOR=0 npx nest build
```

## For Azure App Service

If this happens during Azure deployment, you can:

1. **Set environment variable in Azure:**
   - Go to Configuration → Application Settings
   - Add: `FORCE_COLOR` = `0`
   - Or: `NO_COLOR` = `1`

2. **Or modify startup command:**
   - In Azure Portal → Configuration → General Settings
   - Startup Command: `FORCE_COLOR=0 npm run build && npm run start:prod`

## Root Cause

This happens when:
- `chalk` version is incompatible with how NestJS CLI uses it
- Multiple versions of `chalk` in dependency tree
- Node.js module resolution finds wrong version

## Verification

After applying fix, verify:
```bash
# Should build without errors
npm run build

# Check if dist folder created
ls -la dist/
```

## Alternative: Build Locally and Deploy

If Azure build keeps failing:

1. Build locally (where it works)
2. Deploy the `dist` folder to Azure
3. Skip build step in Azure deployment

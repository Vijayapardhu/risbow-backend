# Fix Chalk Error with NestJS CLI

## Problem

Even with Node.js 22, you're getting:
```
TypeError: ansiStyles.bgColor[levelMapping[level]][model] is not a function
```

This is a known compatibility issue between `chalk` and `@nestjs/cli` versions.

## Solutions

### Solution 1: Clear and Reinstall Dependencies (Recommended)

```bash
# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Reinstall
npm install

# Try build again
npm run build
```

### Solution 2: Update @nestjs/cli

```bash
# Update to latest NestJS CLI
npm install --save-dev @nestjs/cli@latest

# Rebuild
npm run build
```

### Solution 3: Disable Colors (Quick Workaround)

Set environment variable to disable colored output:

```bash
# Disable colors
NO_COLOR=1 npm run build

# Or permanently
export NO_COLOR=1
npm run build
```

### Solution 4: Use NODE_OPTIONS

```bash
NODE_OPTIONS="--no-warnings" npm run build
```

### Solution 5: Force Reinstall chalk

```bash
# Remove chalk
npm uninstall chalk

# Reinstall latest
npm install --save-dev chalk@latest

# Rebuild
npm run build
```

## Recommended Approach

Try in this order:

1. **Clear and reinstall** (Solution 1)
2. **Update @nestjs/cli** (Solution 2)
3. **Disable colors** (Solution 3) - if you just need to build

## For Azure Deployment

If this happens during Azure build, add to your build command:

```bash
# In Azure App Service → Configuration → General Settings → Startup Command
NO_COLOR=1 npm run build
```

Or update your `package.json` build script:

```json
{
  "scripts": {
    "build": "NO_COLOR=1 prisma generate && nest build"
  }
}
```

## Root Cause

This error occurs when:
- `chalk` version is incompatible with how NestJS CLI uses it
- Node.js module resolution finds an incompatible `chalk` version
- `node_modules` has corrupted or mixed versions

The fix is usually clearing `node_modules` and reinstalling fresh dependencies.

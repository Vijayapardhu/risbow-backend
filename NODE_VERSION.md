# Node.js Version Configuration

## Current Version

This project uses **Node.js 22.x** as the required runtime version.

## Version Management

### Using nvm (Node Version Manager)

If you're using `nvm`, the project includes a `.nvmrc` file:

```bash
# Install and use Node 22
nvm install 22
nvm use
```

### Manual Installation

Download and install Node.js 22 from [nodejs.org](https://nodejs.org/).

Verify your installation:
```bash
node --version  # Should show v22.x.x
npm --version   # Should show 10.x.x or higher
```

## Configuration Files

The following files specify Node.js 22:

- **`.nvmrc`** - For nvm users
- **`package.json`** - `engines.node: ">=22.0.0"`
- **`Dockerfile`** - `FROM node:22-alpine`
- **`.github/workflows/*.yml`** - All CI/CD workflows use `node-version: '22.x'`

## Azure App Service

Azure App Service (Linux) supports Node.js 22. Ensure your App Service is configured with:

- **Stack**: Node.js
- **Version**: 22.x (LTS)

You can verify this in:
- Azure Portal → App Service → Configuration → General Settings → Stack Settings

## Docker

The Dockerfile uses `node:22-alpine` for all build stages:
- Development
- Build
- Production

## CI/CD

All GitHub Actions workflows are configured to use Node.js 22:
- `ci.yml` - Main CI pipeline
- `pr-checks.yml` - Pull request validation
- `database-migrations.yml` - Database migration workflows
- `release.yml` - Release management

## Compatibility

### Dependencies

All dependencies are compatible with Node.js 22:
- NestJS 10.x ✅
- Prisma 5.x ✅
- TypeScript 5.x ✅
- All other dependencies tested and compatible ✅

### Breaking Changes from Node 20

Node.js 22 is largely backward compatible with Node 20. However, be aware of:
- Updated V8 engine
- Performance improvements
- Security updates
- Updated OpenSSL version

## Troubleshooting

### Version Mismatch Error

If you see an error about Node version:
```bash
# Check your current version
node --version

# Use nvm to switch
nvm use

# Or install Node 22
nvm install 22
```

### Azure Deployment Issues

If Azure App Service shows version errors:
1. Check App Service Configuration → General Settings
2. Ensure Stack is set to "Node.js" and Version is "22.x"
3. Restart the App Service after changing settings

### Docker Build Issues

If Docker build fails:
```bash
# Ensure you're using the correct base image
docker build -t risbow-backend .
```

The Dockerfile explicitly uses `node:22-alpine`, so this should work automatically.

## Updating Node Version

To update to a newer Node.js version in the future:

1. Update `.nvmrc`:
   ```bash
   echo "23" > .nvmrc
   ```

2. Update `package.json`:
   ```json
   "engines": {
     "node": ">=23.0.0"
   }
   ```

3. Update `Dockerfile`:
   ```dockerfile
   FROM node:23-alpine As development
   ```

4. Update all GitHub Actions workflows:
   ```yaml
   node-version: '23.x'
   ```

5. Test thoroughly before deploying

# Azure App Service Startup Configuration

## Critical: Startup Command

Azure App Service must use the **production startup script** to run the built application.

### Option 1: Use Startup Script (Recommended)

1. Go to **Azure Portal** → Your App Service → **Configuration** → **General Settings**
2. Set **Startup Command** to:
   ```bash
   bash start.sh
   ```
   Or:
   ```bash
   npm run start:azure
   ```
3. Click **Save** and **Restart** the app

### Option 2: Direct Node Command

1. Go to **Azure Portal** → Your App Service → **Configuration** → **General Settings**
2. Set **Startup Command** to:
   ```bash
   node dist/main.js
   ```
3. Click **Save** and **Restart** the app

### Option 2: Set via Environment Variable

Add to **Application Settings**:
```
SCM_COMMAND_IDLE_TIMEOUT=600
WEBSITE_NODE_DEFAULT_VERSION=~22
```

And set **Startup Command** in General Settings to:
```
node dist/main.js
```

### Option 3: Use package.json start script (Not Recommended)

If you want to use `npm start`, update `package.json`:
```json
"scripts": {
  "start": "node dist/main.js"
}
```

**⚠️ WARNING**: This will break local development. Better to configure Azure directly.

## Build Process

Azure App Service will:
1. Run `npm install` (or `npm ci` if `package-lock.json` exists)
2. Run `npm run build` (if configured)
3. Run the **Startup Command**

## Verification

After setting the startup command:
1. Restart the App Service
2. Check **Log Stream** - you should see:
   ```
   🚀 RISBOW Backend API Started Successfully
   📡 Listening on: 0.0.0.0:8080
   ```
3. Visit: `https://<app-name>.azurewebsites.net/health`

## Common Issues

### Issue: "Application Error"
- **Cause**: Wrong startup command (trying to run `nest start` instead of `node dist/main.js`)
- **Fix**: Set startup command to `node dist/main.js`

### Issue: "Cannot find module"
- **Cause**: Build didn't run or `dist` folder missing
- **Fix**: Ensure `npm run build` runs during deployment

### Issue: "Port already in use"
- **Cause**: Multiple processes trying to use same port
- **Fix**: Ensure only one startup command is set

### Issue: "EADDRINUSE"
- **Cause**: App already running
- **Fix**: Restart the App Service

## Deployment Checklist

- [ ] Startup command set to `node dist/main.js`
- [ ] Node.js version set to 22.x
- [ ] Build process configured (or deploy pre-built artifacts)
- [ ] Environment variables set
- [ ] Database connection string configured
- [ ] Redis connection configured
- [ ] Health check endpoint accessible

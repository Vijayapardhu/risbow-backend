# Azure Environment Variables Troubleshooting

## Problem

Environment variables set in Azure App Service are not being read by the application.

## Common Causes

### 1. Application Not Restarted
**Most Common Issue**: After setting environment variables in Azure Portal, the application must be restarted.

**Solution:**
1. Go to Azure Portal → Your App Service → Overview
2. Click **"Restart"** button
3. Wait for the app to restart (usually 1-2 minutes)

### 2. Environment Variable Not Applied
**Issue**: Changes were made but not saved.

**Solution:**
1. Go to Azure Portal → Configuration → Application settings
2. Make sure you clicked **"Save"** after adding/editing variables
3. Azure will prompt you to restart - click **"Continue"**

### 3. Variable Name Typo
**Issue**: Variable name doesn't match exactly (case-sensitive).

**Solution:**
- Check variable names are exact: `DATABASE_URL` (not `database_url` or `Database_Url`)
- Common variables:
  - `DATABASE_URL`
  - `DB_HOST`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_NAME`
  - `DB_PORT`
  - `DB_SSL`

### 4. Value Truncated or Invalid
**Issue**: Value might be cut off or have special characters not properly encoded.

**Solution:**
- Check the full value is set (not truncated)
- For `DATABASE_URL`, ensure it's complete:
  ```
  postgresql://user:password@host:5432/database?sslmode=require
  ```
- Special characters in passwords should be URL-encoded:
  - `@` becomes `%40`
  - `#` becomes `%23`
  - etc.

### 5. Slot-Specific Settings
**Issue**: Variables set in one deployment slot don't apply to others.

**Solution:**
- Check if you're using deployment slots
- Set variables for the correct slot (Production, Staging, etc.)
- Or use "Deployment slot setting" option if you want variables to swap with slots

## Debugging

The application now includes debug logging that shows which environment variables are available:

```
Environment variables status:
  DATABASE_URL: SET (length: 123)
  DB_HOST: risbow-postgres-prod.postgres.database.azure.com
  DB_USER: SET
  DB_PASSWORD: SET
  DB_NAME: postgres
  DB_PORT: 5432
  DB_SSL: true
```

If you see "NOT SET" for required variables, check:
1. Variable is set in Azure Portal
2. Application was restarted after setting
3. Variable name is correct (case-sensitive)

## Verification Steps

1. **Check Azure Portal:**
   - Go to Configuration → Application settings
   - Verify `DATABASE_URL` or `DB_*` variables are listed
   - Click "Show value" to verify the value is correct

2. **Check Application Logs:**
   - Go to Log stream or Application Insights
   - Look for the debug output showing environment variable status
   - Check for error messages

3. **Test Connection:**
   - After restart, check if the application starts successfully
   - Look for: `✅ Database connected successfully`

## Quick Fix Checklist

- [ ] Environment variables are set in Azure Portal
- [ ] Clicked "Save" after setting variables
- [ ] Application was restarted after saving
- [ ] Variable names are correct (case-sensitive)
- [ ] Values are complete (not truncated)
- [ ] Special characters are URL-encoded in `DATABASE_URL`
- [ ] Checked the correct deployment slot

## Example: Setting DATABASE_URL

1. Go to Azure Portal → risbow-api-prod → Configuration
2. Click "+ New application setting"
3. Name: `DATABASE_URL`
4. Value: `postgresql://risbow_admin:Pardhu%402008@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require`
5. Click "OK"
6. Click "Save" at the top
7. Click "Continue" when prompted to restart
8. Wait for restart to complete
9. Check Log stream for: `✅ Database connected successfully`

## Related Files

- `src/prisma/prisma.service.ts` - Database connection service with debug logging
- `src/prisma/prisma.module.ts` - Prisma module with ConfigModule import
- `AZURE_ENV_VARIABLES.md` - Complete list of required environment variables

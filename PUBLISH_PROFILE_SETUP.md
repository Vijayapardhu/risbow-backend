# Publish Profile Setup - Exact Steps

## Your Publish Profile

Your publish profile has been verified. Here's how to set it up correctly:

## Step 1: Prepare the Full XML

The publish profile you provided is correct, but you need to include the XML declaration at the beginning:

```xml
<?xml version="1.0" encoding="utf-8"?>
<publishData>
  <publishProfile profileName="risbow-api-prod - Web Deploy" publishMethod="MSDeploy" publishUrl="risbow-api-prod-f4dua9fsc4d9hqgs.scm.centralindia-01.azurewebsites.net:443" msdeploySite="risbow-api-prod" userName="$risbow-api-prod" userPWD="d3vAdazwPu95oll6njy0pwuhvjER9vj15oZHA0iPNwF9eeRAHWsljlLQbkxw" destinationAppUrl="https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net" SQLServerDBConnectionString="" mySQLDBConnectionString="" hostingProviderForumLink="" controlPanelLink="https://portal.azure.com" webSystem="WebSites">
    <databases />
  </publishProfile>
  <publishProfile profileName="risbow-api-prod - FTP" publishMethod="FTP" publishUrl="ftp://waws-prod-pn1-037.ftp.azurewebsites.windows.net/site/wwwroot" ftpPassiveMode="True" userName="REDACTED" userPWD="REDACTED" destinationAppUrl="https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net" SQLServerDBConnectionString="REDACTED" mySQLDBConnectionString="" hostingProviderForumLink="" controlPanelLink="https://portal.azure.com" webSystem="WebSites">
    <databases />
  </publishProfile>
  <publishProfile profileName="risbow-api-prod - Zip Deploy" publishMethod="ZipDeploy" publishUrl="risbow-api-prod-f4dua9fsc4d9hqgs.scm.centralindia-01.azurewebsites.net:443" userName="$risbow-api-prod" userPWD="d3vAdazwPu95oll6njy0pwuhvjER9vj15oZHA0iPNwF9eeRAHWsljlLQbkxw" destinationAppUrl="https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net" SQLServerDBConnectionString="" mySQLDBConnectionString="" hostingProviderForumLink="" controlPanelLink="https://portal.azure.com" webSystem="WebSites">
    <databases />
  </publishProfile>
</publishData>
```

## Step 2: Update GitHub Secret

1. **Go to GitHub:**
   - https://github.com/Vijayapardhu/risbow-backend/settings/secrets/actions

2. **Update `AZURE_PUBLISH_PROFILE`:**
   - Click on `AZURE_PUBLISH_PROFILE`
   - Click **"Update"**
   - **Delete ALL existing content**
   - **Paste the ENTIRE XML above** (including `<?xml version="1.0" encoding="utf-8"?>`)
   - Click **"Update secret"**

## Step 3: Verify App Service Name

Ensure this secret is set correctly:
- **Secret Name:** `AZURE_APP_SERVICE_NAME`
- **Value:** `risbow-api-prod-f4dua9fsc4d9hqgs`

**Note:** The publish profile uses `msdeploySite="risbow-api-prod"` (shorter name), but the `AZURE_APP_SERVICE_NAME` should be the full name: `risbow-api-prod-f4dua9fsc4d9hqgs`. This is normal - Azure uses different names internally.

## Step 4: Re-run Deployment

1. Go to **Actions** → **Deploy to Azure App Service**
2. Click **"Re-run all jobs"**

Or trigger a new deployment:
```bash
git commit --allow-empty -m "trigger: retry deployment with updated publish profile"
git push
```

## Verification

After updating, the deployment should succeed. The workflow will:
1. ✅ Build the application
2. ✅ Deploy to Azure App Service
3. ✅ Run database migrations
4. ✅ Verify health check

## Important Notes

- **Keep the publish profile secret** - it contains credentials
- **Don't commit it to the repository** - it's already in GitHub Secrets
- **The profile includes 3 deployment methods:**
  - Web Deploy (MSDeploy) - used by GitHub Actions
  - FTP - alternative method
  - Zip Deploy - alternative method

The GitHub Actions workflow will automatically use the correct method (Web Deploy/MSDeploy).

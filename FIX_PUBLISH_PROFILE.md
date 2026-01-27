# Fix: Invalid Publish Profile Error

## Error Message

```
Error: Deployment Failed, Error: Publish profile is invalid for app-name and slot-name provided. 
Provide correct publish profile credentials for app.
```

## Root Cause

The `AZURE_PUBLISH_PROFILE` secret in GitHub is either:
- Not set correctly
- Invalid or expired
- Doesn't match the app service name
- Wrong format

## Solution

### Step 1: Get the Correct Publish Profile

1. **Go to Azure Portal:**
   - Navigate to: https://portal.azure.com
   - Find your App Service: `risbow-api-prod-f4dua9fsc4d9hqgs`
   - Resource Group: `risbow-prod`

2. **Download Publish Profile:**
   - Click on your App Service
   - In the top menu, click **"Get publish profile"** (or **"Overview"** → **"Get publish profile"**)
   - A `.PublishSettings` file will download

3. **Extract the XML Content:**
   - Open the downloaded `.PublishSettings` file in a text editor (Notepad, VS Code, etc.)
   - **Copy the ENTIRE XML content** (from `<?xml version="1.0"?>` to the closing `</publishData>`)

### Step 2: Update GitHub Secret

1. **Go to GitHub Repository:**
   - Navigate to: https://github.com/Vijayapardhu/risbow-backend/settings/secrets/actions

2. **Update the Secret:**
   - Find `AZURE_PUBLISH_PROFILE` in the list
   - Click **"Update"** (or delete and create new)
   - **Paste the ENTIRE XML content** from the `.PublishSettings` file
   - Click **"Update secret"**

### Step 3: Verify App Service Name

Ensure the `AZURE_APP_SERVICE_NAME` secret matches exactly:
- **Secret Name:** `AZURE_APP_SERVICE_NAME`
- **Value:** `risbow-api-prod-f4dua9fsc4d9hqgs`

### Step 4: Re-run the Workflow

1. Go to **Actions** tab in GitHub
2. Find the failed workflow run
3. Click **"Re-run all jobs"**

Or trigger a new deployment by pushing a commit:
```bash
git commit --allow-empty -m "trigger: retry Azure deployment"
git push
```

## Alternative: Use Service Principal Instead

If publish profile continues to fail, you can use Azure Service Principal authentication instead.

### Update Workflow to Use Service Principal

The workflow already uses `AZURE_CREDENTIALS` for authentication. We can modify it to not require publish profile.

However, the `azure/webapps-deploy@v3` action requires either:
- `publish-profile` (what we're using)
- OR `package` with proper authentication

Since we already have `AZURE_CREDENTIALS` set up, we can use the package deployment method.

## Troubleshooting

### Check Publish Profile Format

The publish profile should look like this:
```xml
<?xml version="1.0" encoding="utf-8"?>
<publishData>
  <publishProfile profileName="risbow-api-prod-f4dua9fsc4d9hqgs - Web Deploy" 
                  publishMethod="MSDeploy" 
                  publishUrl="risbow-api-prod-f4dua9fsc4d9hqgs.scm.centralindia-01.azurewebsites.net:443" 
                  msdeploySite="risbow-api-prod-f4dua9fsc4d9hqgs" 
                  userName="$risbow-api-prod-f4dua9fsc4d9hqgs" 
                  userPWD="[password]" 
                  destinationAppUrl="https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net" 
                  SQLServerDBConnectionString="" 
                  mySQLDBConnectionString="" 
                  hostingProviderForumLink="" 
                  controlPanelLink="https://portal.azure.com" 
                  webSystem="WebSites">
    <databases />
  </publishProfile>
  ...
</publishData>
```

### Verify App Service Exists

```bash
az webapp show \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod
```

### Test Publish Profile Locally

You can test if the publish profile works:
```bash
# Install Azure CLI if not already installed
az login

# Test deployment (dry run)
az webapp deployment source config-zip \
  --resource-group risbow-prod \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --src dist.zip
```

## Quick Fix Checklist

- [ ] Downloaded fresh publish profile from Azure Portal
- [ ] Copied ENTIRE XML content (not just part of it)
- [ ] Updated `AZURE_PUBLISH_PROFILE` secret in GitHub
- [ ] Verified `AZURE_APP_SERVICE_NAME` is correct
- [ ] Re-ran the workflow

## Still Having Issues?

If the publish profile still doesn't work:

1. **Regenerate Publish Profile:**
   - In Azure Portal, go to App Service → **Configuration** → **General Settings**
   - Click **"Reset publish profile"** (if available)
   - Download a new publish profile

2. **Check App Service Status:**
   - Ensure the App Service is running
   - Check if there are any restrictions or locks

3. **Use Alternative Deployment Method:**
   - Consider using Azure CLI deployment instead
   - Or use GitHub Actions with Azure Service Principal only

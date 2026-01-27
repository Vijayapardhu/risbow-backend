# Fix: Publish Profile Invalid Error

## Error
```
Error: Deployment Failed, Error: Publish profile is invalid for app-name and slot-name provided. 
Provide correct publish profile credentials for app.
```

## Root Causes & Solutions

### Issue 1: Slot Name Mismatch

**Problem:** The workflow was using `slot-name: production`, but if your App Service doesn't have a deployment slot named "production" (only the default slot), this will fail.

**Solution:** I've removed the `slot-name` parameter from the workflow. The default slot will be used automatically.

### Issue 2: App Name Mismatch

**Problem:** The publish profile shows `msdeploySite="risbow-api-prod"` but your app name is `risbow-api-prod-f4dua9fsc4d9hqgs`.

**Solution:** This is actually normal - Azure uses a shorter internal name. However, ensure:
- `AZURE_APP_SERVICE_NAME` secret = `risbow-api-prod-f4dua9fsc4d9hqgs`
- The publish profile's `destinationAppUrl` matches: `https://risbow-api-prod-f4dua9fsc4d9hqgs.centralindia-01.azurewebsites.net`

### Issue 3: Publish Profile Format

**Problem:** The publish profile might not be correctly formatted in GitHub Secrets.

**Solution:** Follow these exact steps:

1. **Get the COMPLETE publish profile XML:**
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

2. **Update GitHub Secret:**
   - Go to: https://github.com/Vijayapardhu/risbow-backend/settings/secrets/actions
   - Click `AZURE_PUBLISH_PROFILE`
   - Click "Update"
   - **Delete everything**
   - **Paste the ENTIRE XML above** (including `<?xml version="1.0" encoding="utf-8"?>`)
   - Click "Update secret"

3. **Verify Secrets:**
   - `AZURE_APP_SERVICE_NAME` = `risbow-api-prod-f4dua9fsc4d9hqgs`
   - `AZURE_PUBLISH_PROFILE` = Complete XML (see above)

## Alternative: Use Azure CLI Deployment

If publish profile continues to fail, we can use Azure CLI instead:

```yaml
- name: Deploy to Azure App Service
  run: |
    # Create deployment package
    cd ${{ github.workspace }}
    zip -r deploy.zip . -x "*.git*" "node_modules/*" ".github/*"
    
    # Deploy using Azure CLI
    az webapp deploy \
      --resource-group risbow-prod \
      --name ${{ secrets.AZURE_APP_SERVICE_NAME }} \
      --src-path deploy.zip \
      --type zip
```

But first, let's try fixing the publish profile issue.

## Step-by-Step Fix

1. ✅ **Removed `slot-name` from workflow** (committed)
2. ⏳ **Update `AZURE_PUBLISH_PROFILE` secret** with complete XML
3. ⏳ **Verify `AZURE_APP_SERVICE_NAME`** is `risbow-api-prod-f4dua9fsc4d9hqgs`
4. ⏳ **Re-run the workflow**

## Verification

After updating, check:
- The publish profile XML starts with `<?xml version="1.0" encoding="utf-8"?>`
- The publish profile XML ends with `</publishData>`
- All three `<publishProfile>` entries are included
- No extra spaces or line breaks were added

## Still Failing?

If it still fails after these steps:

1. **Regenerate publish profile:**
   - Azure Portal → App Service → **Get publish profile** (download fresh)
   - Update the secret with the new profile

2. **Check App Service status:**
   ```bash
   az webapp show \
     --name risbow-api-prod-f4dua9fsc4d9hqgs \
     --resource-group risbow-prod \
     --query "{name:name, state:state, defaultHostName:defaultHostName}"
   ```

3. **Try alternative deployment method** (Azure CLI instead of publish profile)

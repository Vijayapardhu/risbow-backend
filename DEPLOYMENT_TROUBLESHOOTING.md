# Deployment Troubleshooting Guide

## Error: Invalid Publish Profile

### Symptoms
```
Error: Deployment Failed, Error: Publish profile is invalid for app-name and slot-name provided. 
Provide correct publish profile credentials for app.
```

### Solution

#### Step 1: Get Fresh Publish Profile

1. **Go to Azure Portal:**
   - https://portal.azure.com
   - Navigate to: **App Services** → `risbow-api-prod-f4dua9fsc4d9hqgs`
   - Resource Group: `risbow-prod`

2. **Download Publish Profile:**
   - Click **"Get publish profile"** button (top menu bar)
   - OR: Go to **Overview** → Click **"Get publish profile"**
   - A `.PublishSettings` file will download

3. **Extract XML Content:**
   - Open the `.PublishSettings` file in a text editor
   - **Copy the ENTIRE content** (from `<?xml version="1.0"?>` to `</publishData>`)
   - Make sure you copy everything, including all `<publishProfile>` entries

#### Step 2: Update GitHub Secret

1. **Go to GitHub:**
   - https://github.com/Vijayapardhu/risbow-backend/settings/secrets/actions

2. **Update Secret:**
   - Find `AZURE_PUBLISH_PROFILE`
   - Click **"Update"**
   - **Delete the old content completely**
   - **Paste the ENTIRE XML** from the `.PublishSettings` file
   - Click **"Update secret"**

#### Step 3: Verify App Service Name

Ensure the secret matches exactly:
- **Secret:** `AZURE_APP_SERVICE_NAME`
- **Value:** `risbow-api-prod-f4dua9fsc4d9hqgs`

#### Step 4: Re-run Deployment

1. Go to **Actions** → **Deploy to Azure App Service**
2. Click **"Re-run all jobs"**

Or push a new commit:
```bash
git commit --allow-empty -m "trigger: retry deployment"
git push
```

## Alternative: Use Service Principal Only

If publish profile continues to fail, we can modify the workflow to use only Service Principal authentication (no publish profile needed).

### Update Workflow

The workflow already authenticates with `AZURE_CREDENTIALS`. We can use Azure CLI deployment instead:

```yaml
- name: Deploy to Azure App Service
  run: |
    az webapp deploy \
      --resource-group risbow-prod \
      --name ${{ secrets.AZURE_APP_SERVICE_NAME }} \
      --src-path dist.zip \
      --type zip
```

However, this requires creating a zip file first. The current approach with publish profile is simpler if it works.

## Common Issues

### Issue 1: Publish Profile Expired

**Solution:** Download a fresh publish profile. Publish profiles can expire or become invalid.

### Issue 2: Wrong App Service Name

**Solution:** Verify the app service name matches exactly:
```bash
az webapp list --resource-group risbow-prod --query "[].name"
```

### Issue 3: Publish Profile Format

**Solution:** Ensure you copied the ENTIRE XML, not just part of it. The file should start with `<?xml version="1.0"?>` and end with `</publishData>`.

### Issue 4: Slot Name Mismatch

**Solution:** If using deployment slots, ensure the slot name matches. For production, use `production` or leave it empty.

## Verification

After updating the publish profile, verify:

1. **Check Secret is Set:**
   - GitHub → Settings → Secrets → Actions
   - Verify `AZURE_PUBLISH_PROFILE` exists and is not empty

2. **Test Deployment:**
   - Trigger a new deployment
   - Check the logs for any errors

3. **Verify App Service:**
   ```bash
   az webapp show \
     --name risbow-api-prod-f4dua9fsc4d9hqgs \
     --resource-group risbow-prod \
     --query "{name:name, state:state, defaultHostName:defaultHostName}"
   ```

## Quick Fix Checklist

- [ ] Downloaded fresh publish profile from Azure Portal
- [ ] Copied ENTIRE XML content (not partial)
- [ ] Updated `AZURE_PUBLISH_PROFILE` secret in GitHub
- [ ] Verified `AZURE_APP_SERVICE_NAME` is correct: `risbow-api-prod-f4dua9fsc4d9hqgs`
- [ ] Re-ran the workflow or pushed a new commit

## Still Failing?

If the issue persists:

1. **Regenerate Publish Profile:**
   - In Azure Portal, go to App Service → **Configuration** → **Deployment Center**
   - Click **"Reset publish profile"** (if available)
   - Download a new profile

2. **Check App Service Status:**
   - Ensure the App Service is running
   - Check for any locks or restrictions

3. **Use Azure CLI:**
   - Consider using Azure CLI deployment method instead
   - This requires creating a deployment package (zip file)

4. **Check Permissions:**
   - Verify the Service Principal has contributor role
   - Check if there are any IP restrictions

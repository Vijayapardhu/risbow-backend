# Fix: Resource Doesn't Exist Error

## Error
```
Error: Deployment Failed, Error: Resource *** of type Microsoft.Web/Sites doesn't exist.
```

## Root Cause

The Azure deployment action cannot find the App Service resource. This can happen if:
1. The app name in the secret doesn't match the actual Azure resource name
2. The resource group is not specified
3. The Service Principal doesn't have access to the resource

## Solution

### Step 1: Verify App Service Name

Check that `AZURE_APP_SERVICE_NAME` secret matches exactly:

1. **Go to Azure Portal:**
   - https://portal.azure.com
   - Navigate to: **App Services** → `risbow-api-prod-f4dua9fsc4d9hqgs`
   - Resource Group: `risbow-prod`

2. **Verify the exact name:**
   - The name should be: `risbow-api-prod-f4dua9fsc4d9hqgs`
   - Copy it exactly (case-sensitive)

3. **Update GitHub Secret:**
   - Go to: https://github.com/Vijayapardhu/risbow-backend/settings/secrets/actions
   - Find `AZURE_APP_SERVICE_NAME`
   - Verify it's exactly: `risbow-api-prod-f4dua9fsc4d9hqgs`
   - If different, update it

### Step 2: Verify Resource Group

I've added `resource-group: risbow-prod` to the workflow. This ensures the deployment looks in the correct resource group.

### Step 3: Verify Service Principal Permissions

The Service Principal needs **Contributor** role on the resource group or subscription:

```bash
# Check Service Principal permissions
az role assignment list \
  --assignee <service-principal-client-id> \
  --scope /subscriptions/2ceebe32-f723-441c-b024-b250f48d26b1/resourceGroups/risbow-prod
```

If permissions are missing, add them:
```bash
az role assignment create \
  --role Contributor \
  --assignee <service-principal-client-id> \
  --scope /subscriptions/2ceebe32-f723-441c-b024-b250f48d26b1/resourceGroups/risbow-prod
```

### Step 4: Test Resource Access

You can test if the Service Principal can access the resource:

```bash
# Login with Service Principal
az login --service-principal \
  -u <client-id> \
  -p <client-secret> \
  --tenant <tenant-id>

# Check if app exists
az webapp show \
  --name risbow-api-prod-f4dua9fsc4d9hqgs \
  --resource-group risbow-prod
```

## Quick Fix Checklist

- [ ] Verify `AZURE_APP_SERVICE_NAME` = `risbow-api-prod-f4dua9fsc4d9hqgs` (exact match)
- [ ] Verify resource group is `risbow-prod`
- [ ] Verify Service Principal has Contributor role on resource group
- [ ] Re-run the workflow

## Alternative: Use Azure CLI Directly

If the action continues to fail, we can use Azure CLI directly:

```yaml
- name: Deploy using Azure CLI
  run: |
    az webapp deploy \
      --resource-group risbow-prod \
      --name ${{ secrets.AZURE_APP_SERVICE_NAME }} \
      --src-path deploy.zip \
      --type zip
```

This gives more control and better error messages.

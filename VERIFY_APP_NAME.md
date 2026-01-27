# Verify App Service Name

## Issue

The error "Resource doesn't exist" suggests the app service name in the GitHub secret might not match the actual Azure resource name.

## From Azure Portal URL

Looking at your Azure Portal URL:
```
/providers/Microsoft.Web/sites/risbow-api-prod
```

This suggests the app service resource name might be `risbow-api-prod`, not `risbow-api-prod-f4dua9fsc4d9hqgs`.

## Verify the Actual Name

Run this command in Azure Cloud Shell or Azure CLI:

```bash
az webapp list \
  --resource-group risbow-prod \
  --query "[].{name:name, defaultHostName:defaultHostName}" \
  --output table
```

This will show:
- The actual resource name
- The default hostname (which includes the full name)

## Update GitHub Secret

Once you confirm the actual name:

1. Go to: https://github.com/Vijayapardhu/risbow-backend/settings/secrets/actions
2. Find `AZURE_APP_SERVICE_NAME`
3. Update it to match the **exact resource name** from Azure
4. Save

## Common Scenarios

### Scenario 1: Name is `risbow-api-prod`
- Update secret to: `risbow-api-prod`
- The hostname will still be: `risbow-api-prod-f4dua9fsc4d9hqgs.azurewebsites.net`

### Scenario 2: Name is `risbow-api-prod-f4dua9fsc4d9hqgs`
- Keep secret as: `risbow-api-prod-f4dua9fsc4d9hqgs`
- But verify it matches exactly (no typos)

## Quick Check Command

```bash
# List all app services in the resource group
az webapp list --resource-group risbow-prod --output table

# Or get specific app details
az webapp show \
  --name risbow-api-prod \
  --resource-group risbow-prod \
  --query "{name:name, state:state, defaultHostName:defaultHostName}"
```

Try with `risbow-api-prod` first, then with `risbow-api-prod-f4dua9fsc4d9hqgs` to see which one exists.

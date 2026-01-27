# Azure Deployment Center - Exact Values to Enter

## Configuration Values

When setting up Azure Deployment Center, use these exact values:

### Required Fields

1. **Source:** `GitHub`
2. **Organization:** `Vijayapardhu`
3. **Repository:** `risbow-backend`
4. **Branch:** `master`
5. **Workflow option:** `GitHub Actions`

### What Azure Will Create

After you click "Save", Azure will:
1. Create workflow file: `.github/workflows/master_risbow-api-prod.yml`
2. Create GitHub secret: `AZURE_WEBAPP_PUBLISH_PROFILE_*` (auto-generated)
3. Trigger the first deployment

## Important: Workflow Conflict

⚠️ **You already have a custom workflow** (`azure-deploy.yml`) that triggers on push to `master`.

**Two options:**

### Option 1: Disable Custom Workflow (Use Azure's)

1. **Before setting up Azure Deployment Center:**
   ```bash
   # Rename your custom workflow to disable it
   git mv .github/workflows/azure-deploy.yml .github/workflows/azure-deploy.yml.disabled
   git commit -m "disable: custom workflow in favor of Azure auto-generated"
   git push
   ```

2. **Then proceed with Azure Deployment Center setup**

### Option 2: Keep Both (Different Triggers)

Modify your custom workflow to only trigger manually:

1. **Update `azure-deploy.yml` to remove automatic push trigger:**
   ```yaml
   on:
     workflow_dispatch:  # Manual only
       inputs:
         environment:
           description: 'Deployment environment'
           required: true
           default: 'production'
           type: choice
           options:
             - production
             - staging
   ```

2. **Azure's workflow will handle automatic deployments**
3. **Your custom workflow will be available for manual deployments**

## Recommended: Option 2 (Keep Both)

This gives you:
- **Automatic deployments** via Azure's workflow (on every push)
- **Manual deployments** via your custom workflow (with migrations & health checks)

## Setup Steps

1. **In Azure Portal:**
   - Go to: **App Service** → `risbow-api-prod` → **Deployment Center**
   - Fill in the values above
   - Click **"Save"**

2. **Wait for Azure to create the workflow:**
   - Check GitHub → **Actions** tab
   - You should see a new workflow file created
   - First deployment will start automatically

3. **Verify:**
   - Check `.github/workflows/master_risbow-api-prod.yml` exists
   - Check GitHub Secrets for new `AZURE_WEBAPP_PUBLISH_PROFILE_*` secret

## After Setup

Once Azure's workflow is created, you'll have:
- ✅ Automatic deployments on push to `master`
- ✅ Azure-managed publish profile
- ✅ Your custom workflow still available for manual deployments (if you chose Option 2)

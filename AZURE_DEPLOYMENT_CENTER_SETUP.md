# Azure Deployment Center Setup Guide

## Overview

Azure Deployment Center can automatically create a GitHub Actions workflow for you. This guide helps you configure it properly.

## Setup Steps

### Step 1: Configure in Azure Portal

1. **Go to Azure Portal:**
   - Navigate to: **App Service** → `risbow-api-prod` → **Deployment Center**

2. **Select Source:**
   - **Source:** `GitHub`
   - **Organization:** `Vijayapardhu`
   - **Repository:** `risbow-backend`
   - **Branch:** `master` (or `main`)
   - **Workflow option:** `GitHub Actions`

3. **Click "Save"**

### Step 2: What Azure Will Create

Azure will automatically create:
- **Workflow file:** `.github/workflows/master_risbow-api-prod.yml`
- **GitHub Secret:** `AZURE_WEBAPP_PUBLISH_PROFILE_*` (auto-generated)

### Step 3: Verify the Generated Workflow

After Azure creates the workflow, check:
- File: `.github/workflows/master_risbow-api-prod.yml`
- It should contain basic build and deploy steps

## Important Considerations

### Option A: Use Azure's Auto-Generated Workflow

**Pros:**
- Simple setup
- Automatically configured
- Azure manages the publish profile

**Cons:**
- Basic functionality only
- No database migrations
- No health checks
- Less control

### Option B: Keep Your Custom Workflow (Recommended)

**Pros:**
- Full control
- Database migrations included
- Health check verification
- Better error handling
- More comprehensive

**Cons:**
- Manual setup required
- Need to manage secrets yourself

## Recommendation

**Keep your custom workflow** (`azure-deploy.yml`) because it:
1. ✅ Already working
2. ✅ Includes database migrations
3. ✅ Has health check verification
4. ✅ More comprehensive error handling

## If You Want to Use Azure's Workflow

If you proceed with Azure's setup:

1. **Azure will create:** `.github/workflows/master_risbow-api-prod.yml`
2. **You should:**
   - Either disable your custom workflow (`azure-deploy.yml`)
   - Or rename it to avoid conflicts
   - Or configure different triggers

3. **To disable your custom workflow:**
   - Rename `azure-deploy.yml` to `azure-deploy.yml.disabled`
   - Or remove it if you don't need it

## Hybrid Approach

You can use both workflows with different triggers:

- **Azure's workflow:** Deploy on every push to `master`
- **Your custom workflow:** Deploy manually or on tags

To do this, modify your `azure-deploy.yml` to only trigger manually:

```yaml
on:
  workflow_dispatch:  # Manual trigger only
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

## Current Status

Your custom workflow (`azure-deploy.yml`) is:
- ✅ Working
- ✅ Deploying successfully
- ✅ Includes migrations
- ✅ Has health checks

**Recommendation:** Keep using your custom workflow and skip Azure's auto-setup unless you specifically want the simpler Azure-managed approach.

## Next Steps

If you want to proceed with Azure's setup:

1. Complete the configuration in Azure Portal
2. Azure will create the workflow file
3. Review the generated workflow
4. Decide whether to keep both or disable one

If you want to keep your custom workflow:

1. Skip Azure's Deployment Center setup
2. Continue using `azure-deploy.yml`
3. It will deploy automatically on push to `master`

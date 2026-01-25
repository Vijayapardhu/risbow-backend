# GitHub Actions Setup Guide

This guide helps you set up GitHub Actions for the RISBOW backend project.

## Quick Setup

### 1. Enable GitHub Actions

GitHub Actions are automatically enabled for your repository. No additional setup required.

### 2. Configure Required Secrets

Go to your repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

#### Azure Deployment Secrets

```bash
# Azure Service Principal (for production deployments)
AZURE_CREDENTIALS={"clientId":"...","clientSecret":"...","subscriptionId":"...","tenantId":"..."}

# App Service Names
AZURE_APP_SERVICE_STAGING=risbow-backend-staging
AZURE_APP_SERVICE_PROD=risbow-backend-prod

# Publish Profiles (download from Azure Portal → App Service → Get publish profile)
AZURE_PUBLISH_PROFILE_STAGING=<paste-publish-profile-xml>
AZURE_PUBLISH_PROFILE_PROD=<paste-publish-profile-xml>

# Database Connection Strings
STAGING_DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
PRODUCTION_DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
AZURE_DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Environment URLs (optional, for health checks)
STAGING_URL=https://risbow-backend-staging.azurewebsites.net
PRODUCTION_URL=https://risbow-backend-prod.azurewebsites.net
```

#### Optional Secrets

```bash
# Security Scanning
SNYK_TOKEN=your-snyk-token

# Code Coverage
CODECOV_TOKEN=your-codecov-token
```

### 3. Configure Branch Protection (Recommended)

Go to **Settings** → **Branches** → **Add rule**

**For `main`/`master` branch:**
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Select: `CI/CD Pipeline / test`
  - Select: `CI/CD Pipeline / build`
  - Select: `CI/CD Pipeline / security-scan`
- ✅ Require branches to be up to date before merging

### 4. Test the Workflows

1. **Create a test PR** to trigger PR checks:
   ```bash
   git checkout -b test-pr-checks
   git commit --allow-empty -m "test: verify GitHub Actions"
   git push origin test-pr-checks
   ```
   Then create a PR on GitHub.

2. **Check workflow status:**
   - Go to **Actions** tab in GitHub
   - You should see workflows running

3. **Verify PR checks:**
   - Open your PR
   - Scroll to "Checks" section
   - All checks should pass (or show warnings)

## Workflow Overview

### Automatic Workflows

1. **CI/CD Pipeline** (`ci.yml`)
   - Runs on push to `main`, `master`, `develop`
   - Runs on pull requests
   - Jobs: lint, type-check, test, build, security-scan
   - Auto-deploys to staging/production

2. **PR Quality Checks** (`pr-checks.yml`)
   - Runs on PR open/update
   - Validates PR title format
   - Runs tests and type checks

3. **Dependency Review** (`dependency-review.yml`)
   - Reviews dependency changes in PRs
   - Blocks vulnerable dependencies

### Manual Workflows

1. **Database Migrations** (`database-migrations.yml`)
   - Go to **Actions** → **Database Migrations** → **Run workflow**
   - Select environment and action

2. **Release Management** (`release.yml`)
   - Triggered by git tags (`v1.2.3`)
   - Or manually via workflow dispatch

## Troubleshooting

### Workflows Not Running

- Check if GitHub Actions is enabled: **Settings** → **Actions** → **General**
- Verify branch protection rules allow workflows
- Check if workflows are in `.github/workflows/` directory

### Build Failures

- Check Node.js version (should be 22.x)
- Verify `package-lock.json` is committed
- Check for TypeScript errors in logs

### Test Failures

- Ensure all test environment variables are set
- Check test logs for specific failures
- Verify mocks are properly configured

### Deployment Failures

- Verify Azure secrets are correct
- Check Azure App Service is running
- Review deployment logs in Azure Portal

### Migration Failures

- Always validate migrations first
- Check database connection string
- Verify Prisma schema is valid

## Best Practices

1. **Always test locally first:**
   ```bash
   npm test
   npm run build
   ```

2. **Use semantic commit messages:**
   - `feat(scope): description`
   - `fix(scope): description`
   - `docs(scope): description`

3. **Review dependency changes:**
   - Check dependency-review workflow results
   - Test new dependencies locally

4. **Test migrations in staging first:**
   - Use database-migrations workflow
   - Validate before deploying to production

5. **Monitor workflow runs:**
   - Check Actions tab regularly
   - Set up notifications for failures

## Local Testing with Act

Test workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
choco install act-cli  # Windows

# Run a specific job
act -j test
act -j build

# Run with secrets
act -j deploy-production --secret-file .secrets
```

## Support

For issues or questions:
- Check workflow logs in GitHub Actions
- Review workflow README: `.github/workflows/README.md`
- Check Azure deployment guide: `AZURE_DEPLOYMENT.md`

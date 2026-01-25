# GitHub Actions Workflows

This directory contains CI/CD workflows for the RISBOW backend.

## Workflows Overview

### 1. `ci.yml` - Main CI/CD Pipeline
**Triggers:** Push to `main`, `master`, `develop` branches

**Jobs:**
- **lint-and-format**: Runs ESLint and format checks
- **type-check**: TypeScript type checking
- **test**: Runs unit and integration tests with coverage
- **build**: Builds the application
- **security-scan**: Runs npm audit and Snyk security scans
- **prisma-validate**: Validates Prisma schema
- **docker-build**: Tests Docker image build (production only)
- **deploy-staging**: Auto-deploys to staging on `develop` branch
- **deploy-production**: Auto-deploys to production on `main`/`master` branch

**Key Features:**
- Parallel job execution for faster CI
- Artifact caching for dependencies
- Coverage reports uploaded to Codecov
- Health checks after deployment

### 2. `pr-checks.yml` - Pull Request Quality Checks
**Triggers:** PR opened, updated, or marked ready for review

**Checks:**
- Semantic PR title validation (conventional commits)
- Prisma schema validation
- TypeScript type checking
- Test execution
- TODO/FIXME comment detection (warnings)
- console.log detection (warnings)

**PR Title Format:**
```
<type>(<scope>): <subject>

Examples:
- feat(orders): add split checkout support
- fix(payments): resolve duplicate payment issue
- docs(api): update deployment guide
```

### 3. `dependency-review.yml` - Dependency Security Review
**Triggers:** PR opened or updated

**Features:**
- Reviews all dependency changes
- Fails on moderate+ severity vulnerabilities
- Blocks GPL-2.0 and GPL-3.0 licenses

### 4. `release.yml` - Release Management
**Triggers:** 
- Tag push (`v*.*.*`)
- Manual workflow dispatch

**Actions:**
- Creates GitHub release
- Generates changelog from git commits
- Sends notifications (extensible)

### 5. `database-migrations.yml` - Database Migration Management
**Triggers:** Manual workflow dispatch

**Actions:**
- **validate**: Validates Prisma schema and migration status
- **deploy**: Deploys migrations to target environment
- **status**: Checks current migration status

**Usage:**
1. Go to Actions → Database Migrations
2. Click "Run workflow"
3. Select environment (staging/production)
4. Select action (validate/deploy/status)
5. Run

## Required Secrets

### Azure Deployment
- `AZURE_CREDENTIALS`: Azure service principal credentials (JSON)
- `AZURE_APP_SERVICE_STAGING`: Staging App Service name
- `AZURE_APP_SERVICE_PROD`: Production App Service name
- `AZURE_PUBLISH_PROFILE_STAGING`: Staging publish profile
- `AZURE_PUBLISH_PROFILE_PROD`: Production publish profile
- `AZURE_DATABASE_URL`: Production database connection string

### Database Migrations
- `STAGING_DATABASE_URL`: Staging database connection string
- `PRODUCTION_DATABASE_URL`: Production database connection string

### Optional
- `SNYK_TOKEN`: Snyk API token for security scanning
- `CODECOV_TOKEN`: Codecov token for coverage reports
- `STAGING_URL`: Staging environment URL
- `PRODUCTION_URL`: Production environment URL

## Workflow Best Practices

1. **Always run tests before merging**: PR checks ensure tests pass
2. **Use semantic commits**: PR titles must follow conventional commit format
3. **Review dependency changes**: Dependency review workflow blocks risky updates
4. **Test migrations in staging first**: Use database-migrations workflow
5. **Tag releases properly**: Use `v1.2.3` format for releases

## Troubleshooting

### Tests Failing
- Check test logs for specific failures
- Ensure all environment variables are set in test environment
- Verify mocks are properly configured

### Build Failing
- Check Node.js version compatibility
- Verify all dependencies are installed
- Check for TypeScript errors

### Deployment Failing
- Verify Azure credentials are correct
- Check App Service configuration
- Review deployment logs in Azure Portal

### Migration Issues
- Always validate migrations before deploying
- Check migration status after deployment
- Review Prisma migration logs

## Local Testing

To test workflows locally:

```bash
# Install act (GitHub Actions local runner)
brew install act  # macOS
# or
choco install act-cli  # Windows

# Run a workflow
act -j test
act -j build
```

## Workflow Status Badge

Add to your README.md:

```markdown
![CI/CD](https://github.com/your-org/risbow-backend/workflows/CI%2FCD%20Pipeline/badge.svg)
```

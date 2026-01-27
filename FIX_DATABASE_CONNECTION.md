# Fix: Database Connection Error in GitHub Actions

## Error
```
Error: P1001: Can't reach database server at `risbow-postgres-prod.postgres.database.azure.com:5432`
```

## Root Cause

GitHub Actions runners are external to Azure and cannot access:
- **Private endpoints** (`.private.postgres.database.azure.com`)
- **Firewall-restricted databases** (unless GitHub IPs are whitelisted)

## Solutions

### Solution 1: Use Public Endpoint (Recommended for Migrations)

If your database has a public endpoint, use it for migrations:

1. **Get the public endpoint:**
   - Azure Portal → PostgreSQL → `risbow-postgres-prod` → **Connection strings**
   - Look for the public endpoint (not `.private.`)

2. **Update GitHub Secret:**
   - Go to: https://github.com/Vijayapardhu/risbow-backend/settings/secrets/actions
   - Find `AZURE_DATABASE_URL`
   - Update it to use the public endpoint:
     ```
     postgresql://risbow_admin:<password>@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require
     ```
   - Note: Use public endpoint (no `.private.`)

### Solution 2: Add GitHub Actions IPs to Firewall

Allow GitHub Actions IP ranges to access your database:

1. **Get GitHub Actions IP ranges:**
   - GitHub Actions uses dynamic IPs
   - You can use: `0.0.0.0/0` (allow all) for migrations only
   - Or use GitHub's meta API: `https://api.github.com/meta`

2. **Add to Azure PostgreSQL Firewall:**
   ```bash
   az postgres flexible-server firewall-rule create \
     --resource-group risbow-prod \
     --name risbow-postgres-prod \
     --rule-name AllowGitHubActions \
     --start-ip-address 0.0.0.0 \
     --end-ip-address 255.255.255.255
   ```

   **⚠️ Security Note:** This allows all IPs. For production, consider:
   - Using a specific IP range
   - Or running migrations from Azure App Service instead

### Solution 3: Run Migrations from Azure App Service (Best for Private Endpoints)

Since the App Service can access the private endpoint, run migrations there:

1. **Remove migration step from GitHub Actions**
2. **Add migration to Azure startup script** (`start.sh`)

Update `start.sh`:
```bash
#!/bin/bash

echo "Starting RISBOW Backend Application..."

# Run migrations before starting
if [ -f "prisma/schema.prisma" ]; then
    echo "Running database migrations..."
    npx prisma migrate deploy || echo "Migration failed, continuing..."
fi

# Start the application
node dist/main.js
```

### Solution 4: Use Azure CLI to Run Migrations

Run migrations from Azure Cloud Shell or Azure CLI (which has access):

```bash
# From Azure Cloud Shell or local Azure CLI
az webapp ssh --name risbow-api-prod-f4dua9fsc4d9hqgs --resource-group risbow-prod

# Then inside the container:
cd /home/site/wwwroot
npx prisma migrate deploy
```

## Recommended Approach

**For Private Endpoints:** Use Solution 3 (run migrations in `start.sh`)

**For Public Endpoints:** Use Solution 1 (update `AZURE_DATABASE_URL` to public endpoint)

## Quick Fix (If Database Has Public Endpoint)

1. **Check if public endpoint exists:**
   - Azure Portal → PostgreSQL → Connection strings
   - Look for hostname without `.private.`

2. **Update `AZURE_DATABASE_URL` secret:**
   - Use: `risbow-postgres-prod.postgres.database.azure.com` (no `.private.`)
   - Keep the rest of the connection string the same

3. **Re-run the workflow**

## Verify Database Access

Test connection from GitHub Actions:

```bash
# Add this as a test step
- name: Test database connection
  run: |
    psql "${{ secrets.AZURE_DATABASE_URL }}" -c "SELECT version();"
```

If this fails, the database is not accessible from GitHub Actions.

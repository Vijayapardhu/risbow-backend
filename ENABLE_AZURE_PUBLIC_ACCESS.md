# Enable Public Access to Azure PostgreSQL for Local Development

## Current Configuration

Your Azure PostgreSQL server is currently configured with **Private access (VNet Integration)**, which means:
- ❌ Cannot connect from localhost
- ✅ Only accessible from within Azure Virtual Network
- ✅ More secure (recommended for production)

## Enable Public Access (For Local Development)

### Step 1: Switch to Public Access

1. **In Azure Portal** (where you are now):
   - Go to: **risbow-postgres-prod** → **Networking**
   - Under **Network connectivity**, select: **"Public access (allowed IP addresses)"**
   - Click **"Save"** at the top
   - Wait for the change to apply (1-2 minutes)

### Step 2: Add Your IP Address to Firewall

After switching to public access:

1. **Find your current IP address:**
   ```powershell
   # In PowerShell
   (Invoke-WebRequest -Uri "https://api.ipify.org").Content
   ```

2. **Add IP to Firewall:**
   - In Azure Portal → **risbow-postgres-prod** → **Networking**
   - Scroll down to **"Firewall rules"** section
   - Click **"+ Add 0.0.0.0 - 255.255.255.255"** (for testing)
   - Or add your specific IP: **"+ Add client IP"**
   - Click **"Save"**

### Step 3: Update Connection String

Your `.env` file should already have the correct connection string:

```env
DATABASE_URL=postgresql://risbow_admin:Pardhu%402008@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require
```

### Step 4: Test Connection

```powershell
# Test with psql
psql "postgresql://risbow_admin:Pardhu%402008@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require" -c "SELECT version();"

# Or test with Prisma
npx prisma db pull
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **For Development Only**: Public access should only be enabled for development/testing
2. **Use Specific IP**: Instead of `0.0.0.0 - 255.255.255.255`, add only your specific IP address
3. **Remove When Done**: Disable public access or remove firewall rules when not needed
4. **Production**: Keep private access for production environments

## Recommended Approach

### Option A: Temporary Public Access (Current Session)

1. Enable public access
2. Add your current IP
3. Develop locally
4. **Disable public access** when done

### Option B: Use Local PostgreSQL (Recommended)

Instead of exposing Azure database:
1. Use Docker: `docker-compose up -d postgres`
2. Or install PostgreSQL locally
3. Update `.env` to use local database
4. Keep Azure database private and secure

See `SETUP_LOCAL_DB.md` for local setup instructions.

## Firewall Rules Best Practices

### For Development:
- Add your specific IP address
- Use Azure Portal's "Add client IP" button (automatically detects your IP)
- Remove the rule when done developing

### For Team Development:
- Add each team member's IP address
- Or use Azure VPN/Bastion for secure access
- Consider using Azure Database for PostgreSQL with connection pooling

## Troubleshooting

### "Connection timeout"
- Check firewall rules include your IP
- Verify public access is enabled
- Check if your IP changed (dynamic IP addresses)

### "SSL connection required"
- Ensure `?sslmode=require` is in connection string
- Azure PostgreSQL requires SSL connections

### "Authentication failed"
- Verify username: `risbow_admin`
- Verify password is URL-encoded: `Pardhu%402008` (for `Pardhu@2008`)
- Check user exists in PostgreSQL

## Quick Commands

```powershell
# Get your current IP
$myIp = (Invoke-WebRequest -Uri "https://api.ipify.org").Content
Write-Host "Your IP: $myIp"

# Test connection
$env:DATABASE_URL = "postgresql://risbow_admin:Pardhu%402008@risbow-postgres-prod.postgres.database.azure.com:5432/postgres?sslmode=require"
psql $env:DATABASE_URL -c "SELECT version();"
```

## After Enabling Public Access

1. ✅ Update `.env` if needed (should already be correct)
2. ✅ Run migrations: `npx prisma migrate dev`
3. ✅ Start application: `npm start`
4. ✅ Should connect successfully!

## Reverting to Private Access

When done with local development:

1. Go to **Networking** → **Network connectivity**
2. Select **"Private access (VNet Integration)"**
3. Click **"Save"**
4. Remove firewall rules if added

This restores the secure private-only configuration.

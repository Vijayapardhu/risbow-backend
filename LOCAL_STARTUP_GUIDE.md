# Local Startup Guide

## Quick Start

### Correct Command
```bash
npm start
```

**NOT** `npm start run` - that's incorrect!

### Alternative Commands
- **Development with watch mode**: `npm run start:dev`
- **Production build**: `npm run build && npm run start:prod`
- **Debug mode**: `npm run start:debug`

## Troubleshooting

### Server Not Starting

1. **Check if port 3000 is already in use**:
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :3000
   
   # Linux/Mac
   lsof -i :3000
   ```

2. **Kill process using port 3000** (if needed):
   ```bash
   # Windows PowerShell (replace PID with actual process ID)
   taskkill /PID <PID> /F
   
   # Linux/Mac
   kill -9 <PID>
   ```

3. **Check database connection**:
   - Ensure PostgreSQL is running
   - Verify `DATABASE_URL` in `.env` is correct
   - Test connection: `npx prisma db pull`

4. **Check Redis connection** (if using):
   - Ensure Redis is running
   - Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` in `.env`

5. **Check for build errors**:
   ```bash
   npm run build
   ```

6. **Clear and rebuild**:
   ```bash
   # Windows PowerShell
   Remove-Item -Recurse -Force node_modules; Remove-Item package-lock.json; npm install; npm run build
   
   # Linux/Mac
   rm -rf node_modules package-lock.json && npm install && npm run build
   ```

### Server Starts But Not Accessible

1. **Check the listening address**:
   - Server listens on `0.0.0.0:3000` by default
   - Access via: `http://localhost:3000` or `http://127.0.0.1:3000`

2. **Check firewall settings**:
   - Ensure port 3000 is not blocked by Windows Firewall

3. **Verify health endpoint**:
   ```bash
   curl http://localhost:3000/api/v1/health
   # or
   curl http://localhost:3000/health
   ```

### Common Errors

#### "Port already in use"
- Another process is using port 3000
- Change port: Set `PORT=3001` in `.env` or `set PORT=3001` (PowerShell)

#### "Cannot connect to database" (Azure Private Endpoint)
**This is expected when running locally and trying to connect to Azure PostgreSQL with a private endpoint.**

**Solutions:**
1. **Use Azure VPN/Private Endpoint Connection** (Recommended for production-like testing):
   - Connect to Azure VPN
   - Or use Azure Bastion/Private Endpoint access

2. **Use Local PostgreSQL for Development**:
   - Install PostgreSQL locally
   - Update `.env` with local database:
     ```env
     DATABASE_URL=postgresql://user:password@localhost:5432/risbow_local
     ```

3. **Use Azure Database Public Access** (Not recommended for production):
   - Enable public access on Azure PostgreSQL (temporary for development)
   - Add your IP to Azure firewall rules

4. **Skip Database Connection for Testing** (Limited functionality):
   - The server will start but database-dependent features won't work
   - Use this only for testing route registration and module loading

#### "Cannot connect to Redis"
- Check Redis connection settings in `.env`
- If Redis is not available, set `NODE_ENV=test` to disable Redis-dependent modules

#### "Module not found"
- Run `npm install` to install dependencies
- Run `npx prisma generate` to generate Prisma client

## Expected Output

When the server starts successfully, you should see:

```
🚀 BOOTSTRAP V6 - FASTIFY EDITION
[Nest] <PID> - <timestamp> LOG [RoutesResolver] ...
[Nest] <PID> - <timestamp> LOG [RouterExplorer] Mapped {...} route
============================================================
🚀 RISBOW Backend API Started Successfully
📡 Listening on: 0.0.0.0:3000
🌐 Base URL: http://localhost:3000
📚 API Docs: http://localhost:3000/api/docs
❤️  Health Check: http://localhost:3000/health
🔧 Environment: development
👷 Worker PID: <PID>
============================================================
```

If you don't see the final "Listening on" message, the server is likely hanging on a connection (database/Redis) or there's an unhandled error.

## Next Steps

1. **Test the API**:
   - Health check: `http://localhost:3000/api/v1/health`
   - API docs: `http://localhost:3000/api/docs`

2. **Check logs**:
   - Look for any error messages in the console
   - Check for connection timeouts or authentication failures

3. **Verify environment variables**:
   - Ensure all required `.env` variables are set
   - See `AZURE_ENV_VARIABLES.md` for a complete list

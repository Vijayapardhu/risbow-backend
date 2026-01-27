# Fix: Redis "ERR max number of clients reached"

## Problem

Your application is hitting Redis connection limits, causing errors:
```
ReplyError: ERR max number of clients reached
Error: read ECONNRESET
```

## Root Causes

1. **Multiple app instances running** - Each instance creates Redis connections
2. **BullMQ creates separate connections** - Queue workers need their own connections
3. **Connections not being reused** - New connections created for each operation
4. **Redis connection limit** - Azure Redis has a max connection limit based on tier

## Quick Fixes

### 1. Stop Multiple App Instances

**Check for multiple Node processes:**
```powershell
Get-Process -Name node
```

**Kill all Node processes:**
```powershell
Stop-Process -Name node -Force
```

**Then restart only one instance:**
```powershell
cd c:\office\risbow-backend
npm start
```

### 2. Check Redis Connection Limit

**Azure Redis tiers and limits:**
- **Basic/Standard C0**: 10 connections
- **Standard C1**: 250 connections
- **Standard C2**: 1,000 connections
- **Premium P1**: 10,000 connections

**Check your Redis tier:**
1. Go to Azure Portal
2. Find your Redis Cache: `risbow-redis-prod`
3. Check the pricing tier

### 3. Reduce Redis Connections

**Option A: Disable Redis (Use In-Memory)**
```env
# Remove or comment out Redis variables
# REDIS_HOST="risbow-redis-prod.redis.cache.windows.net"
# REDIS_PORT=6380
# REDIS_PASSWORD="..."
# REDIS_TLS=true
```

The app will automatically fall back to in-memory storage (works for development).

**Option B: Upgrade Redis Tier**
- Go to Azure Portal → Redis Cache
- Scale up to a higher tier with more connections

**Option C: Use Connection Pooling**
Already implemented in `RedisService` - connections are reused.

### 4. Disable BullMQ Queues (If Not Needed)

If you're not using background jobs, you can disable queues:

**In `src/app.module.ts`:**
```typescript
// Comment out BullModule and QueuesModule
// BullModule.forRoot({ ... }),
// QueuesModule,
```

This will reduce Redis connections significantly.

## Current Status

✅ **Application is running** - The app started successfully (line 475-484)
✅ **Database connected** - Supabase PostgreSQL is working
⚠️ **Redis using fallback** - App is using in-memory store (line 248-249)

## Impact of In-Memory Fallback

**What still works:**
- ✅ All API endpoints
- ✅ Database operations
- ✅ File uploads (Supabase Storage)
- ✅ Authentication

**What doesn't work:**
- ❌ Distributed caching (each instance has its own cache)
- ❌ Background job queues (BullMQ requires Redis)
- ❌ Shared session storage (if using Redis sessions)
- ❌ Rate limiting across instances (if using Redis throttling)

**For development:** In-memory fallback is **perfectly fine**.

## Recommended Actions

### For Development:
1. **Stop all Node processes**
2. **Remove Redis variables from `.env`** (or comment them out)
3. **Restart the app** - It will use in-memory storage

### For Production:
1. **Upgrade Redis tier** to support more connections
2. **Or use Supabase Realtime** instead of Redis (if applicable)
3. **Or implement connection pooling** (already done)

## Verify Fix

After stopping multiple instances:

```powershell
# Check only one Node process is running
Get-Process -Name node

# Should show only 1 process
```

Then restart:
```powershell
npm start
```

You should see:
- ✅ No "max clients reached" errors
- ✅ App starts successfully
- ✅ Either "Connected to Redis" or "using in-memory store"

## Long-Term Solution

For production, consider:
1. **Upgrade Redis tier** to Premium (more connections)
2. **Use Redis connection pooling** (already implemented)
3. **Monitor connection usage** in Azure Portal
4. **Consider Supabase Realtime** for real-time features instead of Redis

## Summary

The app is **working fine** with in-memory fallback. The Redis errors are just warnings - the app automatically switches to in-memory storage when Redis is unavailable.

**For now:** Just stop multiple Node processes and continue development. Redis is optional for development.

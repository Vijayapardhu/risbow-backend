# Disable Redis for Development

## Quick Fix: Comment Out Redis Variables

Since your app is working fine with in-memory fallback, you can disable Redis completely for development.

### Option 1: Comment Out Redis in `.env`

Open your `.env` file and comment out these lines:

```env
# REDIS_HOST="risbow-redis-prod.redis.cache.windows.net"
# REDIS_PORT=6380
# REDIS_PASSWORD="T42yZQMgCO5j4OB8TN7XTNrLf1dCEswr"
# REDIS_TLS=true
```

**Then restart the app:**
```powershell
# Stop current instance (Ctrl+C)
npm start
```

### Option 2: Remove Redis Variables

Simply delete or remove these lines from `.env`:
```env
REDIS_HOST=...
REDIS_PORT=...
REDIS_PASSWORD=...
REDIS_TLS=...
```

## What Happens

✅ **App will work perfectly:**
- All API endpoints work
- Database operations work
- File uploads work
- Authentication works

⚠️ **What doesn't work (but not needed for dev):**
- Background job queues (BullMQ)
- Distributed caching (uses in-memory instead)
- Shared session storage

## After Disabling Redis

You should see:
- ✅ No "max clients reached" errors
- ✅ App starts cleanly
- ✅ "Redis unavailable, using in-memory store" message (expected)

## Re-enable Redis Later

When you need Redis (for production or testing queues):
1. Uncomment the Redis variables in `.env`
2. Restart the app
3. Make sure only ONE instance is running

## Current Status

Your app is **already working** with in-memory fallback. The Redis errors are just noise - the app automatically handles it. Disabling Redis will just make the logs cleaner.

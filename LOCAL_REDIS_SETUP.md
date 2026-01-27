# Local Redis Setup with Docker

## ✅ Redis Container is Running

Your local Redis container is set up:
- **Container name**: `local-redis`
- **Host port**: `6380` (mapped from container port `6379`)
- **Access**: `localhost:6380`

## Update `.env` File

Update your `.env` file to use local Redis:

```env
# Local Redis (Docker)
REDIS_HOST="localhost"
REDIS_PORT=6380
REDIS_PASSWORD=""
REDIS_USERNAME=""
REDIS_TLS=false
```

**Or if you prefer 127.0.0.1:**
```env
REDIS_HOST="127.0.0.1"
REDIS_PORT=6380
REDIS_PASSWORD=""
REDIS_USERNAME=""
REDIS_TLS=false
```

## Restart Your Application

After updating `.env`:

```powershell
# Stop current instance (Ctrl+C)
npm start
```

## Verify Redis Connection

You should see in the logs:
```
✅ Connected to Redis at localhost:6380
```

Instead of:
```
⚠️ Redis unavailable, using in-memory store
```

## Docker Commands Reference

**Start Redis container:**
```bash
docker run -d \
  --name local-redis \
  -p 6380:6379 \
  redis:7
```

**Stop Redis container:**
```bash
docker stop local-redis
```

**Start existing container:**
```bash
docker start local-redis
```

**Remove container:**
```bash
docker rm -f local-redis
```

**Access Redis CLI:**
```bash
docker exec -it local-redis redis-cli
```

**Check if Redis is running:**
```bash
docker ps | grep local-redis
```

## Benefits of Local Redis

✅ **No connection limits** - Local Redis has no max client restrictions  
✅ **Fast** - No network latency  
✅ **Free** - No Azure costs  
✅ **Perfect for development** - Isolated from production  
✅ **Easy to reset** - Just restart the container  

## Troubleshooting

### "Connection refused"
- Make sure container is running: `docker ps | grep local-redis`
- Start container: `docker start local-redis`

### "Connection timeout"
- Check port mapping: `docker port local-redis`
- Should show: `6379/tcp -> 0.0.0.0:6380`

### "ERR AUTH"
- Local Redis has no password, so leave `REDIS_PASSWORD=""` empty

## Production vs Development

**Development (Local):**
```env
REDIS_HOST="localhost"
REDIS_PORT=6380
REDIS_TLS=false
REDIS_PASSWORD=""
```

**Production (Azure):**
```env
REDIS_HOST="risbow-redis-prod.redis.cache.windows.net"
REDIS_PORT=6380
REDIS_TLS=true
REDIS_PASSWORD="your-azure-redis-password"
```

## Next Steps

1. ✅ Update `.env` with local Redis settings
2. ✅ Restart the application
3. ✅ Verify connection in logs
4. ✅ No more "max clients reached" errors!

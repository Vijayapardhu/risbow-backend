# RISBOW Production Deployment Checklist

## Pre-Deployment Verification

### 1. Environment Variables
- [ ] `DATABASE_URL` - Production Supabase connection string
- [ ] `DIRECT_URL` - Direct database connection (for migrations)
- [ ] `JWT_SECRET` - 64+ character random string (use `openssl rand -hex 32`)
- [ ] `RAZORPAY_KEY_ID` - Live Razorpay key (starts with `rzp_live_`)
- [ ] `RAZORPAY_KEY_SECRET` - Live Razorpay secret
- [ ] `REDIS_HOST` / `REDIS_PASSWORD` - Production Redis (Upstash/Redis Labs)
- [ ] `NODE_ENV=production` - Ensures production behavior
- [ ] `FRONTEND_URL` - For CORS whitelist

### 2. Database Migration
```bash
# Run migrations on production database
npx prisma migrate deploy

# Verify schema is up to date
npx prisma db push --preview-feature
```

### 3. Security Checklist
- [ ] JWT secret is unique per environment (not shared with dev)
- [ ] Razorpay is using LIVE keys (not test)
- [ ] Service role keys are NOT in frontend code
- [ ] All admin endpoints require role authentication
- [ ] Rate limiting is enabled on auth endpoints
- [ ] Helmet middleware is active
- [ ] CORS is restricted to production domains

### 4. Database Indexes
The following indexes have been added for query performance:
- User: `role`, `status`, `referredBy`
- Order: `userId`, `status`, `createdAt`, `razorpayOrderId`, `awbNumber`
- Product: `vendorId`, `categoryId`, `isActive`
- CoinLedger: `userId`, `createdAt`
- Review: `productId`, `vendorId`, `userId`
- Notification: `userId + isRead`, `userId + createdAt`
- AbandonedCheckout: `status`, `agentId`, `abandonedAt`

### 5. Build & Test
```bash
# Clean build
rm -rf dist
npm run build

# Run tests
npm run test

# Start in production mode locally to verify
npm run start:prod
```

## Deployment Steps (Render.com)

### 1. Push to Repository
```bash
git add .
git commit -m "Production hardening complete"
git push origin main
```

### 2. Render Dashboard
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select the `risbow-backend` service
3. Verify environment variables are set
4. Click "Manual Deploy" → "Deploy latest commit"

### 3. Post-Deployment Verification
```bash
# Check health endpoint
curl https://risbow-backend.onrender.com/api/v1/health

# Check API docs are accessible
curl https://risbow-backend.onrender.com/api/docs
```

### 4. Monitor Logs
- Check Render logs for startup errors
- Verify Redis connection (warning expected if not configured)
- Check for any 500 errors in initial requests

## Rollback Procedure

If issues are found:
1. Go to Render Dashboard → Service → Events
2. Find the previous successful deployment
3. Click "Rollback to this deploy"

## Post-Launch Monitoring

### Key Metrics to Watch
- API response times (target: <200ms for most endpoints)
- Error rate (target: <0.1%)
- Redis connection status
- Database connection pool utilization

### Alerts to Configure
- 5xx error rate > 1%
- Response time p95 > 500ms
- Service restarts
- Memory usage > 80%

## Known Limitations

1. **Redis**: Falls back to in-memory store if Redis unavailable (OTP/rate limiting will reset on restart)
2. **File Upload**: Using memory storage, consider S3/Supabase Storage for production
3. **Email**: SMTP not configured - password reset emails won't send
4. **OTP**: Currently logs to console - integrate SMS provider for production

## Contact

For deployment issues, contact the development team.

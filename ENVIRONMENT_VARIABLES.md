# RISBOW Backend – Environment Variables

## Required (production)
- **DATABASE_URL**: Postgres connection string (Prisma uses this).
- **JWT_SECRET**: JWT signing secret (do not rotate without invalidation plan).
- **RAZORPAY_KEY_ID**: Razorpay key id.
- **RAZORPAY_KEY_SECRET**: Razorpay key secret.
- **RAZORPAY_WEBHOOK_SECRET**: Webhook signature verification secret.
- **REDIS_HOST**: Redis host (BullMQ + cron locks require Redis in prod).
- **REDIS_PORT**: Redis port (default `6379`).

## Recommended
- **NODE_ENV**: `production`.
- **PORT**: server port (default `3000`).
- **CORS_ORIGINS**: comma-separated allowlist (used in production CORS checks).
- **FRONTEND_URL**: added to CORS allowlist if set.
- **THROTTLE_TTL**: throttler window in ms (default `60000`).
- **THROTTLE_LIMIT**: max requests per window (default `100`).
- **LOG_LEVEL**: `debug|info|warn|error` (if you wire a logger).

## Optional (depending on features)
- **REDIS_USERNAME / REDIS_PASSWORD**: if Redis requires auth.
- **SUPABASE_URL**: Supabase project URL (OTP + storage integration).
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase service role key (required for admin operations like OTP + storage).
- **CLUSTER_MODE**: `true` to enable Node cluster for multi-core (use with care behind a load balancer).

## Notes
- Do not trust client-provided price/quantity/discounts; backend recalculates totals.
- All money is integer paise; do not use floats.


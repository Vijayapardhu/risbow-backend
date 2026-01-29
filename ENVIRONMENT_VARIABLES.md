# Environment Variables Reference

Complete list of all environment variables required for the RISBOW backend application.

## 📋 Table of Contents

- [Database Configuration](#database-configuration)
- [Authentication & Security](#authentication--security)
- [Payment Gateway](#payment-gateway)
- [Notifications](#notifications)
- [Storage](#storage)
- [Redis & Caching](#redis--caching)
- [External Services](#external-services)
- [Application Settings](#application-settings)

---

## Database Configuration

### PostgreSQL (Supabase)

```bash
# Primary database connection (required)
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# Direct connection for migrations (optional, recommended for Supabase)
DIRECT_URL="postgresql://user:password@host:5432/database?schema=public"

# Alternative PostgreSQL environment variables (supported)
DB_HOST="host"
DB_PORT="5432"
DB_USER="user"
DB_PASSWORD="password"
DB_NAME="database"
PGHOST="host"
PGPORT="5432"
PGUSER="user"
PGPASSWORD="password"
PGDATABASE="database"
```

**Note**: The application supports both `DATABASE_URL` format and individual `DB_*` / `PG*` variables for flexibility.

---

## Authentication & Security

### JWT Tokens

```bash
# JWT secret for access tokens (required)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# JWT secret for refresh tokens (required)
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"

# Access token expiration (optional, default: 15m)
JWT_ACCESS_EXPIRES_IN="15m"

# Refresh token expiration (optional, default: 7d)
JWT_REFRESH_EXPIRES_IN="7d"
```

### Supabase Auth (Optional)

```bash
# Supabase project URL (for OTP authentication)
SUPABASE_URL="https://your-project.supabase.co"

# Supabase service role key (for admin operations)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

---

## Payment Gateway

### Razorpay

```bash
# Razorpay Key ID (required for payments)
RAZORPAY_KEY_ID="rzp_test_xxxxx"

# Razorpay Key Secret (required for payments)
RAZORPAY_KEY_SECRET="your-razorpay-secret"
```

---

## Notifications

### Firebase Cloud Messaging (FCM)

```bash
# FCM Server Key for push notifications (optional)
FCM_SERVER_KEY="your-fcm-server-key"
```

### Email (SendGrid)

```bash
# SendGrid API Key (optional, primary email provider)
SENDGRID_API_KEY="SG.xxxxx"

# SendGrid sender email (optional)
SENDGRID_FROM_EMAIL="noreply@risbow.com"
```

### Email (AWS SES - Fallback)

```bash
# AWS SES Region (optional, fallback email provider)
AWS_SES_REGION="us-east-1"

# AWS SES Access Key (optional)
AWS_SES_ACCESS_KEY="your-aws-access-key"

# AWS SES Secret Key (optional)
AWS_SES_SECRET_KEY="your-aws-secret-key"
```

### SMS (Twilio)

```bash
# Twilio Account SID (optional, primary SMS provider)
TWILIO_ACCOUNT_SID="ACxxxxx"

# Twilio Auth Token (optional)
TWILIO_AUTH_TOKEN="your-twilio-auth-token"

# Twilio Phone Number (optional)
TWILIO_PHONE_NUMBER="+1234567890"

# Twilio WhatsApp Number (optional, for WhatsApp messages)
TWILIO_WHATSAPP_NUMBER="whatsapp:+1234567890"
```

### SMS (MSG91 - Fallback)

```bash
# MSG91 API Key (optional, fallback SMS provider)
MSG91_API_KEY="your-msg91-api-key"

# MSG91 Sender ID (optional)
MSG91_SENDER_ID="RISBOW"
```

---

## Storage

### Supabase Storage

```bash
# Supabase Storage Bucket (optional, for file uploads)
SUPABASE_STORAGE_BUCKET="risbow-uploads"

# Supabase Storage Public URL (optional)
SUPABASE_STORAGE_PUBLIC_URL="https://your-project.supabase.co/storage/v1/object/public"
```

---

## Redis & Caching

### Redis Connection

The app uses `REDIS_HOST` and `REDIS_PORT` (BullMQ, queues, locks, caching). It does **not** use `REDIS_URL`.

```bash
# Redis connection (required for caching, queues, and locks)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_USERNAME=""
REDIS_TLS=""
```

- **Disable Redis**: Set `DISABLE_REDIS=true` (or `1`) to run without Redis. The app uses an in-memory store for cache/locks and a stub for queues (no Bull). Use this when Redis is unavailable (e.g. local dev or Render without a Redis add-on).
- **Local development**: `redis-server` listens on **6379** by default. Use `REDIS_HOST=localhost` and `REDIS_PORT=6379` (or omit `REDIS_PORT` to use the default). If you use `REDIS_PORT=6380` (e.g. from Azure config), change it to `6379` for local Redis.
- **Optional**: `REDIS_PASSWORD`, `REDIS_USERNAME`, `REDIS_TLS` for secured Redis (e.g. Azure).

---

## External Services

### OpenRouter (AI/LLM - Optional)

```bash
# OpenRouter API Key (for AI features)
OPENROUTER_API_KEY="sk-or-v1-xxxxx"
```

### Elasticsearch (Search - Optional)

```bash
# Elasticsearch Node URL (optional, for advanced search)
ELASTICSEARCH_NODE="http://localhost:9200"
```

---

## Application Settings

### Server Configuration

```bash
# Server Port (optional, default: 3000)
PORT="3000"

# Node Environment (optional, default: development)
NODE_ENV="production"

# API Base URL (optional, for webhooks and callbacks)
API_BASE_URL="https://api.risbow.com"

# CORS Origins (optional, comma-separated). In production, only these + FRONTEND_URL + localhost/127.0.0.1 (any port) are allowed.
CORS_ORIGINS="https://risbow.com,https://www.risbow.com"

# Frontend URL (optional). Added to allowed CORS origins.
FRONTEND_URL="https://app.risbow.com"
```

### Feature Flags

```bash
# Enable/disable features (optional)
ENABLE_ANALYTICS="true"
ENABLE_QUEUES="true"
ENABLE_CACHE="true"
```

### Logging

```bash
# Log Level (optional, default: info)
LOG_LEVEL="info"

# Force disable colors in logs (for CI/CD)
FORCE_COLOR="0"
```

---

## 🔐 Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong, unique secrets** for JWT tokens (minimum 32 characters)
3. **Rotate secrets regularly** in production
4. **Use environment-specific values** (development, staging, production)
5. **Restrict database access** using firewall rules
6. **Use connection pooling** for database connections
7. **Enable SSL/TLS** for all external connections in production

---

## 📝 Environment Setup Examples

### Development

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/risbow_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key-min-32-characters-long
JWT_REFRESH_SECRET=dev-refresh-secret-key-min-32-characters-long
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=test-secret
```

### Production

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/risbow_prod?sslmode=require
DIRECT_URL=postgresql://user:pass@host:5432/risbow_prod?sslmode=require
REDIS_URL=redis://host:6379?password=secure-password
JWT_SECRET=<strong-production-secret-32-chars-min>
JWT_REFRESH_SECRET=<strong-production-refresh-secret-32-chars-min>
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=<production-secret>
FCM_SERVER_KEY=<fcm-key>
SENDGRID_API_KEY=<sendgrid-key>
SENDGRID_FROM_EMAIL=noreply@risbow.com
TWILIO_ACCOUNT_SID=<twilio-sid>
TWILIO_AUTH_TOKEN=<twilio-token>
TWILIO_PHONE_NUMBER=+1234567890
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<supabase-key>
PORT=3000
LOG_LEVEL=info
```

---

## ✅ Required vs Optional

### Required Variables

- `DATABASE_URL` - Database connection
- `JWT_SECRET` - Access token signing
- `JWT_REFRESH_SECRET` - Refresh token signing
- `REDIS_URL` - Caching and queues

### Optional Variables

All other variables are optional and enable specific features:
- Payment gateway (Razorpay) - Required for payments
- Notifications (FCM, SMS, Email) - Required for notifications
- Storage (Supabase) - Required for file uploads
- External services - Required for specific features

---

## 🔍 Validation

The application will:
- ✅ Start without optional variables (features will be disabled)
- ❌ Fail to start if required variables are missing
- ⚠️ Log warnings when optional services are not configured

---

## 📚 Related Documentation

- [Deployment Guide](./DEPLOY.md)
- [API Integration Guide](./API_INTEGRATION_GUIDE.md)
- [Backend Audit Report](./BACKEND_AUDIT_REPORT.md)

---

**Last Updated**: 2025-01-27

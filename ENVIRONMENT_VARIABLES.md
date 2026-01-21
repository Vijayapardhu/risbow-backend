# Environment Variables Guide

This document lists all environment variables used by the RISBOW Backend.
Configure these in your `.env` file (do NOT commit `.env` to Git).

## 🚀 Server Configuration

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `PORT` | The port the application runs on | No | `3000` | `3001` |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | Yes | `development` | `production` |
| `FRONTEND_URL` | URL of the frontend application (for CORS & email links) | Yes | - | `https://risbow.com` |
| `CORS_ORIGINS` | Comma-separated allowed origins | No | `*` (dev) | `https://risbow.com,https://admin.risbow.com` |

## 🗄️ Database (Prisma)

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `DATABASE_URL` | Transaction pooled connection string for PostgreSQL (Supabase) | Yes | - | `postgresql://user:pass@host:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Direct connection string for PostgreSQL (Migrations) | Yes | - | `postgresql://user:pass@host:5432/postgres` |

## 🔐 Authentication (JWT)

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `JWT_SECRET` | Secret key for signing JSON Web Tokens. Must be strong. | Yes | - | `your-super-secret-jwt-key-min-64-chars` |
| `JWT_EXPIRY` | Token expiration time | No | `60d` | `7d` |

## ⚡ Redis & Queues (BullMQ)

Redis is used for background jobs (emails, cleanup) and coaching. A local instance or cloud Redis can be used.

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `REDIS_HOST` | Hostname of the Redis server | No | `localhost` | `127.0.0.1` |
| `REDIS_PORT` | Port of the Redis server | No | `6379` | `6379` |
| `REDIS_PASSWORD` | Password for Redis authentication (optional) | No | - | `secretredispass` |

> **Note:** If `REDIS_HOST` is not set or connection fails, the app may fall back to in-memory mode for critical features like OTP, but queues (background jobs) will be disabled.

## 💰 Payments (Razorpay)

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `RAZORPAY_KEY_ID` | Public Key ID from Razorpay Dashboard | Yes | - | `rzp_test_1234567890` |
| `RAZORPAY_KEY_SECRET` | Secret Key from Razorpay Dashboard | Yes | - | `abcde12345` |

## 📨 Email (SMTP) & SMS

Used for sending OTPs and notifications.

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `OTP_PROVIDER` | Provider for OTP: `msg91`, `console` (dev log), or `mock` | No | `console` | `msg91` |
| `MSG91_AUTH_KEY` | Auth Key for MSG91 | Conditional | - | `3434...` |
| `MSG91_SENDER_ID` | Sender ID for MSG91 | Conditional | - | `RISBOW` |
| `SMTP_HOST` | SMTP Server Host | No | - | `smtp.resend.com` |
| `SMTP_PORT` | SMTP Server Port | No | `587` | `587` |
| `SMTP_USER` | SMTP Username | No | - | `resend` |
| `SMTP_PASS` | SMTP Password | No | - | `re_123...` |
| `SMTP_FROM` | From email address | No | `noreply@risbow.com` | `hello@risbow.com` |

## 🛡️ Security & Throttling

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `THROTTLE_TTL` | Time window for rate limiting in ms | No | `60000` | `60000` (1 min) |
| `THROTTLE_LIMIT` | Max requests per TTL window | No | `100` | `100` |

## ☁️ File Uploads (Supabase Storage)

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `SUPABASE_URL` | Supabase Project URL | No* | - | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Anon Key (public) | No* | - | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (admin) | No* | - | `eyJ...` |

*(Required if using Supabase Storage or Auth integration)

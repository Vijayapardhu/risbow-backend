# RISBOW Backend Deployment (VM / Bare Node)

This guide is for deploying `risbow-backend` on a Linux VM (systemd/PM2) using **Prisma Migrate Deploy**.

## Prerequisites
- Node.js **20.x**
- PostgreSQL **14+**
- Redis **6+** (required in production for BullMQ + distributed cron locks)

## 1) Environment variables
Create a `.env` file (or set env vars in your process manager). See [`ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md).

## 2) Install + build

```bash
cd risbow-backend
npm ci

# Apply migrations (production-safe)
npx prisma migrate deploy

# Generate Prisma client + compile NestJS
npm run build
```

## 3) Start the server

```bash
export NODE_ENV=production
export PORT=3000
npm run start:prod
```

Health check: `GET /api/v1/health`

## 4) PM2 example

```bash
npm i -g pm2
pm2 start dist/main.js --name risbow-backend
pm2 save
pm2 startup
```

## 5) Notes on DB state (“already migrated” databases)
`npx prisma migrate deploy` assumes your DB has a consistent Prisma migration history (`_prisma_migrations`).

If the DB schema was created outside Prisma migrations (e.g., `prisma db push` or manual DDL), you have two safe options:
- **Option A (recommended)**: start from a fresh DB and run `npx prisma migrate deploy`.
- **Option B (advanced)**: baseline the DB using `npx prisma migrate resolve` so Prisma considers existing migrations “applied”.

## 6) Required production safety expectations
- Redis must be configured (queues + cron locks).
- Razorpay webhook secret must be set (`RAZORPAY_WEBHOOK_SECRET`).
- Money values are stored as integer paise; do not change to floats.
- Returns are **replacement-only** (refunds require explicit admin override paths).


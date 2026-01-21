# RISBOW Deployment Guide

This guide covers the deployment strategy for the RISBOW Backend across Local, Staging, and Production environments.

## 🏗️ Build Lifecycle

The application is a NestJS project that compiles TypeScript to JavaScript.

**Build Command:**
```bash
npm run build
```
*Output:* `./dist` directory containing the compiled application.

**Dependencies:**
- `dependencies`: Required for runtime (NestJS, simple-json, etc.)
- `devDependencies`: Required for build (TypeScript, Jest, ESLint) - *Pruned in production*.

---

## 💻 1. Local Development

For developing features and running locally.

### Prerequisites
- Node.js v18+
- Docker & Docker Compose (Recommended for DB/Redis)

### Setup
1.  **Start Infrastructure:**
    ```bash
    docker-compose up -d postgres redis
    ```
2.  **Configure Env:**
    Copy `.env.example` to `.env` and set `DATABASE_URL` to your local postgres.
3.  **Run Migrations:**
    ```bash
    npm run prisma:push
    ```
4.  **Start App:**
    ```bash
    npm run start:dev
    ```

---

## 🚀 2. Production Deployment

The recommended platform is **Render** or **Railway**, but any VPS/Container platform works.

### A. Deployment via Render.com (Blueprint)
We provide a `render.yaml` blueprint for one-click infrastructure.

1.  **Connect Repo:** Link this repository to Render.
2.  **Select Blueprint:** Choose `render.yaml`.
3.  **Env Vars:** Render will prompt for required secrets (`JWT_SECRET`, `RAZORPAY_*`).
4.  **Deploy:** Render provisions:
    - **Web Service:** The Node.js Backend.
    - **PostgreSQL:** Managed Database.
    - **Redis:** Managed Redis (for Queues).

**Startup Command:**
The start command handles migrations automatically:
```bash
npx prisma migrate deploy && npm run start:prod
```

### B. Deployment via Docker (VPS)
If deploying to a VPS (EC2, DigitalOcean):

1.  **Build Image:**
    ```bash
    docker build -t risbow-backend .
    ```
2.  **Run Container:**
    ```bash
    docker run -d \
      -p 3000:3000 \
      -e DATABASE_URL=... \
      -e REDIS_HOST=... \
      risbow-backend
    ```

---

## 🗄️ Database Migrations

We use **Prisma Migrate** for schema changes.

- **Dev:** `npx prisma migrate dev --name init` (Creates migration file)
- **Prod:** `npx prisma migrate deploy` (Applies pending migrations)

> **⚠️ Critical:** Never run `prisma push` in production. Always use `migrate deploy` to ensure tracking of schema history.

---

## ⚡ Redis & BullMQ Workers

The application uses **BullMQ** for background jobs (Emails, Cleanup).

- **Standard:** The worker processors run *inside* the main application process. No separate worker service is needed for small-medium scale.
- **Scaling:** For high load, deploy a separate instance running *only* the consumers.
    - Set `QA_WORKER_MODE=true` env var (custom logic required in `main.ts` to only bootstrap queue module).

**Queues:**
- `analytics`: Process banner clicks/views.
- `notifications`: Send Email/SMS.
- `orders`: Async order processing.

---

## 🔄 Rollback Strategy

If a deployment fails or introduces a critical bug:

1.  **Code Rollback:** Revert the Git commit and push. The CI/CD (Render) will re-deploy the previous version.
2.  **Database Rollback:**
    Prisma does not support automatic down migrations easily.
    - **Strategy:** Always ensure migrations are backward compatible (e.g., add columns, don't delete them immediately).
    - **Manual Fix:** If a migration broke the DB, use SQL to revert the schema change manually, then mark the migration as rolled back in the `_prisma_migrations` table.

---

## 🧹 Maintenance & Cron

The `ScheduleModule` (`@nestjs/schedule`) handles cron jobs.

- **Cleanup:** Runs daily to clear abandoned carts and expired OTPs.
- **Metrics:** Aggregates analytics data nightly.

Ensure the application is running 24/7 for crons to execute.

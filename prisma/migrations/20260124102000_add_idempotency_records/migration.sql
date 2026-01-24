-- Idempotency records for money/stock sensitive endpoints
-- Safe for `prisma migrate deploy` (idempotent).

CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "statusCode" INTEGER,
  "response" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyRecord_key_scope_method_path_key"
  ON "IdempotencyRecord" ("key", "scope", "method", "path");

CREATE INDEX IF NOT EXISTS "IdempotencyRecord_scope_createdAt_idx"
  ON "IdempotencyRecord" ("scope", "createdAt");

CREATE INDEX IF NOT EXISTS "IdempotencyRecord_expiresAt_idx"
  ON "IdempotencyRecord" ("expiresAt");


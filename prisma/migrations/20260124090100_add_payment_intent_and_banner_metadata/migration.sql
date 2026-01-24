-- Converted from manual_add_payment_intent_and_banner_metadata.sql
-- RISBOW: Generic PaymentIntent (non-order payments) + Banner.metadata for analytics
-- Money safety: all amounts are integer paise.

-- 1) Add Banner.metadata
ALTER TABLE "Banner"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- 2) Create enum for PaymentIntentPurpose (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentIntentPurpose') THEN
    CREATE TYPE "PaymentIntentPurpose" AS ENUM ('BANNER_SLOT', 'ROOM_PROMOTION', 'VENDOR_MEMBERSHIP');
  END IF;
END$$;

-- 3) Create PaymentIntent table
CREATE TABLE IF NOT EXISTS "PaymentIntent" (
  "id" TEXT NOT NULL,
  "purpose" "PaymentIntentPurpose" NOT NULL,
  "referenceId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
  "providerOrderId" TEXT,
  "paymentId" TEXT,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- Enforce idempotency by business key
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentIntent_purpose_referenceId_key"
  ON "PaymentIntent" ("purpose", "referenceId");

CREATE INDEX IF NOT EXISTS "PaymentIntent_status_createdAt_idx"
  ON "PaymentIntent" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "PaymentIntent_purpose_createdAt_idx"
  ON "PaymentIntent" ("purpose", "createdAt");

CREATE INDEX IF NOT EXISTS "PaymentIntent_createdByUserId_createdAt_idx"
  ON "PaymentIntent" ("createdByUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "PaymentIntent_providerOrderId_idx"
  ON "PaymentIntent" ("providerOrderId");

-- Add FK idempotently (Postgres doesn't support ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentIntent_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "PaymentIntent"
      ADD CONSTRAINT "PaymentIntent_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END$$;


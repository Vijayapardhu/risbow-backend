-- Converted from manual_add_user_product_event.sql
-- RISBOW: UserProductEvent stream for ecommerce-style recommendations and analytics

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserProductEventType') THEN
    CREATE TYPE "UserProductEventType" AS ENUM (
      'PRODUCT_VIEW',
      'PRODUCT_CLICK',
      'ADD_TO_CART',
      'REMOVE_FROM_CART',
      'WISHLIST_ADD',
      'PURCHASE'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "UserProductEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "sessionId" TEXT,
  "type" "UserProductEventType" NOT NULL,
  "source" TEXT,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "quantity" INTEGER,
  "price" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserProductEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserProductEvent_userId_createdAt_idx"
  ON "UserProductEvent" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserProductEvent_productId_createdAt_idx"
  ON "UserProductEvent" ("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserProductEvent_type_createdAt_idx"
  ON "UserProductEvent" ("type", "createdAt");
CREATE INDEX IF NOT EXISTS "UserProductEvent_source_createdAt_idx"
  ON "UserProductEvent" ("source", "createdAt");

-- Add FKs idempotently (Postgres doesn't support ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserProductEvent_userId_fkey') THEN
    ALTER TABLE "UserProductEvent"
      ADD CONSTRAINT "UserProductEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserProductEvent_productId_fkey') THEN
    ALTER TABLE "UserProductEvent"
      ADD CONSTRAINT "UserProductEvent_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;


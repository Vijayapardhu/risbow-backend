-- LocalPromotion table (geo-targeted promos) - safe/idempotent

CREATE TABLE IF NOT EXISTS "LocalPromotion" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "targetType" TEXT NOT NULL,
  "centerLat" DOUBLE PRECISION,
  "centerLng" DOUBLE PRECISION,
  "radiusKm" DOUBLE PRECISION,
  "pincodes" JSONB,
  "vendorId" TEXT,
  "categoryId" TEXT,
  "productId" TEXT,
  "percentOff" INT,
  "flatOffAmount" INT,
  "freeShipping" BOOLEAN NOT NULL DEFAULT FALSE,
  "boostOnly" BOOLEAN NOT NULL DEFAULT FALSE,
  "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "effectiveTo" TIMESTAMPTZ,
  "setByUserId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign keys (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LocalPromotion_vendorId_fkey') THEN
    ALTER TABLE "LocalPromotion"
      ADD CONSTRAINT "LocalPromotion_vendorId_fkey"
      FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LocalPromotion_categoryId_fkey') THEN
    ALTER TABLE "LocalPromotion"
      ADD CONSTRAINT "LocalPromotion_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LocalPromotion_productId_fkey') THEN
    ALTER TABLE "LocalPromotion"
      ADD CONSTRAINT "LocalPromotion_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LocalPromotion_setByUserId_fkey') THEN
    ALTER TABLE "LocalPromotion"
      ADD CONSTRAINT "LocalPromotion_setByUserId_fkey"
      FOREIGN KEY ("setByUserId") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS "LocalPromotion_active_window_idx"
  ON "LocalPromotion" ("isActive", "effectiveFrom", "effectiveTo");
CREATE INDEX IF NOT EXISTS "LocalPromotion_vendorId_idx" ON "LocalPromotion" ("vendorId");
CREATE INDEX IF NOT EXISTS "LocalPromotion_categoryId_idx" ON "LocalPromotion" ("categoryId");
CREATE INDEX IF NOT EXISTS "LocalPromotion_productId_idx" ON "LocalPromotion" ("productId");

-- updatedAt trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_local_promotion') THEN
    CREATE OR REPLACE FUNCTION set_timestamp_local_promotion()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW."updatedAt" = now();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;

    CREATE TRIGGER set_timestamp_local_promotion
    BEFORE UPDATE ON "LocalPromotion"
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamp_local_promotion();
  END IF;
END$$;


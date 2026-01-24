-- Packing video proof (trust) - safe/idempotent

CREATE TABLE IF NOT EXISTS "OrderPackingProof" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId" TEXT UNIQUE NOT NULL,
  "vendorId" TEXT NOT NULL,
  "uploadedByUserId" TEXT NOT NULL,
  "videoPath" TEXT NOT NULL,
  "videoMime" TEXT,
  "videoSizeBytes" INT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderPackingProof_orderId_fkey') THEN
    ALTER TABLE "OrderPackingProof"
      ADD CONSTRAINT "OrderPackingProof_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderPackingProof_vendorId_fkey') THEN
    ALTER TABLE "OrderPackingProof"
      ADD CONSTRAINT "OrderPackingProof_vendorId_fkey"
      FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderPackingProof_uploadedByUserId_fkey') THEN
    ALTER TABLE "OrderPackingProof"
      ADD CONSTRAINT "OrderPackingProof_uploadedByUserId_fkey"
      FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "OrderPackingProof_vendorId_idx" ON "OrderPackingProof" ("vendorId");
CREATE INDEX IF NOT EXISTS "OrderPackingProof_createdAt_idx" ON "OrderPackingProof" ("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_order_packing_proof') THEN
    CREATE OR REPLACE FUNCTION set_timestamp_order_packing_proof()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW."updatedAt" = now();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;

    CREATE TRIGGER set_timestamp_order_packing_proof
    BEFORE UPDATE ON "OrderPackingProof"
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamp_order_packing_proof();
  END IF;
END$$;


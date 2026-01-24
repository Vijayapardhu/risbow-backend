-- Vendor store availability fields (safe/idempotent)

ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "storeStatus" "VendorStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "storeClosedUntil" TIMESTAMPTZ;


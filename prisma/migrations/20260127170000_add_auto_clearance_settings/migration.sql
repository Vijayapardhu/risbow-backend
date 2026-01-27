-- Add auto-clearance settings to Vendor table
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "autoClearanceThresholdDays" INTEGER DEFAULT 7;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "defaultClearanceDiscountPercent" INTEGER DEFAULT 20;

-- Add expiryDate to Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);

-- Add index for efficient expiry date queries
CREATE INDEX IF NOT EXISTS "Product_expiryDate_idx" ON "Product"("expiryDate") WHERE "expiryDate" IS NOT NULL;

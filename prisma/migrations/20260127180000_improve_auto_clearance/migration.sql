-- Add disableAutoClearance flag to Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "disableAutoClearance" BOOLEAN NOT NULL DEFAULT false;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS "Product_disableAutoClearance_idx" ON "Product"("disableAutoClearance") WHERE "disableAutoClearance" = false;

-- Add index for expiry date queries with auto-clearance enabled
CREATE INDEX IF NOT EXISTS "Product_expiryDate_autoClearance_idx" ON "Product"("expiryDate", "disableAutoClearance", "isActive") 
WHERE "expiryDate" IS NOT NULL AND "disableAutoClearance" = false AND "isActive" = true;

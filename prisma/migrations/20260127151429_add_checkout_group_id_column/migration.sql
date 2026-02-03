-- Add checkoutGroupId column if it doesn't exist
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "checkoutGroupId" TEXT;

-- Add index if it doesn't exist
CREATE INDEX IF NOT EXISTS "Order_checkoutGroupId_idx" ON "Order" ("checkoutGroupId");

-- Drop constraint if it exists (Fix for Shadow DB / Idempotency)
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_checkoutGroupId_fkey";

-- Add foreign key constraint
ALTER TABLE "Order" ADD CONSTRAINT "Order_checkoutGroupId_fkey" FOREIGN KEY ("checkoutGroupId") REFERENCES "CheckoutGroup"("id") ON DELETE SET NULL;

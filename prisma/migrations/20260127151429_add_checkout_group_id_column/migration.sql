-- Add checkoutGroupId column if it doesn't exist
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "checkoutGroupId" TEXT;

-- Add foreign key constraint if it doesn't exist
DO $$$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'Order_checkoutGroupId_fkey'
  ) THEN
    ALTER TABLE "Order"
    ADD CONSTRAINT "Order_checkoutGroupId_fkey"
    FOREIGN KEY ("checkoutGroupId") REFERENCES "CheckoutGroup"("id") ON DELETE SET NULL;
  END IF;
END$$$;

-- Add index if it doesn't exist
CREATE INDEX IF NOT EXISTS "Order_checkoutGroupId_idx" ON "Order" ("checkoutGroupId");

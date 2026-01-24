-- Converted from manual_add_order_timeline_and_fields.sql

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrderTimeline" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "notes" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderTimeline_orderId_idx" ON "OrderTimeline"("orderId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderTimeline_orderId_fkey') THEN
    ALTER TABLE "OrderTimeline"
      ADD CONSTRAINT "OrderTimeline_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

-- Add new fields to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "giftId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountAmount" INTEGER NOT NULL DEFAULT 0;

-- Add metadata field to Banner table
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "metadata" JSONB;


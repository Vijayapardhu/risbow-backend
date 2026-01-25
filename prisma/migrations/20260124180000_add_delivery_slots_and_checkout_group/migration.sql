-- Delivery slots + checkout group (split orders per vendor) - safe/idempotent

-- 1) Enums (Postgres types)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CheckoutGroupStatus') THEN
    CREATE TYPE "CheckoutGroupStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliverySlotSource') THEN
    CREATE TYPE "DeliverySlotSource" AS ENUM ('AUTO', 'CUSTOMER');
  END IF;
END$$;

-- 2) CheckoutGroup
CREATE TABLE IF NOT EXISTS "CheckoutGroup" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
  "providerOrderId" TEXT,
  "totalAmountPaise" INT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" "CheckoutGroupStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) VendorDeliveryWindow
CREATE TABLE IF NOT EXISTS "VendorDeliveryWindow" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "vendorId" TEXT NOT NULL,
  "weekday" INT NOT NULL,
  "startMinute" INT NOT NULL,
  "endMinute" INT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) OrderDeliverySlotSnapshot
CREATE TABLE IF NOT EXISTS "OrderDeliverySlotSnapshot" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId" TEXT UNIQUE NOT NULL,
  "vendorId" TEXT NOT NULL,
  "slotStartAt" TIMESTAMPTZ NOT NULL,
  "slotEndAt" TIMESTAMPTZ NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "source" "DeliverySlotSource" NOT NULL DEFAULT 'AUTO',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Link Order -> CheckoutGroup
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "checkoutGroupId" TEXT;

-- Foreign keys (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CheckoutGroup_userId_fkey') THEN
    ALTER TABLE "CheckoutGroup"
      ADD CONSTRAINT "CheckoutGroup_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VendorDeliveryWindow_vendorId_fkey') THEN
    ALTER TABLE "VendorDeliveryWindow"
      ADD CONSTRAINT "VendorDeliveryWindow_vendorId_fkey"
      FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderDeliverySlotSnapshot_orderId_fkey') THEN
    ALTER TABLE "OrderDeliverySlotSnapshot"
      ADD CONSTRAINT "OrderDeliverySlotSnapshot_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderDeliverySlotSnapshot_vendorId_fkey') THEN
    ALTER TABLE "OrderDeliverySlotSnapshot"
      ADD CONSTRAINT "OrderDeliverySlotSnapshot_vendorId_fkey"
      FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_checkoutGroupId_fkey') THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_checkoutGroupId_fkey"
      FOREIGN KEY ("checkoutGroupId") REFERENCES "CheckoutGroup"("id") ON DELETE SET NULL;
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS "CheckoutGroup_userId_createdAt_idx" ON "CheckoutGroup" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CheckoutGroup_providerOrderId_idx" ON "CheckoutGroup" ("providerOrderId");

CREATE INDEX IF NOT EXISTS "VendorDeliveryWindow_vendorId_weekday_active_idx" ON "VendorDeliveryWindow" ("vendorId", "weekday", "isActive");
CREATE INDEX IF NOT EXISTS "VendorDeliveryWindow_vendorId_active_idx" ON "VendorDeliveryWindow" ("vendorId", "isActive");

CREATE INDEX IF NOT EXISTS "OrderDeliverySlotSnapshot_vendorId_slotStartAt_idx" ON "OrderDeliverySlotSnapshot" ("vendorId", "slotStartAt");
CREATE INDEX IF NOT EXISTS "Order_checkoutGroupId_idx" ON "Order" ("checkoutGroupId");

-- updatedAt triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_checkout_group') THEN
    CREATE OR REPLACE FUNCTION set_timestamp_checkout_group()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW."updatedAt" = now();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;

    CREATE TRIGGER set_timestamp_checkout_group
    BEFORE UPDATE ON "CheckoutGroup"
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamp_checkout_group();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_vendor_delivery_window') THEN
    CREATE OR REPLACE FUNCTION set_timestamp_vendor_delivery_window()
    RETURNS TRIGGER AS $fn2$
    BEGIN
      NEW."updatedAt" = now();
      RETURN NEW;
    END;
    $fn2$ LANGUAGE plpgsql;

    CREATE TRIGGER set_timestamp_vendor_delivery_window
    BEFORE UPDATE ON "VendorDeliveryWindow"
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamp_vendor_delivery_window();
  END IF;
END$$;


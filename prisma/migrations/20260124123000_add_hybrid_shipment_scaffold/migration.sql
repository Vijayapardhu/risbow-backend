-- Hybrid fulfillment scaffold: VendorServiceArea, PickupPoint, Shipment (safe/idempotent)

CREATE TABLE IF NOT EXISTS "VendorServiceArea" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "vendorId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "centerLat" DOUBLE PRECISION,
  "centerLng" DOUBLE PRECISION,
  "radiusKm" DOUBLE PRECISION,
  "polygon" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "PickupPoint" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "vendorId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "addressLine1" TEXT NOT NULL,
  "addressLine2" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "pincode" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "timings" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Shipment" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId" TEXT UNIQUE NOT NULL,
  "mode" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "courierProvider" TEXT,
  "awb" TEXT,
  "trackingUrl" TEXT,
  "pickupPointId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FKs (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VendorServiceArea_vendorId_fkey') THEN
    ALTER TABLE "VendorServiceArea"
      ADD CONSTRAINT "VendorServiceArea_vendorId_fkey"
      FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PickupPoint_vendorId_fkey') THEN
    ALTER TABLE "PickupPoint"
      ADD CONSTRAINT "PickupPoint_vendorId_fkey"
      FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Shipment_orderId_fkey') THEN
    ALTER TABLE "Shipment"
      ADD CONSTRAINT "Shipment_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Shipment_pickupPointId_fkey') THEN
    ALTER TABLE "Shipment"
      ADD CONSTRAINT "Shipment_pickupPointId_fkey"
      FOREIGN KEY ("pickupPointId") REFERENCES "PickupPoint"("id") ON DELETE SET NULL;
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS "VendorServiceArea_vendorId_idx" ON "VendorServiceArea" ("vendorId");
CREATE INDEX IF NOT EXISTS "VendorServiceArea_isActive_idx" ON "VendorServiceArea" ("isActive");
CREATE INDEX IF NOT EXISTS "PickupPoint_vendorId_idx" ON "PickupPoint" ("vendorId");
CREATE INDEX IF NOT EXISTS "PickupPoint_pincode_idx" ON "PickupPoint" ("pincode");
CREATE INDEX IF NOT EXISTS "Shipment_awb_idx" ON "Shipment" ("awb");
CREATE INDEX IF NOT EXISTS "Shipment_pickupPointId_idx" ON "Shipment" ("pickupPointId");

-- updatedAt triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_vendor_service_area') THEN
    CREATE OR REPLACE FUNCTION set_timestamp_vendor_service_area()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW."updatedAt" = now();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
    CREATE TRIGGER set_timestamp_vendor_service_area
    BEFORE UPDATE ON "VendorServiceArea"
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamp_vendor_service_area();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_pickup_point') THEN
    CREATE OR REPLACE FUNCTION set_timestamp_pickup_point()
    RETURNS TRIGGER AS $fn2$
    BEGIN
      NEW."updatedAt" = now();
      RETURN NEW;
    END;
    $fn2$ LANGUAGE plpgsql;
    CREATE TRIGGER set_timestamp_pickup_point
    BEFORE UPDATE ON "PickupPoint"
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamp_pickup_point();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_shipment') THEN
    CREATE OR REPLACE FUNCTION set_timestamp_shipment()
    RETURNS TRIGGER AS $fn3$
    BEGIN
      NEW."updatedAt" = now();
      RETURN NEW;
    END;
    $fn3$ LANGUAGE plpgsql;
    CREATE TRIGGER set_timestamp_shipment
    BEFORE UPDATE ON "Shipment"
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamp_shipment();
  END IF;
END$$;


-- Add Address geo fields + pincode centroid table (safe/idempotent)

-- 1) GeoSource enum (Postgres type)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GeoSource') THEN
    CREATE TYPE "GeoSource" AS ENUM ('PINCODE_DB', 'NOMINATIM', 'MANUAL');
  END IF;
END$$;

-- 2) Address columns
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "geoSource" "GeoSource";
ALTER TABLE "Address" ADD COLUMN IF NOT EXISTS "geoUpdatedAt" TIMESTAMPTZ;

-- 3) PincodeGeo table
CREATE TABLE IF NOT EXISTS "PincodeGeo" (
  "pincode" TEXT PRIMARY KEY,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "source" "GeoSource" NOT NULL DEFAULT 'PINCODE_DB',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep updatedAt fresh
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_pincode_geo') THEN
    CREATE OR REPLACE FUNCTION set_timestamp_pincode_geo()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW."updatedAt" = now();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;

    CREATE TRIGGER set_timestamp_pincode_geo
    BEFORE UPDATE ON "PincodeGeo"
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamp_pincode_geo();
  END IF;
END$$;


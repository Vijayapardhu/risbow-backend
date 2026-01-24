-- Converted from manual_add_vendor_inquiries.sql
-- RISBOW: VendorInquiry (B2B wholesaler inquiries)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InquiryStatus') THEN
    CREATE TYPE "InquiryStatus" AS ENUM ('PENDING','RESPONDED','ACCEPTED','REJECTED','EXPIRED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "VendorInquiry" (
  "id" TEXT NOT NULL,
  "wholesalerVendorId" TEXT NOT NULL,
  "requesterUserId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "message" TEXT,
  "status" "InquiryStatus" NOT NULL DEFAULT 'PENDING',
  "response" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VendorInquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VendorInquiry_wholesalerVendorId_status_idx"
  ON "VendorInquiry" ("wholesalerVendorId", "status");
CREATE INDEX IF NOT EXISTS "VendorInquiry_requesterUserId_status_idx"
  ON "VendorInquiry" ("requesterUserId", "status");
CREATE INDEX IF NOT EXISTS "VendorInquiry_productId_idx"
  ON "VendorInquiry" ("productId");
CREATE INDEX IF NOT EXISTS "VendorInquiry_createdAt_idx"
  ON "VendorInquiry" ("createdAt");

-- Add FKs idempotently (Postgres doesn't support ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VendorInquiry_wholesalerVendorId_fkey') THEN
    ALTER TABLE "VendorInquiry"
      ADD CONSTRAINT "VendorInquiry_wholesalerVendorId_fkey"
      FOREIGN KEY ("wholesalerVendorId") REFERENCES "Vendor"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VendorInquiry_requesterUserId_fkey') THEN
    ALTER TABLE "VendorInquiry"
      ADD CONSTRAINT "VendorInquiry_requesterUserId_fkey"
      FOREIGN KEY ("requesterUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VendorInquiry_productId_fkey') THEN
    ALTER TABLE "VendorInquiry"
      ADD CONSTRAINT "VendorInquiry_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;


-- Fix for RLS Policies Issue

-- Step 0: Drop RLS policies that depend on kycStatus column
DROP POLICY IF EXISTS "customers_read_active_vendors" ON "Vendor";
DROP POLICY IF EXISTS "retailers_read_wholesalers" ON "Vendor";

-- CreateEnum for new types
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'PENDING_PAYMENT', 'VERIFIED', 'REJECTED');
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Add failure tracking columns to VendorRegistrationPayment
ALTER TABLE "VendorRegistrationPayment" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;
ALTER TABLE "VendorRegistrationPayment" ADD COLUMN IF NOT EXISTS "failureCode" TEXT;

-- Step 1: Add temporary columns with enum types
ALTER TABLE "Vendor" ADD COLUMN "kycStatus_new" "KycStatus";
ALTER TABLE "VendorDocument" ADD COLUMN "documentType_new" "VendorDocumentType";
ALTER TABLE "VendorDocument" ADD COLUMN "status_new" "DocumentStatus";

-- Step 2: Copy data from old columns to new columns with casting
UPDATE "Vendor" SET "kycStatus_new" = 
  CASE 
    WHEN "kycStatus" = 'PENDING' THEN 'PENDING'::"KycStatus"
    WHEN "kycStatus" = 'PENDING_PAYMENT' THEN 'PENDING_PAYMENT'::"KycStatus"
    WHEN "kycStatus" = 'VERIFIED' THEN 'VERIFIED'::"KycStatus"
    WHEN "kycStatus" = 'REJECTED' THEN 'REJECTED'::"KycStatus"
    ELSE 'PENDING'::"KycStatus"
  END;

UPDATE "VendorDocument" SET "documentType_new" = 
  CASE 
    WHEN "documentType" = 'PAN_CARD' THEN 'PAN_CARD'::"VendorDocumentType"
    WHEN "documentType" = 'GST_CERTIFICATE' THEN 'GST_CERTIFICATE'::"VendorDocumentType"
    WHEN "documentType" = 'AADHAAR_CARD' THEN 'AADHAAR_CARD'::"VendorDocumentType"
    WHEN "documentType" = 'DRIVING_LICENSE' THEN 'DRIVING_LICENSE'::"VendorDocumentType"
    WHEN "documentType" = 'PASSPORT' THEN 'PASSPORT'::"VendorDocumentType"
    WHEN "documentType" = 'BANK_STATEMENT' THEN 'BANK_STATEMENT'::"VendorDocumentType"
    WHEN "documentType" = 'CANCELLED_CHEQUE' THEN 'CANCELLED_CHEQUE'::"VendorDocumentType"
    WHEN "documentType" = 'STORE_PHOTO' THEN 'STORE_PHOTO'::"VendorDocumentType"
    ELSE 'OTHER'::"VendorDocumentType"
  END;

UPDATE "VendorDocument" SET "status_new" = 
  CASE 
    WHEN "status" = 'PENDING' THEN 'PENDING'::"DocumentStatus"
    WHEN "status" = 'APPROVED' THEN 'APPROVED'::"DocumentStatus"
    WHEN "status" = 'REJECTED' THEN 'REJECTED'::"DocumentStatus"
    ELSE 'PENDING'::"DocumentStatus"
  END;

-- Step 3: Drop old columns
ALTER TABLE "Vendor" DROP COLUMN "kycStatus";
ALTER TABLE "VendorDocument" DROP COLUMN "documentType";
ALTER TABLE "VendorDocument" DROP COLUMN "status";

-- Step 4: Rename new columns to old names
ALTER TABLE "Vendor" RENAME COLUMN "kycStatus_new" TO "kycStatus";
ALTER TABLE "VendorDocument" RENAME COLUMN "documentType_new" TO "documentType";
ALTER TABLE "VendorDocument" RENAME COLUMN "status_new" TO "status";

-- Step 5: Set NOT NULL constraints
ALTER TABLE "Vendor" ALTER COLUMN "kycStatus" SET NOT NULL;
ALTER TABLE "Vendor" ALTER COLUMN "kycStatus" SET DEFAULT 'PENDING'::"KycStatus";

ALTER TABLE "VendorDocument" ALTER COLUMN "documentType" SET NOT NULL;
ALTER TABLE "VendorDocument" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "VendorDocument" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"DocumentStatus";

-- Step 6: Add new indexes
CREATE INDEX IF NOT EXISTS "VendorDocument_vendorId_documentType_idx" ON "VendorDocument"("vendorId", "documentType");
CREATE INDEX IF NOT EXISTS "VendorDocument_documentType_idx" ON "VendorDocument"("documentType");

-- Step 7: Recreate existing indexes that might have been affected
DROP INDEX IF EXISTS "Vendor_kycStatus_idx";
CREATE INDEX "Vendor_kycStatus_idx" ON "Vendor"("kycStatus");

DROP INDEX IF EXISTS "VendorDocument_status_idx";
CREATE INDEX "VendorDocument_status_idx" ON "VendorDocument"("status");

DROP INDEX IF EXISTS "VendorDocument_vendorId_status_idx";
CREATE INDEX "VendorDocument_vendorId_status_idx" ON "VendorDocument"("vendorId", "status");

-- Step 8: Recreate RLS policies with new enum type
CREATE POLICY "customers_read_active_vendors" ON "Vendor"
  FOR SELECT
  USING (
    "kycStatus" = 'VERIFIED'::"KycStatus" 
    AND "storeStatus" = 'ACTIVE'::"VendorStatus"
  );

CREATE POLICY "retailers_read_wholesalers" ON "Vendor"
  FOR SELECT
  USING (
    "kycStatus" = 'VERIFIED'::"KycStatus"
    AND "role" = 'WHOLESALER'::"VendorRole"
  );

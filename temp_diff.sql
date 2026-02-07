-- DropIndex
DROP INDEX "VendorDocument_vendorId_documentType_idx";

-- DropIndex
DROP INDEX "VendorDocument_documentType_idx";

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "kycStatus",
ADD COLUMN     "kycStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "VendorRegistrationPayment" DROP COLUMN "failureCode",
DROP COLUMN "failureReason";

-- AlterTable
ALTER TABLE "VendorDocument" DROP COLUMN "documentType",
ADD COLUMN     "documentType" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "KycStatus";

-- CreateIndex
CREATE INDEX "Vendor_kycStatus_idx" ON "Vendor"("kycStatus" ASC);

-- CreateIndex
CREATE INDEX "VendorDocument_status_idx" ON "VendorDocument"("status" ASC);

-- CreateIndex
CREATE INDEX "VendorDocument_vendorId_status_idx" ON "VendorDocument"("vendorId" ASC, "status" ASC);


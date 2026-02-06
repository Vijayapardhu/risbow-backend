-- CreateEnum
CREATE TYPE "VendorDocumentType" AS ENUM ('PAN_CARD', 'GST_CERTIFICATE', 'AADHAAR_CARD', 'DRIVING_LICENSE', 'PASSPORT', 'BANK_STATEMENT', 'CANCELLED_CHEQUE', 'STORE_PHOTO', 'OTHER');

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "rejectionReason" TEXT,
ALTER COLUMN "storeStatus" DROP NOT NULL;

-- CreateTable
CREATE TABLE "VendorRegistrationPayment" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "VendorRegistrationPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorRegistrationPayment_vendorId_key" ON "VendorRegistrationPayment"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorRegistrationPayment_razorpayOrderId_key" ON "VendorRegistrationPayment"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorRegistrationPayment_razorpayPaymentId_key" ON "VendorRegistrationPayment"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "VendorRegistrationPayment_status_idx" ON "VendorRegistrationPayment"("status");

-- CreateIndex
CREATE INDEX "VendorRegistrationPayment_razorpayOrderId_idx" ON "VendorRegistrationPayment"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "VendorRegistrationPayment_createdAt_idx" ON "VendorRegistrationPayment"("createdAt");

-- AddForeignKey
ALTER TABLE "VendorRegistrationPayment" ADD CONSTRAINT "VendorRegistrationPayment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKUP_COMPLETED', 'QC_IN_PROGRESS', 'QC_PASSED', 'QC_FAILED', 'REPLACEMENT_INITIATED', 'REPLACEMENT_COMPLETED');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED_PRODUCT', 'WRONG_ITEM', 'MISSING_PARTS', 'QUALITY_ISSUE', 'SIZE_FIT_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "SpecType" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'BOOLEAN', 'MULTISELECT');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingCharges" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "allergenInformation" TEXT,
ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "basePreparationTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "costPrice" INTEGER,
ADD COLUMN     "isAttachmentRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isCancelable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isInclusiveTax" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isReturnable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mediaGallery" JSONB,
ADD COLUMN     "minOrderQuantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "quantityStepSize" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "requiresOTP" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rulesSnapshot" JSONB,
ADD COLUMN     "shippingDetails" JSONB,
ADD COLUMN     "storageInstructions" TEXT,
ADD COLUMN     "totalAllowedQuantity" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "strikes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vendorId" TEXT,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "reason" "ReturnReason" NOT NULL,
    "description" TEXT,
    "evidenceImages" TEXT[],
    "evidenceVideo" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pickupDate" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "pickupAddress" JSONB,
    "courierPartner" TEXT,
    "trackingId" TEXT,
    "qcNotes" TEXT,
    "qcBy" TEXT,
    "replacementOrderId" TEXT,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" "ReturnReason",
    "condition" TEXT,

    CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnSettlement" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "costBearer" TEXT NOT NULL,
    "penaltyApplied" BOOLEAN NOT NULL DEFAULT false,
    "penaltyAmount" DOUBLE PRECISION,
    "adminNotes" TEXT,

    CONSTRAINT "ReturnSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnTimeline" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ReturnTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorySpec" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelTE" TEXT,
    "type" "SpecType" NOT NULL,
    "unit" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategorySpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpecValue" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSpecValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_returnNumber_key" ON "ReturnRequest"("returnNumber");

-- CreateIndex
CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");

-- CreateIndex
CREATE INDEX "ReturnRequest_status_idx" ON "ReturnRequest"("status");

-- CreateIndex
CREATE INDEX "ReturnRequest_userId_idx" ON "ReturnRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnSettlement_returnId_key" ON "ReturnSettlement"("returnId");

-- CreateIndex
CREATE INDEX "CategorySpec_categoryId_isActive_idx" ON "CategorySpec"("categoryId", "isActive");

-- CreateIndex
CREATE INDEX "CategorySpec_categoryId_sortOrder_idx" ON "CategorySpec"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CategorySpec_categoryId_key_key" ON "CategorySpec"("categoryId", "key");

-- CreateIndex
CREATE INDEX "ProductSpecValue_productId_idx" ON "ProductSpecValue"("productId");

-- CreateIndex
CREATE INDEX "ProductSpecValue_specId_idx" ON "ProductSpecValue"("specId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSpecValue_productId_specId_key" ON "ProductSpecValue"("productId", "specId");

-- CreateIndex
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "ReturnRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnSettlement" ADD CONSTRAINT "ReturnSettlement_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "ReturnRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnTimeline" ADD CONSTRAINT "ReturnTimeline_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "ReturnRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorySpec" ADD CONSTRAINT "CategorySpec_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpecValue" ADD CONSTRAINT "ProductSpecValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpecValue" ADD CONSTRAINT "ProductSpecValue_specId_fkey" FOREIGN KEY ("specId") REFERENCES "CategorySpec"("id") ON DELETE CASCADE ON UPDATE CASCADE;

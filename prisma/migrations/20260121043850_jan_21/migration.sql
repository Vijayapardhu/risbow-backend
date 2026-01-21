/*
  Warnings:

  - The values [PENDING] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [PENDING_APPROVAL,APPROVED,REJECTED,REPLACEMENT_INITIATED,REPLACEMENT_COMPLETED] on the enum `ReturnStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('ACTIVE', 'REPORTED', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "AttributeScope" AS ENUM ('PRODUCT', 'VARIATION');

-- CreateEnum
CREATE TYPE "ProductVisibility" AS ENUM ('DRAFT', 'PUBLISHED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "VariationStatus" AS ENUM ('ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'GIF');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('CREATED', 'PENDING_PAYMENT', 'CONFIRMED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'REPLACED');
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TABLE "OrderTimeline" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'CREATED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ReturnStatus_new" AS ENUM ('RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'PICKUP_SCHEDULED', 'PICKUP_COMPLETED', 'QC_IN_PROGRESS', 'QC_PASSED', 'QC_FAILED', 'REPLACEMENT_SHIPPED', 'REPLACED');
ALTER TABLE "ReturnRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ReturnRequest" ALTER COLUMN "status" TYPE "ReturnStatus_new" USING ("status"::text::"ReturnStatus_new");
ALTER TABLE "ReturnTimeline" ALTER COLUMN "status" TYPE "ReturnStatus_new" USING ("status"::text::"ReturnStatus_new");
ALTER TYPE "ReturnStatus" RENAME TO "ReturnStatus_old";
ALTER TYPE "ReturnStatus_new" RENAME TO "ReturnStatus";
DROP TYPE "ReturnStatus_old";
ALTER TABLE "ReturnRequest" ALTER COLUMN "status" SET DEFAULT 'RETURN_REQUESTED';
COMMIT;

-- DropIndex
DROP INDEX "Product_categoryId_isActive_idx";

-- DropIndex
DROP INDEX "Product_vendorId_isActive_idx";

-- AlterTable
ALTER TABLE "CategorySpec" ADD COLUMN     "scope" "AttributeScope" NOT NULL DEFAULT 'PRODUCT';

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'CREATED';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "defaultVariationId" TEXT,
ADD COLUMN     "hasVariations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "variationOptions" JSONB,
ADD COLUMN     "videos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "visibility" "ProductVisibility" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "ReturnRequest" ADD COLUMN     "replacementTrackingId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'RETURN_REQUESTED';

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "helpfulCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "commissionOverrides" JSONB,
ADD COLUMN     "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "OrderTimeline" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "notes" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "mrp" INTEGER NOT NULL,
    "sellingPrice" INTEGER NOT NULL,
    "costPrice" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "status" "VariationStatus" NOT NULL DEFAULT 'ACTIVE',
    "weight" DOUBLE PRECISION,
    "dimensions" JSONB,
    "mediaOverrides" JSONB,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderTimeline_orderId_idx" ON "OrderTimeline"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariation_sku_key" ON "ProductVariation"("sku");

-- CreateIndex
CREATE INDEX "ProductVariation_productId_idx" ON "ProductVariation"("productId");

-- CreateIndex
CREATE INDEX "ProductVariation_sku_idx" ON "ProductVariation"("sku");

-- CreateIndex
CREATE INDEX "Product_visibility_idx" ON "Product"("visibility");

-- CreateIndex
CREATE INDEX "Product_vendorId_visibility_idx" ON "Product"("vendorId", "visibility");

-- CreateIndex
CREATE INDEX "Product_categoryId_visibility_idx" ON "Product"("categoryId", "visibility");

-- AddForeignKey
ALTER TABLE "OrderTimeline" ADD CONSTRAINT "OrderTimeline_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariation" ADD CONSTRAINT "ProductVariation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

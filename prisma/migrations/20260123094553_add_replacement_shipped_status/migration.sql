/*
  Warnings:

  - The values [RETURN_REQUESTED] on the enum `ReturnStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `deliveredAt` on the `ReturnRequest` table. All the data in the column will be lost.
  - You are about to drop the column `replacementOrderId` on the `ReturnRequest` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `ReturnSettlement` table. All the data in the column will be lost.
  - The `costBearer` column on the `ReturnSettlement` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `penaltyAmount` on the `ReturnSettlement` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - Added the required column `updatedAt` to the `ReturnSettlement` table without a default value. This is not possible if the table is not empty.
  - Made the column `penaltyAmount` on table `ReturnSettlement` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('UNOPENED', 'OPENED_UNUSED', 'USED_LIKE_NEW', 'USED_GOOD', 'USED_FAIR', 'DAMAGED', 'DEFECTIVE');

-- CreateEnum
CREATE TYPE "CostBearer" AS ENUM ('PLATFORM', 'VENDOR', 'CUSTOMER', 'SHARED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReturnReason" ADD VALUE 'NOT_AS_DESCRIBED';
ALTER TYPE "ReturnReason" ADD VALUE 'DEFECTIVE';
ALTER TYPE "ReturnReason" ADD VALUE 'CHANGED_MIND';

-- AlterEnum
BEGIN;
CREATE TYPE "ReturnStatus_new" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKUP_COMPLETED', 'IN_TRANSIT', 'RECEIVED_AT_WAREHOUSE', 'QC_IN_PROGRESS', 'QC_PASSED', 'QC_FAILED', 'REFUND_INITIATED', 'REFUND_COMPLETED', 'REPLACEMENT_INITIATED', 'REPLACEMENT_SHIPPED', 'REPLACEMENT_COMPLETED', 'CANCELLED');
ALTER TABLE "ReturnRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ReturnRequest" ALTER COLUMN "status" TYPE "ReturnStatus_new" USING ("status"::text::"ReturnStatus_new");
ALTER TABLE "ReturnTimeline" ALTER COLUMN "status" TYPE "ReturnStatus_new" USING ("status"::text::"ReturnStatus_new");
ALTER TYPE "ReturnStatus" RENAME TO "ReturnStatus_old";
ALTER TYPE "ReturnStatus_new" RENAME TO "ReturnStatus";
DROP TYPE "ReturnStatus_old";
ALTER TABLE "ReturnRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';
COMMIT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "isReturnable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "returnWindow" INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE "ProductSearchMiss" ADD COLUMN     "region" TEXT;

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "returnId" TEXT;

-- AlterTable
ALTER TABLE "ReturnItem" ADD COLUMN     "description" TEXT,
ADD COLUMN     "qcNotes" TEXT,
ADD COLUMN     "qcStatus" "ItemCondition",
ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "ReturnRequest" DROP COLUMN "deliveredAt",
DROP COLUMN "replacementOrderId",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ReturnSettlement" DROP COLUMN "status",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "penaltyReason" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "costBearer",
ADD COLUMN     "costBearer" "CostBearer" NOT NULL DEFAULT 'PLATFORM',
ALTER COLUMN "penaltyAmount" SET NOT NULL,
ALTER COLUMN "penaltyAmount" SET DEFAULT 0,
ALTER COLUMN "penaltyAmount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "ReturnTimeline" ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "SearchTrending" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "region" TEXT DEFAULT 'global',
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchTrending_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchTrending_region_count_idx" ON "SearchTrending"("region", "count");

-- CreateIndex
CREATE INDEX "SearchTrending_lastSeen_idx" ON "SearchTrending"("lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "SearchTrending_query_region_key" ON "SearchTrending"("query", "region");

-- CreateIndex
CREATE INDEX "CoinLedger_expiresAt_idx" ON "CoinLedger"("expiresAt");

-- CreateIndex
CREATE INDEX "ProductSearchMiss_region_idx" ON "ProductSearchMiss"("region");

-- CreateIndex
CREATE INDEX "ReturnItem_returnId_idx" ON "ReturnItem"("returnId");

-- CreateIndex
CREATE INDEX "ReturnItem_productId_idx" ON "ReturnItem"("productId");

-- CreateIndex
CREATE INDEX "ReturnRequest_vendorId_idx" ON "ReturnRequest"("vendorId");

-- CreateIndex
CREATE INDEX "ReturnRequest_returnNumber_idx" ON "ReturnRequest"("returnNumber");

-- CreateIndex
CREATE INDEX "ReturnTimeline_returnId_idx" ON "ReturnTimeline"("returnId");

-- CreateIndex
CREATE INDEX "ReturnTimeline_timestamp_idx" ON "ReturnTimeline"("timestamp");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "GiftSKU"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "ReturnRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

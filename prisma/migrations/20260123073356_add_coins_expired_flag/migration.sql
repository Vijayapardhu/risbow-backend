/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ProductSearchMiss` table. All the data in the column will be lost.
  - Added the required column `normalizedQuery` to the `ProductSearchMiss` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "BowActionType" ADD VALUE 'CLIENT_CONTROL';

-- DropIndex
DROP INDEX "ProductSearchMiss_createdAt_idx";

-- DropIndex
DROP INDEX "ProductSearchMiss_query_unique";

-- AlterTable
ALTER TABLE "BowInteraction" ADD COLUMN     "conversionEvent" TEXT,
ADD COLUMN     "conversionValue" INTEGER;

-- AlterTable
ALTER TABLE "CoinLedger" ADD COLUMN     "isExpired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "categoryIds" TEXT[],
ADD COLUMN     "minQuantity" INTEGER,
ADD COLUMN     "productIds" TEXT[],
ADD COLUMN     "vendorId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "popularityScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductSearchMiss" DROP COLUMN "createdAt",
ADD COLUMN     "firstSearchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "inferredCategoryId" TEXT,
ADD COLUMN     "keywords" TEXT[],
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "normalizedQuery" TEXT NOT NULL,
ADD COLUMN     "resolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolvedProductId" TEXT,
ALTER COLUMN "lastSearchedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "CartInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cartValue" INTEGER NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "categories" TEXT[],
    "cartPattern" TEXT NOT NULL,
    "hesitationScore" DOUBLE PRECISION NOT NULL,
    "abandonRisk" DOUBLE PRECISION NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "productIds" TEXT[],
    "accepted" BOOLEAN,
    "cartValueBefore" INTEGER NOT NULL,
    "cartValueAfter" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CartInsight_userId_idx" ON "CartInsight"("userId");

-- CreateIndex
CREATE INDEX "CartInsight_cartPattern_idx" ON "CartInsight"("cartPattern");

-- CreateIndex
CREATE INDEX "CartInsight_detectedAt_idx" ON "CartInsight"("detectedAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_strategy_idx" ON "RecommendationEvent"("strategy");

-- CreateIndex
CREATE INDEX "RecommendationEvent_accepted_idx" ON "RecommendationEvent"("accepted");

-- CreateIndex
CREATE INDEX "CoinLedger_isExpired_idx" ON "CoinLedger"("isExpired");

-- CreateIndex
CREATE INDEX "Coupon_vendorId_idx" ON "Coupon"("vendorId");

-- CreateIndex
CREATE INDEX "Coupon_isActive_idx" ON "Coupon"("isActive");

-- CreateIndex
CREATE INDEX "ProductSearchMiss_normalizedQuery_idx" ON "ProductSearchMiss"("normalizedQuery");

-- CreateIndex
CREATE INDEX "ProductSearchMiss_count_idx" ON "ProductSearchMiss"("count");

-- CreateIndex
CREATE INDEX "ProductSearchMiss_resolved_idx" ON "ProductSearchMiss"("resolved");

-- CreateIndex
CREATE INDEX "ProductSearchMiss_lastSearchedAt_idx" ON "ProductSearchMiss"("lastSearchedAt");

-- AddForeignKey
ALTER TABLE "ProductSearchMiss" ADD CONSTRAINT "ProductSearchMiss_inferredCategoryId_fkey" FOREIGN KEY ("inferredCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartInsight" ADD CONSTRAINT "CartInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

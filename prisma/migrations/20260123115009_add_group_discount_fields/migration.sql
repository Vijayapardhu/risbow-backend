/*
  Warnings:

  - You are about to drop the column `detectedAt` on the `CartInsight` table. All the data in the column will be lost.
  - Added the required column `severity` to the `CartInsight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `CartInsight` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CartInsightType" AS ENUM ('HESITATION', 'THRESHOLD_NEAR', 'BUNDLE_OPPORTUNITY', 'PRICE_SENSITIVITY', 'REPEAT_REMOVAL', 'GIFT_ELIGIBLE');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('GOAL_BASED', 'LINEAR_DISCOUNT');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'PLACED', 'SETTLED_WIN', 'SETTLED_LOSE', 'CANCELLED', 'VOIDED');

-- CreateEnum
CREATE TYPE "BetType" AS ENUM ('SINGLE', 'MULTIPLE', 'SYSTEM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BowActionType" ADD VALUE 'SUGGEST_BUNDLE';
ALTER TYPE "BowActionType" ADD VALUE 'SUGGEST_GIFT';
ALTER TYPE "BowActionType" ADD VALUE 'SUGGEST_UPSELL';
ALTER TYPE "BowActionType" ADD VALUE 'REMOVE_SUGGESTION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoomStatus" ADD VALUE 'OPEN';
ALTER TYPE "RoomStatus" ADD VALUE 'COMPLETED';

-- DropIndex
DROP INDEX "CartInsight_detectedAt_idx";

-- AlterTable
ALTER TABLE "CartInsight" DROP COLUMN "detectedAt",
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "severity" "InsightSeverity" NOT NULL,
ADD COLUMN     "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "type" "CartInsightType" NOT NULL;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "maxDiscount" DOUBLE PRECISION,
ADD COLUMN     "maxMembers" INTEGER,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "type" "RoomType" NOT NULL DEFAULT 'GOAL_BASED';

-- CreateTable
CREATE TABLE "BowActionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" "BowActionType" NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "quantity" INTEGER,
    "price" INTEGER,
    "reason" TEXT NOT NULL,
    "guardrailCheck" JSONB,
    "autoReversed" BOOLEAN NOT NULL DEFAULT false,
    "reverseReason" TEXT,
    "attributedRevenue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),

    CONSTRAINT "BowActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferenceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredCategories" TEXT[],
    "preferredBrands" TEXT[],
    "sizePreferences" TEXT[],
    "priceSensitivity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "colorAffinity" TEXT[],
    "styleTags" TEXT[],
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.1,

    CONSTRAINT "UserPreferenceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "type" "BetType" NOT NULL DEFAULT 'SINGLE',
    "selections" JSONB NOT NULL,
    "stake" INTEGER NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "potentialWin" INTEGER NOT NULL,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "result" TEXT,
    "payout" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "betId" TEXT,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BowActionLog_userId_idx" ON "BowActionLog"("userId");

-- CreateIndex
CREATE INDEX "BowActionLog_actionType_idx" ON "BowActionLog"("actionType");

-- CreateIndex
CREATE INDEX "BowActionLog_productId_idx" ON "BowActionLog"("productId");

-- CreateIndex
CREATE INDEX "BowActionLog_createdAt_idx" ON "BowActionLog"("createdAt");

-- CreateIndex
CREATE INDEX "BowActionLog_autoReversed_idx" ON "BowActionLog"("autoReversed");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferenceProfile_userId_key" ON "UserPreferenceProfile"("userId");

-- CreateIndex
CREATE INDEX "UserPreferenceProfile_userId_idx" ON "UserPreferenceProfile"("userId");

-- CreateIndex
CREATE INDEX "UserPreferenceProfile_priceSensitivity_idx" ON "UserPreferenceProfile"("priceSensitivity");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Bet_idempotencyKey_key" ON "Bet"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Bet_userId_idx" ON "Bet"("userId");

-- CreateIndex
CREATE INDEX "Bet_status_idx" ON "Bet"("status");

-- CreateIndex
CREATE INDEX "Bet_idempotencyKey_idx" ON "Bet"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");

-- CreateIndex
CREATE INDEX "LedgerEntry_walletId_idx" ON "LedgerEntry"("walletId");

-- CreateIndex
CREATE INDEX "LedgerEntry_betId_idx" ON "LedgerEntry"("betId");

-- CreateIndex
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");

-- CreateIndex
CREATE INDEX "CartInsight_triggeredAt_idx" ON "CartInsight"("triggeredAt");

-- CreateIndex
CREATE INDEX "CartInsight_type_idx" ON "CartInsight"("type");

-- CreateIndex
CREATE INDEX "CartInsight_severity_idx" ON "CartInsight"("severity");

-- CreateIndex
CREATE INDEX "Room_productId_idx" ON "Room"("productId");

-- AddForeignKey
ALTER TABLE "BowActionLog" ADD CONSTRAINT "BowActionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BowActionLog" ADD CONSTRAINT "BowActionLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferenceProfile" ADD CONSTRAINT "UserPreferenceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

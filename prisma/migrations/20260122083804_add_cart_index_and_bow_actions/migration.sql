-- CreateEnum
CREATE TYPE "BowActionType" AS ENUM ('ADD_TO_CART', 'REMOVE_FROM_CART', 'UPDATE_QUANTITY', 'APPLY_COUPON', 'SELECT_GIFT', 'NAVIGATE', 'VIEW_CART', 'GET_RECOMMENDATIONS');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('ACTIVE', 'REPORTED', 'HIDDEN', 'DELETED', 'PENDING', 'APPROVED', 'REJECTED');

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

-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('FREE', 'BASIC', 'PRO', 'PREMIUM', 'ELITE');

-- CreateEnum
CREATE TYPE "PayoutCycle" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'INSTANT');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('BANNER', 'ROOM_PACKAGE', 'FEATURED');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('CHAT', 'VOICE', 'RECOMMENDATION', 'ACTION');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'CREATED';
ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "OrderStatus" ADD VALUE 'PAID';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReturnStatus" ADD VALUE 'RETURN_REQUESTED';
ALTER TYPE "ReturnStatus" ADD VALUE 'REPLACEMENT_SHIPPED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "discountAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "giftId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "freeListingExpiresAt" TIMESTAMP(3),
ADD COLUMN     "visibility" "ProductVisibility" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "ReturnRequest" ADD COLUMN     "replacementTrackingId" TEXT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "helpfulCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "bankDetails" JSONB,
ADD COLUMN     "lastPayoutDate" TIMESTAMP(3),
ADD COLUMN     "pendingEarnings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "pickupEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pickupTimings" JSONB,
ADD COLUMN     "storeBanner" TEXT,
ADD COLUMN     "storeLogo" TEXT,
ADD COLUMN     "storeName" TEXT,
ADD COLUMN     "storeTimings" JSONB;

-- CreateTable
CREATE TABLE "BowInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "query" TEXT,
    "response" TEXT,
    "intent" TEXT,
    "confidence" DOUBLE PRECISION,
    "actionType" "BowActionType",
    "actionPayload" JSONB,
    "metadata" JSONB,
    "context" JSONB,
    "sentiment" TEXT,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BowInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralTracking" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "coinsAwarded" INTEGER NOT NULL DEFAULT 0,
    "firstOrderId" TEXT,
    "deviceFingerprint" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ReferralTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorFollower" (
    "vendorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorFollower_pkey" PRIMARY KEY ("vendorId","userId")
);

-- CreateTable
CREATE TABLE "VendorMembership" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "tier" "MembershipTier" NOT NULL DEFAULT 'FREE',
    "price" INTEGER NOT NULL DEFAULT 0,
    "skuLimit" INTEGER NOT NULL DEFAULT 10,
    "imageLimit" INTEGER NOT NULL DEFAULT 3,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "payoutCycle" "PayoutCycle" NOT NULL DEFAULT 'MONTHLY',
    "features" JSONB,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPayout" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "bankDetails" JSONB NOT NULL,
    "transactionId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPromotion" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "type" "PromotionType" NOT NULL,
    "packageType" TEXT,
    "productIds" TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "coinsCost" INTEGER NOT NULL DEFAULT 0,
    "moneyCost" INTEGER,
    "status" "PromotionStatus" NOT NULL DEFAULT 'ACTIVE',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BowInteraction_escalated_idx" ON "BowInteraction"("escalated");

-- CreateIndex
CREATE INDEX "BowInteraction_sessionId_idx" ON "BowInteraction"("sessionId");

-- CreateIndex
CREATE INDEX "BowInteraction_userId_idx" ON "BowInteraction"("userId");

-- CreateIndex
CREATE INDEX "ReferralTracking_refereeId_idx" ON "ReferralTracking"("refereeId");

-- CreateIndex
CREATE INDEX "ReferralTracking_referralCode_idx" ON "ReferralTracking"("referralCode");

-- CreateIndex
CREATE INDEX "ReferralTracking_referrerId_idx" ON "ReferralTracking"("referrerId");

-- CreateIndex
CREATE INDEX "ReferralTracking_status_idx" ON "ReferralTracking"("status");

-- CreateIndex
CREATE INDEX "VendorFollower_userId_idx" ON "VendorFollower"("userId");

-- CreateIndex
CREATE INDEX "VendorFollower_vendorId_idx" ON "VendorFollower"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorMembership_vendorId_key" ON "VendorMembership"("vendorId");

-- CreateIndex
CREATE INDEX "VendorMembership_isActive_idx" ON "VendorMembership"("isActive");

-- CreateIndex
CREATE INDEX "VendorMembership_tier_idx" ON "VendorMembership"("tier");

-- CreateIndex
CREATE INDEX "VendorMembership_vendorId_idx" ON "VendorMembership"("vendorId");

-- CreateIndex
CREATE INDEX "VendorPayout_createdAt_idx" ON "VendorPayout"("createdAt");

-- CreateIndex
CREATE INDEX "VendorPayout_status_idx" ON "VendorPayout"("status");

-- CreateIndex
CREATE INDEX "VendorPayout_vendorId_idx" ON "VendorPayout"("vendorId");

-- CreateIndex
CREATE INDEX "VendorPromotion_startDate_endDate_idx" ON "VendorPromotion"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "VendorPromotion_status_idx" ON "VendorPromotion"("status");

-- CreateIndex
CREATE INDEX "VendorPromotion_type_idx" ON "VendorPromotion"("type");

-- CreateIndex
CREATE INDEX "VendorPromotion_vendorId_idx" ON "VendorPromotion"("vendorId");

-- CreateIndex
CREATE INDEX "Cart_userId_idx" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "Product_price_idx" ON "Product"("price");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "Product_categoryId_isActive_price_idx" ON "Product"("categoryId", "isActive", "price");

-- CreateIndex
CREATE INDEX "Product_categoryId_isActive_createdAt_idx" ON "Product"("categoryId", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "Product_isActive_price_idx" ON "Product"("isActive", "price");

-- CreateIndex
CREATE INDEX "Product_isActive_createdAt_idx" ON "Product"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");

-- CreateIndex
CREATE INDEX "Review_vendorId_status_idx" ON "Review"("vendorId", "status");

-- AddForeignKey
ALTER TABLE "BowInteraction" ADD CONSTRAINT "BowInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralTracking" ADD CONSTRAINT "ReferralTracking_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralTracking" ADD CONSTRAINT "ReferralTracking_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorFollower" ADD CONSTRAINT "VendorFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorFollower" ADD CONSTRAINT "VendorFollower_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMembership" ADD CONSTRAINT "VendorMembership_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayout" ADD CONSTRAINT "VendorPayout_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPromotion" ADD CONSTRAINT "VendorPromotion_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

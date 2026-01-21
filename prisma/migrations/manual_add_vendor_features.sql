-- Add new enums
CREATE TYPE "MembershipTier" AS ENUM ('FREE', 'BASIC', 'PRO', 'PREMIUM', 'ELITE');
CREATE TYPE "PayoutCycle" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'INSTANT');
CREATE TYPE "PromotionType" AS ENUM ('BANNER', 'ROOM_PACKAGE', 'FEATURED');
CREATE TYPE "PromotionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "InteractionType" AS ENUM ('CHAT', 'VOICE', 'RECOMMENDATION');
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

-- Add new columns to Vendor table
ALTER TABLE "Vendor" ADD COLUMN "storeName" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "storeLogo" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "storeBanner" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "storeTimings" JSONB;
ALTER TABLE "Vendor" ADD COLUMN "pickupEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vendor" ADD COLUMN "pickupTimings" JSONB;
ALTER TABLE "Vendor" ADD COLUMN "lastPayoutDate" TIMESTAMP(3);
ALTER TABLE "Vendor" ADD COLUMN "pendingEarnings" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Vendor" ADD COLUMN "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- Add indexes to Vendor table
CREATE INDEX "Vendor_vendorCode_idx" ON "Vendor"("vendorCode");
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

-- Add new columns to Product table
ALTER TABLE "Product" ADD COLUMN "isFreeListingProduct" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "freeListingExpiresAt" TIMESTAMP(3);

-- Create VendorMembership table
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

CREATE UNIQUE INDEX "VendorMembership_vendorId_key" ON "VendorMembership"("vendorId");
CREATE INDEX "VendorMembership_vendorId_idx" ON "VendorMembership"("vendorId");
CREATE INDEX "VendorMembership_tier_idx" ON "VendorMembership"("tier");
CREATE INDEX "VendorMembership_isActive_idx" ON "VendorMembership"("isActive");

-- Create VendorPromotion table
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

CREATE INDEX "VendorPromotion_vendorId_idx" ON "VendorPromotion"("vendorId");
CREATE INDEX "VendorPromotion_type_idx" ON "VendorPromotion"("type");
CREATE INDEX "VendorPromotion_status_idx" ON "VendorPromotion"("status");
CREATE INDEX "VendorPromotion_startDate_endDate_idx" ON "VendorPromotion"("startDate", "endDate");

-- Create VendorFollower table
CREATE TABLE "VendorFollower" (
    "vendorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorFollower_pkey" PRIMARY KEY ("vendorId","userId")
);

CREATE INDEX "VendorFollower_vendorId_idx" ON "VendorFollower"("vendorId");
CREATE INDEX "VendorFollower_userId_idx" ON "VendorFollower"("userId");

-- Create VendorPayout table
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

CREATE INDEX "VendorPayout_vendorId_idx" ON "VendorPayout"("vendorId");
CREATE INDEX "VendorPayout_status_idx" ON "VendorPayout"("status");
CREATE INDEX "VendorPayout_createdAt_idx" ON "VendorPayout"("createdAt");

-- Create BowInteraction table
CREATE TABLE "BowInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "query" TEXT,
    "response" TEXT,
    "context" JSONB,
    "sentiment" TEXT,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BowInteraction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BowInteraction_userId_idx" ON "BowInteraction"("userId");
CREATE INDEX "BowInteraction_sessionId_idx" ON "BowInteraction"("sessionId");
CREATE INDEX "BowInteraction_escalated_idx" ON "BowInteraction"("escalated");

-- Create ReferralTracking table
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

CREATE INDEX "ReferralTracking_referrerId_idx" ON "ReferralTracking"("referrerId");
CREATE INDEX "ReferralTracking_refereeId_idx" ON "ReferralTracking"("refereeId");
CREATE INDEX "ReferralTracking_referralCode_idx" ON "ReferralTracking"("referralCode");
CREATE INDEX "ReferralTracking_status_idx" ON "ReferralTracking"("status");

-- Add foreign key constraints
ALTER TABLE "VendorMembership" ADD CONSTRAINT "VendorMembership_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorPromotion" ADD CONSTRAINT "VendorPromotion_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorFollower" ADD CONSTRAINT "VendorFollower_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorFollower" ADD CONSTRAINT "VendorFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorPayout" ADD CONSTRAINT "VendorPayout_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BowInteraction" ADD CONSTRAINT "BowInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralTracking" ADD CONSTRAINT "ReferralTracking_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralTracking" ADD CONSTRAINT "ReferralTracking_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

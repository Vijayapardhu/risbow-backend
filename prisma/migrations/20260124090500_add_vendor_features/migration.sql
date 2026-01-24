-- Converted from manual_add_vendor_features.sql

-- Add new enums (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MembershipTier') THEN
    CREATE TYPE "MembershipTier" AS ENUM ('FREE', 'BASIC', 'PRO', 'PREMIUM', 'ELITE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayoutCycle') THEN
    CREATE TYPE "PayoutCycle" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'INSTANT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PromotionType') THEN
    CREATE TYPE "PromotionType" AS ENUM ('BANNER', 'ROOM_PACKAGE', 'FEATURED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PromotionStatus') THEN
    CREATE TYPE "PromotionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayoutStatus') THEN
    CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InteractionType') THEN
    CREATE TYPE "InteractionType" AS ENUM ('CHAT', 'VOICE', 'RECOMMENDATION');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReferralStatus') THEN
    CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

-- Add new columns to Vendor table
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "storeName" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "storeLogo" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "storeBanner" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "storeTimings" JSONB;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "pickupEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "pickupTimings" JSONB;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "lastPayoutDate" TIMESTAMP(3);
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "pendingEarnings" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- Add indexes to Vendor table
CREATE INDEX IF NOT EXISTS "Vendor_vendorCode_idx" ON "Vendor"("vendorCode");
-- Vendor table in this repo does not have a generic "status" column; guard this index for older schemas.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Vendor' AND column_name = 'status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Vendor_status_idx" ON "Vendor"("status")';
  END IF;
END$$;

-- Add new columns to Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isFreeListingProduct" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "freeListingExpiresAt" TIMESTAMP(3);

-- Create VendorMembership table
CREATE TABLE IF NOT EXISTS "VendorMembership" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "VendorMembership_vendorId_key" ON "VendorMembership"("vendorId");
CREATE INDEX IF NOT EXISTS "VendorMembership_vendorId_idx" ON "VendorMembership"("vendorId");
CREATE INDEX IF NOT EXISTS "VendorMembership_tier_idx" ON "VendorMembership"("tier");
CREATE INDEX IF NOT EXISTS "VendorMembership_isActive_idx" ON "VendorMembership"("isActive");

-- Create VendorPromotion table
CREATE TABLE IF NOT EXISTS "VendorPromotion" (
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

CREATE INDEX IF NOT EXISTS "VendorPromotion_vendorId_idx" ON "VendorPromotion"("vendorId");
CREATE INDEX IF NOT EXISTS "VendorPromotion_type_idx" ON "VendorPromotion"("type");
CREATE INDEX IF NOT EXISTS "VendorPromotion_status_idx" ON "VendorPromotion"("status");
CREATE INDEX IF NOT EXISTS "VendorPromotion_startDate_endDate_idx" ON "VendorPromotion"("startDate", "endDate");

-- Create VendorFollower table
CREATE TABLE IF NOT EXISTS "VendorFollower" (
    "vendorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorFollower_pkey" PRIMARY KEY ("vendorId","userId")
);

CREATE INDEX IF NOT EXISTS "VendorFollower_vendorId_idx" ON "VendorFollower"("vendorId");
CREATE INDEX IF NOT EXISTS "VendorFollower_userId_idx" ON "VendorFollower"("userId");

-- Create VendorPayout table
CREATE TABLE IF NOT EXISTS "VendorPayout" (
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

CREATE INDEX IF NOT EXISTS "VendorPayout_vendorId_idx" ON "VendorPayout"("vendorId");
CREATE INDEX IF NOT EXISTS "VendorPayout_status_idx" ON "VendorPayout"("status");
CREATE INDEX IF NOT EXISTS "VendorPayout_createdAt_idx" ON "VendorPayout"("createdAt");

-- Create BowInteraction table
CREATE TABLE IF NOT EXISTS "BowInteraction" (
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

CREATE INDEX IF NOT EXISTS "BowInteraction_userId_idx" ON "BowInteraction"("userId");
CREATE INDEX IF NOT EXISTS "BowInteraction_sessionId_idx" ON "BowInteraction"("sessionId");
CREATE INDEX IF NOT EXISTS "BowInteraction_escalated_idx" ON "BowInteraction"("escalated");

-- Create ReferralTracking table
CREATE TABLE IF NOT EXISTS "ReferralTracking" (
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

CREATE INDEX IF NOT EXISTS "ReferralTracking_referrerId_idx" ON "ReferralTracking"("referrerId");
CREATE INDEX IF NOT EXISTS "ReferralTracking_refereeId_idx" ON "ReferralTracking"("refereeId");
CREATE INDEX IF NOT EXISTS "ReferralTracking_referralCode_idx" ON "ReferralTracking"("referralCode");
CREATE INDEX IF NOT EXISTS "ReferralTracking_status_idx" ON "ReferralTracking"("status");

-- Add foreign key constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VendorMembership_vendorId_fkey') THEN
    ALTER TABLE "VendorMembership" ADD CONSTRAINT "VendorMembership_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VendorPromotion_vendorId_fkey') THEN
    ALTER TABLE "VendorPromotion" ADD CONSTRAINT "VendorPromotion_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VendorFollower_vendorId_fkey') THEN
    ALTER TABLE "VendorFollower" ADD CONSTRAINT "VendorFollower_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VendorFollower_userId_fkey') THEN
    ALTER TABLE "VendorFollower" ADD CONSTRAINT "VendorFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VendorPayout_vendorId_fkey') THEN
    ALTER TABLE "VendorPayout" ADD CONSTRAINT "VendorPayout_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BowInteraction_userId_fkey') THEN
    ALTER TABLE "BowInteraction" ADD CONSTRAINT "BowInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralTracking_referrerId_fkey') THEN
    ALTER TABLE "ReferralTracking" ADD CONSTRAINT "ReferralTracking_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralTracking_refereeId_fkey') THEN
    ALTER TABLE "ReferralTracking" ADD CONSTRAINT "ReferralTracking_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END$$;


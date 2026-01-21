-- Skip enum creation (already exists)
-- Create tables only

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
ALTER TABLE "VendorMembership" ADD CONSTRAINT "VendorMembership_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "VendorPromotion" ADD CONSTRAINT "VendorPromotion_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create VendorFollower table
CREATE TABLE IF NOT EXISTS "VendorFollower" (
    "vendorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VendorFollower_pkey" PRIMARY KEY ("vendorId","userId")
);

CREATE INDEX IF NOT EXISTS "VendorFollower_vendorId_idx" ON "VendorFollower"("vendorId");
CREATE INDEX IF NOT EXISTS "VendorFollower_userId_idx" ON "VendorFollower"("userId");
ALTER TABLE "VendorFollower" ADD CONSTRAINT "VendorFollower_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorFollower" ADD CONSTRAINT "VendorFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "VendorPayout" ADD CONSTRAINT "VendorPayout_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "BowInteraction" ADD CONSTRAINT "BowInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "ReferralTracking" ADD CONSTRAINT "ReferralTracking_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralTracking" ADD CONSTRAINT "ReferralTracking_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

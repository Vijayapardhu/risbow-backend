-- SQL Script for Recent Risbow Admin Features
-- Generated based on current Prisma Schema

-- 1. CATEGORIES (Hierarchy & Images)
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "image" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "nameTE" TEXT;

-- 2. PRODUCTS (Moderation & Wholesale)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isWholesale" BOOLEAN DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "wholesalePrice" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "moq" INTEGER DEFAULT 1;

-- 3. VENDORS (Commission & Verification)
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "isGstVerified" BOOLEAN DEFAULT false;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "kycDocuments" JSONB;

-- 4. COUPONS (New Table)
CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "minOrderAmount" INTEGER DEFAULT 0,
    "maxDiscount" INTEGER,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");

-- 5. ADMIN & AUDIT LOGS (Security)
CREATE TABLE IF NOT EXISTS "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_email_key" ON "Admin"("email");

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. PLATFORM CONFIG (Settings)
CREATE TABLE IF NOT EXISTS "PlatformConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformConfig_key_key" ON "PlatformConfig"("key");

-- 7. NOTIFICATIONS & BANNERS (Marketing)
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "targetAudience" TEXT;

CREATE TABLE IF NOT EXISTS "Banner" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "redirectUrl" TEXT,
    "slotType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

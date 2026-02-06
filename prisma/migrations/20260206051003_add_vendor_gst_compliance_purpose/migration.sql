/*
  Warnings:

  - The values [COINS] on the enum `RefundMethod` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isFreeListingProduct` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `variants` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `adminNotes` on the `Refund` table. All the data in the column will be lost.
  - You are about to drop the column `processedById` on the `Refund` table. All the data in the column will be lost.
  - You are about to drop the column `refundMethod` on the `Refund` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Refund` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `strikes` on the `Vendor` table. All the data in the column will be lost.
  - The `storeStatus` column on the `Vendor` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `IdempotencyRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrderTimeline` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[orderNumber]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[category,key]` on the table `PlatformConfig` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[refundNumber]` on the table `Refund` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `PlatformConfig` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedById` to the `PlatformConfig` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `value` on the `PlatformConfig` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `refundNumber` to the `Refund` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'CONTENT_MODERATOR', 'ANALYTICS_VIEWER');

-- CreateEnum
CREATE TYPE "BannerCampaignStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PAYMENT_RECEIVED', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'REJECTED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "BannerType" AS ENUM ('HOMEPAGE_HERO', 'CATEGORY_SPOTLIGHT', 'SEARCH_RESULT', 'STORY_PROMOTION', 'WEEKLY_STANDARD', 'MONTHLY_PREMIUM');

-- CreateEnum
CREATE TYPE "ContentFlagType" AS ENUM ('STORY', 'REEL', 'PRODUCT_IMAGE', 'REVIEW', 'VENDOR_PROFILE', 'PRODUCT', 'BANNER');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'ASSIGNED', 'ACCEPTED', 'PICKING_UP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisciplineStatus" AS ENUM ('GOOD_STANDING', 'WARNING', 'PROBATION', 'SUSPENDED', 'FINAL_WARNING', 'BLOCKED', 'ACTIVE', 'BANNED', 'LIFTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AADHAAR', 'PAN', 'LICENSE', 'RC_BOOK', 'INSURANCE');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('PENDING', 'DOCUMENTS_SUBMITTED', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('TELECALLER', 'SUPPORT_AGENT', 'CONTENT_MODERATOR', 'WAREHOUSE_STAFF', 'FINANCE_STAFF', 'OPERATIONS_MANAGER');

-- CreateEnum
CREATE TYPE "FlagPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FlagReason" AS ENUM ('NUDITY', 'VIOLENCE', 'HATE_SPEECH', 'COUNTERFEIT', 'PROHIBITED_ITEM', 'MISLEADING', 'SPAM', 'COPYRIGHT', 'TRADEMARK', 'HARASSMENT', 'MISINFORMATION', 'OTHER', 'INAPPROPRIATE', 'PROHIBITED', 'OFFENSIVE', 'LOW_QUALITY', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('BANNER_CAMPAIGN', 'SUBSCRIPTION', 'COMMISSION', 'REFUND', 'ORDER');

-- CreateEnum
CREATE TYPE "MenuLocation" AS ENUM ('HEADER', 'FOOTER', 'MOBILE_NAV', 'SIDEBAR');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('CUSTOMER', 'VENDOR', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('APPROVED', 'REMOVED', 'REMOVED_WITH_WARNING', 'REMOVED_WITH_STRIKE', 'ESCALATED', 'APPROVE', 'REMOVE', 'HIDE', 'EDIT', 'WARN');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'SETTLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "StrikeResolution" AS ENUM ('REMOVED', 'UPHELD', 'REDUCED', 'APPEALED', 'DECAYED', 'OVERTURNED');

-- CreateEnum
CREATE TYPE "StrikeType" AS ENUM ('FAILED_DELIVERY', 'SHOP_CLOSED', 'LATE_PREPARATION', 'CUSTOMER_COMPLAINT', 'QUALITY_ISSUE', 'REPEATED_CANCELLATION', 'POLICY_VIOLATION', 'CONTENT_VIOLATION', 'WARNING', 'PRODUCT_VIOLATION', 'DELIVERY_FAILURE', 'FRAUD', 'REPEATED_OFFENSE');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('ORDER_ISSUE', 'PAYMENT_ISSUE', 'RETURN_REFUND', 'PRODUCT_INQUIRY', 'DELIVERY_ISSUE', 'VENDOR_COMPLAINT', 'TECHNICAL_ISSUE', 'ACCOUNT_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_VENDOR', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('BIKE', 'SCOOTER', 'CAR', 'VAN', 'TRUCK');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('FLASH_SALE', 'DISCOUNT', 'BUNDLE', 'SEASONAL');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "UserInteractionType" AS ENUM ('VIEW', 'ADD_TO_CART', 'PURCHASE', 'WISHLIST', 'REMOVE_FROM_CART');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'OUT_FOR_INSPECTION';
ALTER TYPE "OrderStatus" ADD VALUE 'RETURN_REQUESTED';
ALTER TYPE "OrderStatus" ADD VALUE 'QC_IN_PROGRESS';
ALTER TYPE "OrderStatus" ADD VALUE 'RETURN_PICKED_UP';
ALTER TYPE "OrderStatus" ADD VALUE 'RETURN_RECEIVED';
ALTER TYPE "OrderStatus" ADD VALUE 'RETURNED';
ALTER TYPE "OrderStatus" ADD VALUE 'REFUNDED';

-- AlterEnum
ALTER TYPE "PaymentIntentPurpose" ADD VALUE 'VENDOR_GST_COMPLIANCE';

-- AlterEnum
BEGIN;
CREATE TYPE "RefundMethod_new" AS ENUM ('ORIGINAL_PAYMENT', 'WALLET', 'BANK_TRANSFER', 'UPI');
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Refund' AND column_name = 'refundMethod') THEN
        ALTER TABLE "Refund" ALTER COLUMN "refundMethod" DROP DEFAULT;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Refund' AND column_name = 'method') THEN
        ALTER TABLE "Refund" ALTER COLUMN "method" TYPE "RefundMethod_new" USING ("method"::text::"RefundMethod_new");
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Refund' AND column_name = 'refundMethod') THEN
        ALTER TABLE "Refund" ALTER COLUMN "refundMethod" TYPE "RefundMethod_new" USING ("refundMethod"::text::"RefundMethod_new");
    END IF;
END $$;
ALTER TYPE "RefundMethod" RENAME TO "RefundMethod_old";
ALTER TYPE "RefundMethod_new" RENAME TO "RefundMethod";
DROP TYPE "RefundMethod_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "CheckoutGroup" DROP CONSTRAINT "CheckoutGroup_userId_fkey";

-- DropForeignKey
ALTER TABLE "CoinValuation" DROP CONSTRAINT "CoinValuation_setByUserId_fkey";

-- DropForeignKey
ALTER TABLE "LocalPromotion" DROP CONSTRAINT "LocalPromotion_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "LocalPromotion" DROP CONSTRAINT "LocalPromotion_productId_fkey";

-- DropForeignKey
ALTER TABLE "LocalPromotion" DROP CONSTRAINT "LocalPromotion_setByUserId_fkey";

-- DropForeignKey
ALTER TABLE "LocalPromotion" DROP CONSTRAINT "LocalPromotion_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_checkoutGroupId_fkey";

-- DropForeignKey
ALTER TABLE "OrderDeliverySlotSnapshot" DROP CONSTRAINT "OrderDeliverySlotSnapshot_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OrderDeliverySlotSnapshot" DROP CONSTRAINT "OrderDeliverySlotSnapshot_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "OrderPackingProof" DROP CONSTRAINT "OrderPackingProof_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OrderPackingProof" DROP CONSTRAINT "OrderPackingProof_uploadedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "OrderPackingProof" DROP CONSTRAINT "OrderPackingProof_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "OrderTimeline" DROP CONSTRAINT "OrderTimeline_orderId_fkey";

-- DropForeignKey
ALTER TABLE "PickupPoint" DROP CONSTRAINT "PickupPoint_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralRewardGrant" DROP CONSTRAINT "ReferralRewardGrant_inviteeUserId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralRewardGrant" DROP CONSTRAINT "ReferralRewardGrant_inviterUserId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralRewardGrant" DROP CONSTRAINT "ReferralRewardGrant_orderId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralRewardGrant" DROP CONSTRAINT "ReferralRewardGrant_ruleId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralRewardRule" DROP CONSTRAINT "ReferralRewardRule_setByAdminId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_pickupPointId_fkey";

-- DropForeignKey
ALTER TABLE "UserProductEvent" DROP CONSTRAINT "UserProductEvent_productId_fkey";

-- DropForeignKey
ALTER TABLE "VendorDeliveryWindow" DROP CONSTRAINT "VendorDeliveryWindow_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "VendorServiceArea" DROP CONSTRAINT "VendorServiceArea_vendorId_fkey";

-- DropIndex
DROP INDEX "Order_userId_status_createdAt_idx";

-- DropIndex
DROP INDEX "PlatformConfig_key_key";

-- DropIndex
DROP INDEX "Product_vendorId_isActive_stock_idx";

-- DropIndex
DROP INDEX "Vendor_vendorCode_idx";

-- AlterTable
ALTER TABLE "AbandonedCheckout" ADD COLUMN     "abandonReason" TEXT,
ADD COLUMN     "lastErrorCode" TEXT,
ADD COLUMN     "paymentMethod" TEXT;

-- AlterTable
ALTER TABLE "Address" ALTER COLUMN "geoUpdatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "name" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Banner" ADD COLUMN     "bannerCampaignId" TEXT;

-- AlterTable
ALTER TABLE "CheckoutGroup" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LocalPromotion" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "effectiveFrom" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "effectiveTo" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "isThirdPartyDelivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "obdFailedAt" TIMESTAMP(3),
ADD COLUMN     "obdNotes" TEXT,
ADD COLUMN     "obdOtp" TEXT,
ADD COLUMN     "obdVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "orderNumber" TEXT,
ADD COLUMN     "trackingId" TEXT;

-- AlterTable
ALTER TABLE "OrderDeliverySlotSnapshot" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "slotStartAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "slotEndAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderPackingProof" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PickupPoint" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PincodeGeo" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PlatformConfig" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedById" TEXT NOT NULL,
DROP COLUMN "value",
ADD COLUMN     "value" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "isFreeListingProduct",
DROP COLUMN "variants",
ADD COLUMN     "embedding" JSONB,
ADD COLUMN     "hasVariants" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "ReferralRewardGrant" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ReferralRewardRule" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "effectiveFrom" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "effectiveTo" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Refund" DROP COLUMN IF EXISTS "adminNotes",
DROP COLUMN IF EXISTS "processedById",
DROP COLUMN IF EXISTS "refundMethod",
ADD COLUMN IF NOT EXISTS "metadata" JSONB,
ADD COLUMN IF NOT EXISTS "method" "RefundMethod" NOT NULL DEFAULT 'ORIGINAL_PAYMENT',
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "processedBy" TEXT,
ADD COLUMN IF NOT EXISTS "refundNumber" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Shipment" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "metadata" JSONB DEFAULT '{}',
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN IF EXISTS "strikes",
ADD COLUMN IF NOT EXISTS "commissionOverride" DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "pincode" TEXT,
ALTER COLUMN "storeClosedUntil" SET DATA TYPE TIMESTAMP(3);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Vendor' AND column_name = 'storeStatus') THEN
        ALTER TABLE "Vendor" ALTER COLUMN "storeStatus" SET DEFAULT 'ACTIVE';
    END IF;
END $$;

-- AlterTable
ALTER TABLE "VendorDeliveryWindow" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VendorServiceArea" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "IdempotencyRecord";

-- DropTable
DROP TABLE "OrderTimeline";

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'OPERATIONS_ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isMfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "backupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avatar" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAction" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "resourceType" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "offerPrice" INTEGER,
    "subtotal" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BannerPricing" (
    "id" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "pricePerDay" INTEGER NOT NULL,
    "minDuration" INTEGER NOT NULL DEFAULT 1,
    "maxDuration" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BannerPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BannerMetric" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "clickThroughRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "returnOnAdSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BannerMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BannerCampaign" (
    "id" TEXT NOT NULL,
    "bannerId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "campaignType" TEXT NOT NULL,
    "position" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "targetAudience" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "amountPaid" INTEGER NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BannerCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BannerImpressionLedger" (
    "id" TEXT NOT NULL,
    "bannerId" TEXT NOT NULL,
    "userId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clickedAt" TIMESTAMP(3),

    CONSTRAINT "BannerImpressionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "categoryId" TEXT,
    "authorId" TEXT NOT NULL,
    "tags" TEXT[],
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "readTime" INTEGER,
    "seoTitle" TEXT,
    "seoDesc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyLater" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "targetPrice" INTEGER NOT NULL,
    "currentPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isNotified" BOOLEAN NOT NULL DEFAULT false,
    "isAddedToCart" BOOLEAN NOT NULL DEFAULT false,
    "priceDropPercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyLater_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CMSMenu" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" "MenuLocation" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CMSMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CMSMenuItem" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "target" TEXT NOT NULL DEFAULT '_self',
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CMSMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CMSPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "metaTitle" TEXT,
    "metaDesc" TEXT,
    "featuredImage" TEXT,
    "template" TEXT NOT NULL DEFAULT 'default',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CMSPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryCommission" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClearanceProduct" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "clearancePrice" INTEGER NOT NULL,
    "originalPrice" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClearanceProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentModeration" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "flaggedBy" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentModeration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentFlag" (
    "id" TEXT NOT NULL,
    "contentType" "ContentFlagType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "vendorId" TEXT,
    "reason" "FlagReason" NOT NULL,
    "description" TEXT,
    "priority" "FlagPriority" NOT NULL DEFAULT 'LOW',
    "status" "FlagStatus" NOT NULL DEFAULT 'PENDING',
    "reportedBy" TEXT,
    "isAutoFlagged" BOOLEAN NOT NULL DEFAULT false,
    "reportCount" INTEGER NOT NULL DEFAULT 1,
    "action" "ModerationAction",
    "moderationNotes" TEXT,
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "profileImageUrl" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "deliveryNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "driverId" TEXT,
    "pickupAddress" JSONB NOT NULL,
    "deliveryAddress" JSONB NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "distance" DOUBLE PRECISION,
    "estimatedTime" INTEGER,
    "actualTime" INTEGER,
    "pickupOtp" TEXT,
    "deliveryOtp" TEXT,
    "pickedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "proofImage" TEXT,
    "notes" TEXT,
    "rating" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "avatar" TEXT,
    "vehicleType" "VehicleType" NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseExpiry" TIMESTAMP(3) NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'PENDING',
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "currentLocation" JSONB,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverDocument" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "EmployeeRole" NOT NULL,
    "department" TEXT,
    "permissions" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 10,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "targetAudience" JSONB NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalOpened" INTEGER NOT NULL DEFAULT 0,
    "totalClicked" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "action" TEXT,
    "data" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnQCChecklist" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "returnId" TEXT,
    "vendorId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "isBrandBoxIntact" BOOLEAN NOT NULL DEFAULT true,
    "isProductIntact" BOOLEAN NOT NULL DEFAULT true,
    "missingAccessories" TEXT[],
    "images" TEXT[],
    "videoPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PASSED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnQCChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderFinancialSnapshot" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL,
    "shippingAmount" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL,
    "giftCost" INTEGER NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "vendorEarnings" INTEGER NOT NULL,
    "platformEarnings" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderFinancialSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderSettlement" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "eligibleAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT,
    "attributes" JSONB NOT NULL,
    "price" INTEGER,
    "offerPrice" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "VariationStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reel" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT,
    "creatorId" TEXT,
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "productId" TEXT,
    "description" TEXT,
    "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReelInteractionLedger" (
    "id" TEXT NOT NULL,
    "reelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interactionType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReelInteractionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplacementOrder" (
    "id" TEXT NOT NULL,
    "originalOrderId" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "newOrderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplacementOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchClick" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "reference" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "orderId" TEXT,
    "productId" TEXT,
    "vendorId" TEXT,
    "attachments" TEXT[],
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelecallerPerformance" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "assigned" INTEGER NOT NULL DEFAULT 0,
    "contacted" INTEGER NOT NULL DEFAULT 0,
    "converted" INTEGER NOT NULL DEFAULT 0,
    "dropped" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TelecallerPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "MessageSender" NOT NULL,
    "senderName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" TEXT[],
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TicketCategory",
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBowCoinLedger" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "coinsDelta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorBowCoinLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDisciplineEvent" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "orderId" TEXT,
    "reason" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorDisciplineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDisciplineState" (
    "vendorId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "activeStrikes" INTEGER NOT NULL DEFAULT 0,
    "consecutiveSuccesses" INTEGER NOT NULL DEFAULT 0,
    "lastStateChange" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDisciplineState_pkey" PRIMARY KEY ("vendorId")
);

-- CreateTable
CREATE TABLE "VendorStrike" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "type" "StrikeType" NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "orderId" TEXT,
    "productId" TEXT,
    "issuedBy" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "points" INTEGER NOT NULL DEFAULT 1,
    "resolution" "StrikeResolution",
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "appealedAt" TIMESTAMP(3),
    "appealReason" TEXT,
    "appealEvidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorStrike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDiscipline" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" "DisciplineStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "appliedBy" TEXT NOT NULL,
    "liftedBy" TEXT,
    "liftReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDiscipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDocument" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "VendorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CampaignType" NOT NULL DEFAULT 'FLASH_SALE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" INTEGER NOT NULL,
    "maxDiscount" INTEGER,
    "minOrderValue" INTEGER,
    "limitedStock" BOOLEAN NOT NULL DEFAULT false,
    "totalStock" INTEGER,
    "usedStock" INTEGER NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'SCHEDULED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "targetAudience" TEXT,
    "bannerImage" TEXT,
    "termsConditions" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignProduct" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customDiscount" INTEGER,
    "stockAllocated" INTEGER,
    "stockUsed" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProductInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "interactionType" "UserInteractionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "UserProductInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSimilarity" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "similarProductId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "algorithm" TEXT NOT NULL DEFAULT 'content_based',

    CONSTRAINT "ProductSimilarity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceTemplate" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "companyName" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "taxFields" JSONB,
    "headerText" TEXT,
    "footerText" TEXT,
    "showQrCode" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceCustomField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldValue" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_email_idx" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_role_idx" ON "AdminUser"("role");

-- CreateIndex
CREATE INDEX "AdminUser_isActive_idx" ON "AdminUser"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_token_key" ON "AdminSession"("token");

-- CreateIndex
CREATE INDEX "AdminSession_adminUserId_idx" ON "AdminSession"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminSession_token_idx" ON "AdminSession"("token");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AdminAction_adminId_idx" ON "AdminAction"("adminId");

-- CreateIndex
CREATE INDEX "AdminAction_action_idx" ON "AdminAction"("action");

-- CreateIndex
CREATE INDEX "AdminAction_entity_idx" ON "AdminAction"("entity");

-- CreateIndex
CREATE INDEX "AdminAction_resourceType_idx" ON "AdminAction"("resourceType");

-- CreateIndex
CREATE INDEX "AdminAction_createdAt_idx" ON "AdminAction"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_vendorId_idx" ON "OrderItem"("vendorId");

-- CreateIndex
CREATE INDEX "OrderItem_status_idx" ON "OrderItem"("status");

-- CreateIndex
CREATE INDEX "CoinTransaction_userId_idx" ON "CoinTransaction"("userId");

-- CreateIndex
CREATE INDEX "CoinTransaction_type_idx" ON "CoinTransaction"("type");

-- CreateIndex
CREATE INDEX "CoinTransaction_createdAt_idx" ON "CoinTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "CoinTransaction_expiresAt_idx" ON "CoinTransaction"("expiresAt");

-- CreateIndex
CREATE INDEX "CoinTransaction_status_idx" ON "CoinTransaction"("status");

-- CreateIndex
CREATE INDEX "BannerPricing_position_idx" ON "BannerPricing"("position");

-- CreateIndex
CREATE INDEX "BannerPricing_isActive_idx" ON "BannerPricing"("isActive");

-- CreateIndex
CREATE INDEX "BannerMetric_campaignId_idx" ON "BannerMetric"("campaignId");

-- CreateIndex
CREATE INDEX "BannerMetric_date_idx" ON "BannerMetric"("date");

-- CreateIndex
CREATE INDEX "BannerCampaign_startDate_endDate_idx" ON "BannerCampaign"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "BannerCampaign_vendorId_idx" ON "BannerCampaign"("vendorId");

-- CreateIndex
CREATE INDEX "BannerCampaign_position_idx" ON "BannerCampaign"("position");

-- CreateIndex
CREATE INDEX "BannerCampaign_status_idx" ON "BannerCampaign"("status");

-- CreateIndex
CREATE INDEX "BannerImpressionLedger_bannerId_viewedAt_idx" ON "BannerImpressionLedger"("bannerId", "viewedAt");

-- CreateIndex
CREATE INDEX "BannerImpressionLedger_userId_viewedAt_idx" ON "BannerImpressionLedger"("userId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_slug_key" ON "BlogCategory"("slug");

-- CreateIndex
CREATE INDEX "BlogCategory_isActive_idx" ON "BlogCategory"("isActive");

-- CreateIndex
CREATE INDEX "BlogCategory_parentId_idx" ON "BlogCategory"("parentId");

-- CreateIndex
CREATE INDEX "BlogCategory_slug_idx" ON "BlogCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_authorId_idx" ON "BlogPost"("authorId");

-- CreateIndex
CREATE INDEX "BlogPost_categoryId_idx" ON "BlogPost"("categoryId");

-- CreateIndex
CREATE INDEX "BlogPost_isFeatured_idx" ON "BlogPost"("isFeatured");

-- CreateIndex
CREATE INDEX "BlogPost_publishedAt_idx" ON "BlogPost"("publishedAt");

-- CreateIndex
CREATE INDEX "BlogPost_slug_idx" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_status_idx" ON "BlogPost"("status");

-- CreateIndex
CREATE INDEX "BuyLater_createdAt_idx" ON "BuyLater"("createdAt");

-- CreateIndex
CREATE INDEX "BuyLater_isActive_idx" ON "BuyLater"("isActive");

-- CreateIndex
CREATE INDEX "BuyLater_isNotified_idx" ON "BuyLater"("isNotified");

-- CreateIndex
CREATE INDEX "BuyLater_productId_idx" ON "BuyLater"("productId");

-- CreateIndex
CREATE INDEX "BuyLater_userId_idx" ON "BuyLater"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CMSMenu_name_key" ON "CMSMenu"("name");

-- CreateIndex
CREATE INDEX "CMSMenu_isActive_idx" ON "CMSMenu"("isActive");

-- CreateIndex
CREATE INDEX "CMSMenu_location_idx" ON "CMSMenu"("location");

-- CreateIndex
CREATE INDEX "CMSMenuItem_menuId_idx" ON "CMSMenuItem"("menuId");

-- CreateIndex
CREATE INDEX "CMSMenuItem_parentId_idx" ON "CMSMenuItem"("parentId");

-- CreateIndex
CREATE INDEX "CMSMenuItem_sortOrder_idx" ON "CMSMenuItem"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CMSPage_slug_key" ON "CMSPage"("slug");

-- CreateIndex
CREATE INDEX "CMSPage_isActive_idx" ON "CMSPage"("isActive");

-- CreateIndex
CREATE INDEX "CMSPage_slug_idx" ON "CMSPage"("slug");

-- CreateIndex
CREATE INDEX "CMSPage_sortOrder_idx" ON "CMSPage"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryCommission_categoryId_key" ON "CategoryCommission"("categoryId");

-- CreateIndex
CREATE INDEX "ClearanceProduct_expiryDate_isActive_idx" ON "ClearanceProduct"("expiryDate", "isActive");

-- CreateIndex
CREATE INDEX "ClearanceProduct_vendorId_isActive_idx" ON "ClearanceProduct"("vendorId", "isActive");

-- CreateIndex
CREATE INDEX "ContentModeration_contentType_contentId_idx" ON "ContentModeration"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "ContentModeration_status_idx" ON "ContentModeration"("status");

-- CreateIndex
CREATE INDEX "ContentFlag_contentType_contentId_idx" ON "ContentFlag"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "ContentFlag_status_idx" ON "ContentFlag"("status");

-- CreateIndex
CREATE INDEX "ContentFlag_priority_idx" ON "ContentFlag"("priority");

-- CreateIndex
CREATE INDEX "ContentFlag_vendorId_idx" ON "ContentFlag"("vendorId");

-- CreateIndex
CREATE INDEX "ContentFlag_assignedTo_idx" ON "ContentFlag"("assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "CreatorProfile"("userId");

-- CreateIndex
CREATE INDEX "CreatorProfile_userId_idx" ON "CreatorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_deliveryNumber_key" ON "Delivery"("deliveryNumber");

-- CreateIndex
CREATE INDEX "Delivery_createdAt_idx" ON "Delivery"("createdAt");

-- CreateIndex
CREATE INDEX "Delivery_driverId_idx" ON "Delivery"("driverId");

-- CreateIndex
CREATE INDEX "Delivery_orderId_idx" ON "Delivery"("orderId");

-- CreateIndex
CREATE INDEX "Delivery_status_idx" ON "Delivery"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_driverId_key" ON "Driver"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_mobile_key" ON "Driver"("mobile");

-- CreateIndex
CREATE INDEX "Driver_isAvailable_idx" ON "Driver"("isAvailable");

-- CreateIndex
CREATE INDEX "Driver_isOnline_idx" ON "Driver"("isOnline");

-- CreateIndex
CREATE INDEX "Driver_status_idx" ON "Driver"("status");

-- CreateIndex
CREATE INDEX "DriverDocument_driverId_idx" ON "DriverDocument"("driverId");

-- CreateIndex
CREATE INDEX "DriverDocument_status_idx" ON "DriverDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_mobile_key" ON "Employee"("mobile");

-- CreateIndex
CREATE INDEX "Employee_department_idx" ON "Employee"("department");

-- CreateIndex
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");

-- CreateIndex
CREATE INDEX "Employee_role_idx" ON "Employee"("role");

-- CreateIndex
CREATE INDEX "Inventory_productId_idx" ON "Inventory"("productId");

-- CreateIndex
CREATE INDEX "Inventory_warehouseId_idx" ON "Inventory"("warehouseId");

-- CreateIndex
CREATE INDEX "NotificationCampaign_createdAt_idx" ON "NotificationCampaign"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationCampaign_scheduledAt_idx" ON "NotificationCampaign"("scheduledAt");

-- CreateIndex
CREATE INDEX "NotificationCampaign_status_idx" ON "NotificationCampaign"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_name_key" ON "NotificationTemplate"("name");

-- CreateIndex
CREATE INDEX "NotificationTemplate_isActive_idx" ON "NotificationTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnQCChecklist_orderId_key" ON "ReturnQCChecklist"("orderId");

-- CreateIndex
CREATE INDEX "ReturnQCChecklist_orderId_idx" ON "ReturnQCChecklist"("orderId");

-- CreateIndex
CREATE INDEX "ReturnQCChecklist_vendorId_idx" ON "ReturnQCChecklist"("vendorId");

-- CreateIndex
CREATE INDEX "ReturnQCChecklist_status_idx" ON "ReturnQCChecklist"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrderFinancialSnapshot_orderId_key" ON "OrderFinancialSnapshot"("orderId");

-- CreateIndex
CREATE INDEX "OrderFinancialSnapshot_orderId_idx" ON "OrderFinancialSnapshot"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderSettlement_orderId_key" ON "OrderSettlement"("orderId");

-- CreateIndex
CREATE INDEX "OrderSettlement_vendorId_status_idx" ON "OrderSettlement"("vendorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_stock_idx" ON "ProductVariant"("stock");

-- CreateIndex
CREATE INDEX "ProductVariant_isActive_idx" ON "ProductVariant"("isActive");

-- CreateIndex
CREATE INDEX "Reel_createdAt_idx" ON "Reel"("createdAt");

-- CreateIndex
CREATE INDEX "Reel_creatorId_idx" ON "Reel"("creatorId");

-- CreateIndex
CREATE INDEX "Reel_productId_idx" ON "Reel"("productId");

-- CreateIndex
CREATE INDEX "Reel_vendorId_idx" ON "Reel"("vendorId");

-- CreateIndex
CREATE INDEX "ReelInteractionLedger_reelId_interactionType_idx" ON "ReelInteractionLedger"("reelId", "interactionType");

-- CreateIndex
CREATE INDEX "ReelInteractionLedger_userId_createdAt_idx" ON "ReelInteractionLedger"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReelInteractionLedger_reelId_userId_interactionType_key" ON "ReelInteractionLedger"("reelId", "userId", "interactionType");

-- CreateIndex
CREATE UNIQUE INDEX "ReplacementOrder_returnId_key" ON "ReplacementOrder"("returnId");

-- CreateIndex
CREATE UNIQUE INDEX "ReplacementOrder_newOrderId_key" ON "ReplacementOrder"("newOrderId");

-- CreateIndex
CREATE INDEX "SearchClick_productId_idx" ON "SearchClick"("productId");

-- CreateIndex
CREATE INDEX "SearchClick_query_idx" ON "SearchClick"("query");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_inventoryId_idx" ON "StockMovement"("inventoryId");

-- CreateIndex
CREATE INDEX "Story_isActive_expiresAt_idx" ON "Story"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "Story_vendorId_expiresAt_idx" ON "Story"("vendorId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportTicket_assignedTo_idx" ON "SupportTicket"("assignedTo");

-- CreateIndex
CREATE INDEX "SupportTicket_category_idx" ON "SupportTicket"("category");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_orderId_idx" ON "SupportTicket"("orderId");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TelecallerPerformance_agentId_date_key" ON "TelecallerPerformance"("agentId", "date");

-- CreateIndex
CREATE INDEX "TicketMessage_createdAt_idx" ON "TicketMessage"("createdAt");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- CreateIndex
CREATE INDEX "TicketTemplate_category_idx" ON "TicketTemplate"("category");

-- CreateIndex
CREATE INDEX "TicketTemplate_isActive_idx" ON "TicketTemplate"("isActive");

-- CreateIndex
CREATE INDEX "VendorBowCoinLedger_sourceType_sourceId_idx" ON "VendorBowCoinLedger"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "VendorBowCoinLedger_vendorId_createdAt_idx" ON "VendorBowCoinLedger"("vendorId", "createdAt");

-- CreateIndex
CREATE INDEX "VendorDisciplineEvent_eventType_idx" ON "VendorDisciplineEvent"("eventType");

-- CreateIndex
CREATE INDEX "VendorDisciplineEvent_vendorId_createdAt_idx" ON "VendorDisciplineEvent"("vendorId", "createdAt");

-- CreateIndex
CREATE INDEX "VendorDisciplineState_state_idx" ON "VendorDisciplineState"("state");

-- CreateIndex
CREATE INDEX "VendorStrike_vendorId_idx" ON "VendorStrike"("vendorId");

-- CreateIndex
CREATE INDEX "VendorStrike_type_idx" ON "VendorStrike"("type");

-- CreateIndex
CREATE INDEX "VendorStrike_resolution_idx" ON "VendorStrike"("resolution");

-- CreateIndex
CREATE INDEX "VendorStrike_orderId_idx" ON "VendorStrike"("orderId");

-- CreateIndex
CREATE INDEX "VendorDiscipline_vendorId_idx" ON "VendorDiscipline"("vendorId");

-- CreateIndex
CREATE INDEX "VendorDiscipline_status_idx" ON "VendorDiscipline"("status");

-- CreateIndex
CREATE INDEX "VendorDocument_status_idx" ON "VendorDocument"("status");

-- CreateIndex
CREATE INDEX "VendorDocument_vendorId_status_idx" ON "VendorDocument"("vendorId", "status");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_startDate_endDate_idx" ON "Campaign"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Campaign_isActive_idx" ON "Campaign"("isActive");

-- CreateIndex
CREATE INDEX "Campaign_type_idx" ON "Campaign"("type");

-- CreateIndex
CREATE INDEX "Campaign_status_startDate_endDate_idx" ON "Campaign"("status", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "CampaignProduct_campaignId_idx" ON "CampaignProduct"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignProduct_productId_idx" ON "CampaignProduct"("productId");

-- CreateIndex
CREATE INDEX "CampaignProduct_isActive_idx" ON "CampaignProduct"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignProduct_campaignId_productId_key" ON "CampaignProduct"("campaignId", "productId");

-- CreateIndex
CREATE INDEX "UserProductInteraction_userId_productId_interactionType_idx" ON "UserProductInteraction"("userId", "productId", "interactionType");

-- CreateIndex
CREATE INDEX "UserProductInteraction_userId_createdAt_idx" ON "UserProductInteraction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserProductInteraction_productId_interactionType_idx" ON "UserProductInteraction"("productId", "interactionType");

-- CreateIndex
CREATE INDEX "UserProductInteraction_interactionType_createdAt_idx" ON "UserProductInteraction"("interactionType", "createdAt");

-- CreateIndex
CREATE INDEX "ProductSimilarity_productId_score_idx" ON "ProductSimilarity"("productId", "score");

-- CreateIndex
CREATE INDEX "ProductSimilarity_similarProductId_idx" ON "ProductSimilarity"("similarProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSimilarity_productId_similarProductId_algorithm_key" ON "ProductSimilarity"("productId", "similarProductId", "algorithm");

-- CreateIndex
CREATE INDEX "InvoiceTemplate_vendorId_isDefault_idx" ON "InvoiceTemplate"("vendorId", "isDefault");

-- CreateIndex
CREATE INDEX "InvoiceTemplate_vendorId_isActive_idx" ON "InvoiceTemplate"("vendorId", "isActive");

-- CreateIndex
CREATE INDEX "InvoiceCustomField_templateId_displayOrder_idx" ON "InvoiceCustomField"("templateId", "displayOrder");

-- CreateIndex
CREATE INDEX "Admin_isActive_idx" ON "Admin"("isActive");

-- CreateIndex
CREATE INDEX "Admin_role_idx" ON "Admin"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Order_invoiceNumber_idx" ON "Order"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "PlatformConfig_category_idx" ON "PlatformConfig"("category");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformConfig_category_key_key" ON "PlatformConfig"("category", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_refundNumber_key" ON "Refund"("refundNumber");

-- CreateIndex
CREATE INDEX "Refund_createdAt_idx" ON "Refund"("createdAt");

-- CreateIndex
CREATE INDEX "Refund_refundNumber_idx" ON "Refund"("refundNumber");

-- CreateIndex
CREATE INDEX "Refund_returnId_idx" ON "Refund"("returnId");

-- CreateIndex
CREATE INDEX "Vendor_pincode_idx" ON "Vendor"("pincode");

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannerImpressionLedger" ADD CONSTRAINT "BannerImpressionLedger_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Banner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannerImpressionLedger" ADD CONSTRAINT "BannerImpressionLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogCategory" ADD CONSTRAINT "BlogCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyLater" ADD CONSTRAINT "BuyLater_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyLater" ADD CONSTRAINT "BuyLater_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CMSMenuItem" ADD CONSTRAINT "CMSMenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "CMSMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CMSMenuItem" ADD CONSTRAINT "CMSMenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CMSMenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryCommission" ADD CONSTRAINT "CategoryCommission_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutGroup" ADD CONSTRAINT "CheckoutGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceProduct" ADD CONSTRAINT "ClearanceProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceProduct" ADD CONSTRAINT "ClearanceProduct_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinValuation" ADD CONSTRAINT "CoinValuation_setByUserId_fkey" FOREIGN KEY ("setByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentFlag" ADD CONSTRAINT "ContentFlag_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalPromotion" ADD CONSTRAINT "LocalPromotion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalPromotion" ADD CONSTRAINT "LocalPromotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalPromotion" ADD CONSTRAINT "LocalPromotion_setByUserId_fkey" FOREIGN KEY ("setByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalPromotion" ADD CONSTRAINT "LocalPromotion_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_checkoutGroupId_fkey" FOREIGN KEY ("checkoutGroupId") REFERENCES "CheckoutGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnQCChecklist" ADD CONSTRAINT "ReturnQCChecklist_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnQCChecklist" ADD CONSTRAINT "ReturnQCChecklist_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnQCChecklist" ADD CONSTRAINT "ReturnQCChecklist_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDeliverySlotSnapshot" ADD CONSTRAINT "OrderDeliverySlotSnapshot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDeliverySlotSnapshot" ADD CONSTRAINT "OrderDeliverySlotSnapshot_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderFinancialSnapshot" ADD CONSTRAINT "OrderFinancialSnapshot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPackingProof" ADD CONSTRAINT "OrderPackingProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPackingProof" ADD CONSTRAINT "OrderPackingProof_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPackingProof" ADD CONSTRAINT "OrderPackingProof_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSettlement" ADD CONSTRAINT "OrderSettlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSettlement" ADD CONSTRAINT "OrderSettlement_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupPoint" ADD CONSTRAINT "PickupPoint_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reel" ADD CONSTRAINT "Reel_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reel" ADD CONSTRAINT "Reel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reel" ADD CONSTRAINT "Reel_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReelInteractionLedger" ADD CONSTRAINT "ReelInteractionLedger_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReelInteractionLedger" ADD CONSTRAINT "ReelInteractionLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralRewardGrant" ADD CONSTRAINT "ReferralRewardGrant_inviteeUserId_fkey" FOREIGN KEY ("inviteeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralRewardGrant" ADD CONSTRAINT "ReferralRewardGrant_inviterUserId_fkey" FOREIGN KEY ("inviterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralRewardGrant" ADD CONSTRAINT "ReferralRewardGrant_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralRewardGrant" ADD CONSTRAINT "ReferralRewardGrant_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ReferralRewardRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralRewardRule" ADD CONSTRAINT "ReferralRewardRule_setByAdminId_fkey" FOREIGN KEY ("setByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementOrder" ADD CONSTRAINT "ReplacementOrder_newOrderId_fkey" FOREIGN KEY ("newOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementOrder" ADD CONSTRAINT "ReplacementOrder_originalOrderId_fkey" FOREIGN KEY ("originalOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementOrder" ADD CONSTRAINT "ReplacementOrder_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "ReturnRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_pickupPointId_fkey" FOREIGN KEY ("pickupPointId") REFERENCES "PickupPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelecallerPerformance" ADD CONSTRAINT "TelecallerPerformance_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProductEvent" ADD CONSTRAINT "UserProductEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBowCoinLedger" ADD CONSTRAINT "VendorBowCoinLedger_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDeliveryWindow" ADD CONSTRAINT "VendorDeliveryWindow_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDisciplineEvent" ADD CONSTRAINT "VendorDisciplineEvent_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDisciplineState" ADD CONSTRAINT "VendorDisciplineState_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorStrike" ADD CONSTRAINT "VendorStrike_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorStrike" ADD CONSTRAINT "VendorStrike_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDiscipline" ADD CONSTRAINT "VendorDiscipline_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorServiceArea" ADD CONSTRAINT "VendorServiceArea_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignProduct" ADD CONSTRAINT "CampaignProduct_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignProduct" ADD CONSTRAINT "CampaignProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProductInteraction" ADD CONSTRAINT "UserProductInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProductInteraction" ADD CONSTRAINT "UserProductInteraction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSimilarity" ADD CONSTRAINT "ProductSimilarity_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSimilarity" ADD CONSTRAINT "ProductSimilarity_similarProductId_fkey" FOREIGN KEY ("similarProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceTemplate" ADD CONSTRAINT "InvoiceTemplate_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceCustomField" ADD CONSTRAINT "InvoiceCustomField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InvoiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "LocalPromotion_active_window_idx" RENAME TO "LocalPromotion_isActive_effectiveFrom_effectiveTo_idx";

-- RenameIndex
ALTER INDEX "ReferralRewardGrant_invitee_idx" RENAME TO "ReferralRewardGrant_inviteeUserId_createdAt_idx";

-- RenameIndex
ALTER INDEX "ReferralRewardGrant_inviter_idx" RENAME TO "ReferralRewardGrant_inviterUserId_createdAt_idx";

-- RenameIndex
ALTER INDEX "ReferralRewardGrant_rule_idx" RENAME TO "ReferralRewardGrant_ruleId_idx";

-- RenameIndex
ALTER INDEX "ReferralRewardRule_active_window_idx" RENAME TO "ReferralRewardRule_isActive_effectiveFrom_effectiveTo_idx";

-- RenameIndex
ALTER INDEX "ReferralRewardRule_max_idx" RENAME TO "ReferralRewardRule_maxOrderPaise_idx";

-- RenameIndex
ALTER INDEX "ReferralRewardRule_min_idx" RENAME TO "ReferralRewardRule_minOrderPaise_idx";

-- RenameIndex
ALTER INDEX "ReferralRewardRule_setByAdmin_idx" RENAME TO "ReferralRewardRule_setByAdminId_idx";

-- RenameIndex
ALTER INDEX "VendorDeliveryWindow_vendorId_active_idx" RENAME TO "VendorDeliveryWindow_vendorId_isActive_idx";

-- RenameIndex
ALTER INDEX "VendorDeliveryWindow_vendorId_weekday_active_idx" RENAME TO "VendorDeliveryWindow_vendorId_weekday_isActive_idx";

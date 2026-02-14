/*
  Warnings:

  - The `status` column on the `BannerCampaign` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `Campaign` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `discountType` column on the `Campaign` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Campaign` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `commissionRate` on the `CategoryCommission` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `commissionRate` on the `CommissionRule` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `commissionRate` on the `OrderFinancialSnapshot` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - The `status` column on the `Review` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `maxDiscount` on the `Room` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `commissionRate` on the `Vendor` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `commissionOverride` on the `Vendor` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,4)` to `Integer`.
  - You are about to alter the column `commissionRate` on the `VendorMembership` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - A unique constraint covering the columns `[slug]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,warehouseId]` on the table `Inventory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `title` to the `Banner` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `BannerCampaign` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BannerSlot" AS ENUM ('HOME_TOP', 'HOME_MIDDLE', 'CATEGORY_TOP', 'PRODUCT_SIDEBAR', 'CHECKOUT');

-- CreateEnum
CREATE TYPE "BannerDevice" AS ENUM ('ALL', 'DESKTOP', 'MOBILE');

-- CreateEnum
CREATE TYPE "CampaignOfferType" AS ENUM ('FLASH_SALE', 'FESTIVAL_OFFER', 'CLEARANCE', 'NEW_ARRIVAL', 'MEMBER_EXCLUSIVE', 'SEASONAL');

-- CreateEnum
CREATE TYPE "MarketingCampaignStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- DropIndex
DROP INDEX "Banner_slotType_isActive_idx";

-- DropIndex
DROP INDEX "Banner_slotType_startDate_endDate_isActive_idx";

-- DropIndex
DROP INDEX "Campaign_isActive_idx";

-- DropIndex
DROP INDEX "Campaign_status_idx";

-- DropIndex
DROP INDEX "Campaign_status_startDate_endDate_idx";

-- DropIndex
DROP INDEX "Campaign_type_idx";

-- AlterTable
ALTER TABLE "AbandonedCheckout" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Address" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Banner" ADD COLUMN     "device" "BannerDevice" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "linkUrl" TEXT,
ADD COLUMN     "mobileImageUrl" TEXT,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "slot" "BannerSlot" NOT NULL DEFAULT 'HOME_TOP',
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "BannerCampaign" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "BannerCampaignStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "CMSMenu" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CMSPage" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "type",
ADD COLUMN     "type" "CampaignOfferType" NOT NULL DEFAULT 'FLASH_SALE',
DROP COLUMN "discountType",
ADD COLUMN     "discountType" "CampaignDiscountType" NOT NULL DEFAULT 'PERCENTAGE',
DROP COLUMN "status",
ADD COLUMN     "status" "MarketingCampaignStatus" NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CategoryCommission" ALTER COLUMN "commissionRate" SET DEFAULT 0,
ALTER COLUMN "commissionRate" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "CategorySpec" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CommissionRule" ALTER COLUMN "commissionRate" SET DEFAULT 0,
ALTER COLUMN "commissionRate" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CreatorProfile" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Delivery" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Driver" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Employee" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Inventory" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "action" TEXT,
ADD COLUMN     "data" JSONB,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "type" SET DEFAULT 'PUSH';

-- AlterTable
ALTER TABLE "NotificationCampaign" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "NotificationTemplate" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "OrderFinancialSnapshot" ALTER COLUMN "commissionRate" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PaymentIntent" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PickupPoint" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PincodeGeo" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ProductSpecValue" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ReferralRewardRule" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Refund" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ReturnRequest" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ReturnSettlement" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "status",
ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Room" ALTER COLUMN "maxDiscount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Shipment" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SupportTicket" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "TicketTemplate" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "UserDevice" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "commissionRate" SET DEFAULT 0,
ALTER COLUMN "commissionRate" SET DATA TYPE INTEGER,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "commissionOverride" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "VendorDeliveryWindow" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "VendorMembership" ALTER COLUMN "commissionRate" SET DEFAULT 1500,
ALTER COLUMN "commissionRate" SET DATA TYPE INTEGER,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "VendorPayout" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "VendorPromotion" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "VendorServiceArea" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Warehouse" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- DropEnum
DROP TYPE "CampaignStatus";

-- DropEnum
DROP TYPE "CampaignType";

-- DropEnum
DROP TYPE "DiscountType";

-- CreateTable
CREATE TABLE "ApiRequestLog" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponUsage" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "discount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" INTEGER NOT NULL,
    "shippingCharges" INTEGER NOT NULL DEFAULT 0,
    "commission" INTEGER NOT NULL DEFAULT 0,
    "vendorEarnings" INTEGER NOT NULL DEFAULT 0,
    "awbNumber" TEXT,
    "courierPartner" TEXT,
    "trackingUrl" TEXT,
    "packedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "scopes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadFile" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "folder" TEXT NOT NULL DEFAULT 'root',
    "bucket" TEXT NOT NULL DEFAULT 'users',
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploaderType" TEXT NOT NULL DEFAULT 'ADMIN',
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiRequestLog_ip_endpoint_createdAt_idx" ON "ApiRequestLog"("ip", "endpoint", "createdAt");

-- CreateIndex
CREATE INDEX "CouponUsage_userId_couponId_idx" ON "CouponUsage"("userId", "couponId");

-- CreateIndex
CREATE INDEX "CouponUsage_couponId_idx" ON "CouponUsage"("couponId");

-- CreateIndex
CREATE INDEX "CouponUsage_createdAt_idx" ON "CouponUsage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CouponUsage_couponId_orderId_key" ON "CouponUsage"("couponId", "orderId");

-- CreateIndex
CREATE INDEX "VendorOrder_orderId_idx" ON "VendorOrder"("orderId");

-- CreateIndex
CREATE INDEX "VendorOrder_vendorId_status_idx" ON "VendorOrder"("vendorId", "status");

-- CreateIndex
CREATE INDEX "VendorOrder_vendorId_createdAt_idx" ON "VendorOrder"("vendorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_type_key" ON "NotificationPreference"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "UploadFile_folder_idx" ON "UploadFile"("folder");

-- CreateIndex
CREATE INDEX "UploadFile_mimetype_idx" ON "UploadFile"("mimetype");

-- CreateIndex
CREATE INDEX "UploadFile_uploadedBy_idx" ON "UploadFile"("uploadedBy");

-- CreateIndex
CREATE INDEX "UploadFile_entityType_entityId_idx" ON "UploadFile"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "UploadFile_isDeleted_createdAt_idx" ON "UploadFile"("isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "UploadFile_createdAt_idx" ON "UploadFile"("createdAt");

-- CreateIndex
CREATE INDEX "Banner_slot_isActive_idx" ON "Banner"("slot", "isActive");

-- CreateIndex
CREATE INDEX "Banner_slot_startDate_endDate_isActive_idx" ON "Banner"("slot", "startDate", "endDate", "isActive");

-- CreateIndex
CREATE INDEX "Banner_priority_idx" ON "Banner"("priority");

-- CreateIndex
CREATE INDEX "Banner_device_idx" ON "Banner"("device");

-- CreateIndex
CREATE INDEX "BannerCampaign_bannerId_idx" ON "BannerCampaign"("bannerId");

-- CreateIndex
CREATE INDEX "BannerCampaign_status_idx" ON "BannerCampaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_status_isActive_idx" ON "Campaign"("status", "isActive");

-- CreateIndex
CREATE INDEX "Campaign_priority_idx" ON "Campaign"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_productId_warehouseId_key" ON "Inventory"("productId", "warehouseId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_vendorId_status_createdAt_idx" ON "OrderItem"("vendorId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_vendorId_orderId_idx" ON "OrderItem"("vendorId", "orderId");

-- CreateIndex
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");

-- CreateIndex
CREATE INDEX "Review_vendorId_status_idx" ON "Review"("vendorId", "status");

-- CreateIndex
CREATE INDEX "VendorServiceArea_vendorId_isActive_idx" ON "VendorServiceArea"("vendorId", "isActive");

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannerCampaign" ADD CONSTRAINT "BannerCampaign_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Banner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomPackage" ADD CONSTRAINT "RoomPackage_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

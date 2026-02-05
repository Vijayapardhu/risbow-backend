-- CreateEnum
CREATE TYPE "CommissionScope" AS ENUM ('PRODUCT', 'VENDOR', 'CATEGORY', 'GLOBAL');

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "scope" "CommissionScope" NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "vendorId" TEXT,
    "categoryId" TEXT,
    "productId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionRule_scope_isActive_idx" ON "CommissionRule"("scope", "isActive");

-- CreateIndex
CREATE INDEX "CommissionRule_vendorId_idx" ON "CommissionRule"("vendorId");

-- CreateIndex
CREATE INDEX "CommissionRule_categoryId_idx" ON "CommissionRule"("categoryId");

-- CreateIndex
CREATE INDEX "CommissionRule_productId_idx" ON "CommissionRule"("productId");

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

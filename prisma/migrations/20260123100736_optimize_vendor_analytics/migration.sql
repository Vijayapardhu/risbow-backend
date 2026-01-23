-- CreateIndex
CREATE INDEX "Banner_vendorId_idx" ON "Banner"("vendorId");

-- CreateIndex
CREATE INDEX "Banner_slotType_startDate_endDate_isActive_idx" ON "Banner"("slotType", "startDate", "endDate", "isActive");

-- CreateIndex
CREATE INDEX "Product_vendorId_stock_idx" ON "Product"("vendorId", "stock");

-- CreateIndex
CREATE INDEX "VendorPromotion_vendorId_status_idx" ON "VendorPromotion"("vendorId", "status");

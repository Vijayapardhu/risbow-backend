-- Converted from manual_add_vendor_promotion_metadata.sql
-- RISBOW: VendorPromotion.metadata for payment intent linkage and analytics extensions

ALTER TABLE "VendorPromotion"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;


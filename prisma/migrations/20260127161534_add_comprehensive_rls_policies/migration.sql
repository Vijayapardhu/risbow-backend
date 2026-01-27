-- Comprehensive Row Level Security (RLS) Policies
-- Safe/idempotent - can be run multiple times
-- Enables RLS on all tables and creates policies for vendor isolation, creator access, admin bypass

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vendor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Story" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClearanceProduct" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreatorProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VendorDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VendorDisciplineEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VendorDisciplineState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VendorBowCoinLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BannerImpressionLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReelInteractionLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BannerCampaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentModeration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Banner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CartItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Address" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentIntent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderPackingProof" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderFinancialSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderSettlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VendorServiceArea" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VendorDeliveryWindow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PickupPoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReturnRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReturnItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReturnSettlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReturnTimeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AbandonedCheckout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CheckoutFollowup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CheckoutGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderDeliverySlotSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VendorFollower" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VendorMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VendorPayout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VendorPromotion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LocalPromotion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VendorInquiry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wishlist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BuyLater" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoomMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoomBoost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoomInsight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CategorySpec" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductSpecValue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Coupon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CoinLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CoinValuation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReferralTracking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReferralRewardRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReferralRewardGrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SearchClick" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductSearchMiss" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SearchTrending" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CartInsight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecommendationEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserProductEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BowActionLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BowInteraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPreferenceProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserDevice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TelecallerPerformance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GiftSKU" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeeklyOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoomPackage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReplacementOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderFinancialSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CategoryCommission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReturnQCChecklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PincodeGeo" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Check if user is admin
-- ============================================
CREATE OR REPLACE FUNCTION is_admin(user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "User" 
    WHERE id = user_id 
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Get user role
-- ============================================
CREATE OR REPLACE FUNCTION get_user_role(user_id TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM "User" WHERE id = user_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- USER POLICIES
-- ============================================

-- Users can read/update own data
DROP POLICY IF EXISTS "users_own_data" ON "User";
CREATE POLICY "users_own_data" ON "User"
  FOR ALL USING (auth.uid()::text = id);

-- Admins can read all users
DROP POLICY IF EXISTS "admins_read_all_users" ON "User";
CREATE POLICY "admins_read_all_users" ON "User"
  FOR SELECT USING (is_admin(auth.uid()::text));

-- ============================================
-- VENDOR POLICIES
-- ============================================

-- Vendors can read/update own data
DROP POLICY IF EXISTS "vendors_own_data" ON "Vendor";
CREATE POLICY "vendors_own_data" ON "Vendor"
  FOR ALL USING (auth.uid()::text = id);

-- Customers can read active, approved vendors
DROP POLICY IF EXISTS "customers_read_active_vendors" ON "Vendor";
CREATE POLICY "customers_read_active_vendors" ON "Vendor"
  FOR SELECT USING (
    get_user_role(auth.uid()::text) = 'CUSTOMER'
    AND "kycStatus" = 'APPROVED'
    AND ("storeStatus" IS NULL OR "storeStatus" = 'ACTIVE')
  );

-- Retailers can read wholesalers (for B2B)
DROP POLICY IF EXISTS "retailers_read_wholesalers" ON "Vendor";
CREATE POLICY "retailers_read_wholesalers" ON "Vendor"
  FOR SELECT USING (
    get_user_role(auth.uid()::text) = 'VENDOR'
    AND EXISTS (SELECT 1 FROM "Vendor" WHERE id = auth.uid()::text AND role = 'RETAILER')
    AND "role" = 'WHOLESALER'
    AND "kycStatus" = 'APPROVED'
  );

-- Admins can do everything
DROP POLICY IF EXISTS "admins_full_access_vendors" ON "Vendor";
CREATE POLICY "admins_full_access_vendors" ON "Vendor"
  FOR ALL USING (is_admin(auth.uid()::text));

-- ============================================
-- PRODUCT POLICIES
-- ============================================

-- Public can read active products
DROP POLICY IF EXISTS "public_read_active_products" ON "Product";
CREATE POLICY "public_read_active_products" ON "Product"
  FOR SELECT USING ("isActive" = true AND "visibility" = 'PUBLISHED');

-- Vendors can manage own products
DROP POLICY IF EXISTS "vendors_manage_own_products" ON "Product";
CREATE POLICY "vendors_manage_own_products" ON "Product"
  FOR ALL USING (auth.uid()::text = "vendorId");

-- Admins can do everything
DROP POLICY IF EXISTS "admins_full_access_products" ON "Product";
CREATE POLICY "admins_full_access_products" ON "Product"
  FOR ALL USING (is_admin(auth.uid()::text));

-- ============================================
-- ORDER POLICIES
-- ============================================

-- Users can read own orders
DROP POLICY IF EXISTS "users_read_own_orders" ON "Order";
CREATE POLICY "users_read_own_orders" ON "Order"
  FOR SELECT USING (auth.uid()::text = "userId");

-- Users can create own orders
DROP POLICY IF EXISTS "users_create_own_orders" ON "Order";
CREATE POLICY "users_create_own_orders" ON "Order"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- Vendors can read orders containing their products
DROP POLICY IF EXISTS "vendors_read_own_orders" ON "Order";
CREATE POLICY "vendors_read_own_orders" ON "Order"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jsonb_array_elements("items") AS item
      WHERE (item->>'vendorId')::text = auth.uid()::text
    )
  );

-- Admins can do everything
DROP POLICY IF EXISTS "admins_full_access_orders" ON "Order";
CREATE POLICY "admins_full_access_orders" ON "Order"
  FOR ALL USING (is_admin(auth.uid()::text));

-- ============================================
-- STORY POLICIES
-- ============================================

-- Public can read active, non-expired, non-flagged stories
DROP POLICY IF EXISTS "public_read_active_stories" ON "Story";
CREATE POLICY "public_read_active_stories" ON "Story"
  FOR SELECT USING (
    "isActive" = true
    AND "expiresAt" > NOW()
    AND "flaggedForReview" = false
  );

-- Vendors can manage own stories
DROP POLICY IF EXISTS "vendors_manage_own_stories" ON "Story";
CREATE POLICY "vendors_manage_own_stories" ON "Story"
  FOR ALL USING (auth.uid()::text = "vendorId");

-- Admins can do everything
DROP POLICY IF EXISTS "admins_full_access_stories" ON "Story";
CREATE POLICY "admins_full_access_stories" ON "Story"
  FOR ALL USING (is_admin(auth.uid()::text));

-- ============================================
-- REEL POLICIES
-- ============================================

-- Public can read non-flagged reels
DROP POLICY IF EXISTS "public_read_reels" ON "Reel";
CREATE POLICY "public_read_reels" ON "Reel"
  FOR SELECT USING ("flaggedForReview" = false);

-- Vendors can manage own reels
DROP POLICY IF EXISTS "vendors_manage_own_reels" ON "Reel";
CREATE POLICY "vendors_manage_own_reels" ON "Reel"
  FOR ALL USING (auth.uid()::text = "vendorId");

-- Creators can manage own reels
DROP POLICY IF EXISTS "creators_manage_own_reels" ON "Reel";
CREATE POLICY "creators_manage_own_reels" ON "Reel"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "CreatorProfile" 
      WHERE id = "creatorId" AND "userId" = auth.uid()::text
    )
  );

-- Admins can do everything
DROP POLICY IF EXISTS "admins_full_access_reels" ON "Reel";
CREATE POLICY "admins_full_access_reels" ON "Reel"
  FOR ALL USING (is_admin(auth.uid()::text));

-- ============================================
-- CLEARANCE PRODUCT POLICIES
-- ============================================

-- Public can read active clearance products
DROP POLICY IF EXISTS "public_read_active_clearance" ON "ClearanceProduct";
CREATE POLICY "public_read_active_clearance" ON "ClearanceProduct"
  FOR SELECT USING ("isActive" = true AND "expiryDate" > NOW());

-- Vendors can manage own clearance products
DROP POLICY IF EXISTS "vendors_manage_own_clearance" ON "ClearanceProduct";
CREATE POLICY "vendors_manage_own_clearance" ON "ClearanceProduct"
  FOR ALL USING (auth.uid()::text = "vendorId");

-- Admins can do everything
DROP POLICY IF EXISTS "admins_full_access_clearance" ON "ClearanceProduct";
CREATE POLICY "admins_full_access_clearance" ON "ClearanceProduct"
  FOR ALL USING (is_admin(auth.uid()::text));

-- ============================================
-- CREATOR PROFILE POLICIES
-- ============================================

-- Public can read creator profiles
DROP POLICY IF EXISTS "public_read_creator_profiles" ON "CreatorProfile";
CREATE POLICY "public_read_creator_profiles" ON "CreatorProfile"
  FOR SELECT USING (true);

-- Creators can manage own profile
DROP POLICY IF EXISTS "creators_manage_own_profile" ON "CreatorProfile";
CREATE POLICY "creators_manage_own_profile" ON "CreatorProfile"
  FOR ALL USING (auth.uid()::text = "userId");

-- Admins can do everything
DROP POLICY IF EXISTS "admins_full_access_creator_profiles" ON "CreatorProfile";
CREATE POLICY "admins_full_access_creator_profiles" ON "CreatorProfile"
  FOR ALL USING (is_admin(auth.uid()::text));

-- ============================================
-- VENDOR DOCUMENT POLICIES
-- ============================================

-- Vendors can read own documents
DROP POLICY IF EXISTS "vendors_read_own_documents" ON "VendorDocument";
CREATE POLICY "vendors_read_own_documents" ON "VendorDocument"
  FOR SELECT USING (auth.uid()::text = "vendorId");

-- Vendors can upload own documents
DROP POLICY IF EXISTS "vendors_upload_own_documents" ON "VendorDocument";
CREATE POLICY "vendors_upload_own_documents" ON "VendorDocument"
  FOR INSERT WITH CHECK (auth.uid()::text = "vendorId");

-- Admins can read/update all documents
DROP POLICY IF EXISTS "admins_full_access_documents" ON "VendorDocument";
CREATE POLICY "admins_full_access_documents" ON "VendorDocument"
  FOR ALL USING (is_admin(auth.uid()::text));

-- ============================================
-- VENDOR DISCIPLINE POLICIES
-- ============================================

-- Vendors can read own discipline events and state
DROP POLICY IF EXISTS "vendors_read_own_discipline" ON "VendorDisciplineEvent";
CREATE POLICY "vendors_read_own_discipline" ON "VendorDisciplineEvent"
  FOR SELECT USING (auth.uid()::text = "vendorId");

DROP POLICY IF EXISTS "vendors_read_own_discipline_state" ON "VendorDisciplineState";
CREATE POLICY "vendors_read_own_discipline_state" ON "VendorDisciplineState"
  FOR SELECT USING (auth.uid()::text = "vendorId");

-- System can insert discipline events (via service role)
DROP POLICY IF EXISTS "system_insert_discipline_events" ON "VendorDisciplineEvent";
CREATE POLICY "system_insert_discipline_events" ON "VendorDisciplineEvent"
  FOR INSERT WITH CHECK (true); -- Service role bypasses RLS

-- System can update discipline state (via service role)
DROP POLICY IF EXISTS "system_update_discipline_state" ON "VendorDisciplineState";
CREATE POLICY "system_update_discipline_state" ON "VendorDisciplineState"
  FOR ALL USING (true); -- Service role bypasses RLS

-- Admins can read all discipline data
DROP POLICY IF EXISTS "admins_read_all_discipline" ON "VendorDisciplineEvent";
CREATE POLICY "admins_read_all_discipline" ON "VendorDisciplineEvent"
  FOR SELECT USING (is_admin(auth.uid()::text));

DROP POLICY IF EXISTS "admins_read_all_discipline_state" ON "VendorDisciplineState";
CREATE POLICY "admins_read_all_discipline_state" ON "VendorDisciplineState"
  FOR SELECT USING (is_admin(auth.uid()::text));

-- ============================================
-- VENDOR BOW COIN LEDGER POLICIES
-- ============================================

-- Vendors can read own ledger
DROP POLICY IF EXISTS "vendors_read_own_coin_ledger" ON "VendorBowCoinLedger";
CREATE POLICY "vendors_read_own_coin_ledger" ON "VendorBowCoinLedger"
  FOR SELECT USING (auth.uid()::text = "vendorId");

-- System can insert ledger entries (via service role)
DROP POLICY IF EXISTS "system_insert_coin_ledger" ON "VendorBowCoinLedger";
CREATE POLICY "system_insert_coin_ledger" ON "VendorBowCoinLedger"
  FOR INSERT WITH CHECK (true); -- Service role bypasses RLS

-- Admins can read all ledgers
DROP POLICY IF EXISTS "admins_read_all_coin_ledger" ON "VendorBowCoinLedger";
CREATE POLICY "admins_read_all_coin_ledger" ON "VendorBowCoinLedger"
  FOR SELECT USING (is_admin(auth.uid()::text));

-- ============================================
-- BANNER IMPRESSION LEDGER POLICIES
-- ============================================

-- Public can insert impressions (for tracking)
DROP POLICY IF EXISTS "public_insert_banner_impressions" ON "BannerImpressionLedger";
CREATE POLICY "public_insert_banner_impressions" ON "BannerImpressionLedger"
  FOR INSERT WITH CHECK (true);

-- Users can read own impressions
DROP POLICY IF EXISTS "users_read_own_impressions" ON "BannerImpressionLedger";
CREATE POLICY "users_read_own_impressions" ON "BannerImpressionLedger"
  FOR SELECT USING (auth.uid()::text = "userId" OR "userId" IS NULL);

-- Vendors can read impressions for own banners
DROP POLICY IF EXISTS "vendors_read_own_banner_impressions" ON "BannerImpressionLedger";
CREATE POLICY "vendors_read_own_banner_impressions" ON "BannerImpressionLedger"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Banner" 
      WHERE id = "bannerId" AND "vendorId" = auth.uid()::text
    )
  );

-- Admins can read all impressions
DROP POLICY IF EXISTS "admins_read_all_impressions" ON "BannerImpressionLedger";
CREATE POLICY "admins_read_all_impressions" ON "BannerImpressionLedger"
  FOR SELECT USING (is_admin(auth.uid()::text));

-- ============================================
-- REEL INTERACTION LEDGER POLICIES
-- ============================================

-- Users can insert own interactions
DROP POLICY IF EXISTS "users_insert_own_interactions" ON "ReelInteractionLedger";
CREATE POLICY "users_insert_own_interactions" ON "ReelInteractionLedger"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- Users can read own interactions
DROP POLICY IF EXISTS "users_read_own_interactions" ON "ReelInteractionLedger";
CREATE POLICY "users_read_own_interactions" ON "ReelInteractionLedger"
  FOR SELECT USING (auth.uid()::text = "userId");

-- Public can read interactions (for stats)
DROP POLICY IF EXISTS "public_read_interactions" ON "ReelInteractionLedger";
CREATE POLICY "public_read_interactions" ON "ReelInteractionLedger"
  FOR SELECT USING (true);

-- ============================================
-- BANNER CAMPAIGN POLICIES
-- ============================================

-- Public can read active campaigns
DROP POLICY IF EXISTS "public_read_active_campaigns" ON "BannerCampaign";
CREATE POLICY "public_read_active_campaigns" ON "BannerCampaign"
  FOR SELECT USING (
    "startDate" <= NOW() 
    AND "endDate" >= NOW()
    AND "paymentStatus" = 'PAID'
  );

-- Vendors can manage own campaigns
DROP POLICY IF EXISTS "vendors_manage_own_campaigns" ON "BannerCampaign";
CREATE POLICY "vendors_manage_own_campaigns" ON "BannerCampaign"
  FOR ALL USING (auth.uid()::text = "vendorId");

-- Admins can do everything
DROP POLICY IF EXISTS "admins_full_access_campaigns" ON "BannerCampaign";
CREATE POLICY "admins_full_access_campaigns" ON "BannerCampaign"
  FOR ALL USING (is_admin(auth.uid()::text));

-- ============================================
-- BANNER POLICIES
-- ============================================

-- Public can read active banners
DROP POLICY IF EXISTS "public_read_active_banners" ON "Banner";
CREATE POLICY "public_read_active_banners" ON "Banner"
  FOR SELECT USING (
    "isActive" = true
    AND "startDate" <= NOW()
    AND "endDate" >= NOW()
  );

-- Vendors can manage own banners
DROP POLICY IF EXISTS "vendors_manage_own_banners" ON "Banner";
CREATE POLICY "vendors_manage_own_banners" ON "Banner"
  FOR ALL USING (auth.uid()::text = "vendorId" OR "vendorId" IS NULL);

-- Admins can do everything
DROP POLICY IF EXISTS "admins_full_access_banners" ON "Banner";
CREATE POLICY "admins_full_access_banners" ON "Banner"
  FOR ALL USING (is_admin(auth.uid()::text));

-- ============================================
-- CONTENT MODERATION POLICIES
-- ============================================

-- Users can flag content
DROP POLICY IF EXISTS "users_flag_content" ON "ContentModeration";
CREATE POLICY "users_flag_content" ON "ContentModeration"
  FOR INSERT WITH CHECK (auth.uid()::text = "flaggedBy" OR "flaggedBy" IS NULL);

-- Admins can read/update all moderation records
DROP POLICY IF EXISTS "admins_full_access_moderation" ON "ContentModeration";
CREATE POLICY "admins_full_access_moderation" ON "ContentModeration"
  FOR ALL USING (is_admin(auth.uid()::text));

-- ============================================
-- REVIEW POLICIES
-- ============================================

-- Public can read reviews
DROP POLICY IF EXISTS "public_read_reviews" ON "Review";
CREATE POLICY "public_read_reviews" ON "Review"
  FOR SELECT USING (true);

-- Users can create own reviews
DROP POLICY IF EXISTS "users_create_own_reviews" ON "Review";
CREATE POLICY "users_create_own_reviews" ON "Review"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

-- Users can update own reviews
DROP POLICY IF EXISTS "users_update_own_reviews" ON "Review";
CREATE POLICY "users_update_own_reviews" ON "Review"
  FOR UPDATE USING (auth.uid()::text = "userId");

-- Admins can do everything
DROP POLICY IF EXISTS "admins_full_access_reviews" ON "Review";
CREATE POLICY "admins_full_access_reviews" ON "Review"
  FOR ALL USING (is_admin(auth.uid()::text));

-- ============================================
-- CART POLICIES
-- ============================================

-- Users can manage own cart
DROP POLICY IF EXISTS "users_manage_own_cart" ON "Cart";
CREATE POLICY "users_manage_own_cart" ON "Cart"
  FOR ALL USING (auth.uid()::text = "userId");

-- Admins can read all carts
DROP POLICY IF EXISTS "admins_read_all_carts" ON "Cart";
CREATE POLICY "admins_read_all_carts" ON "Cart"
  FOR SELECT USING (is_admin(auth.uid()::text));

-- ============================================
-- ADDRESS POLICIES
-- ============================================

-- Users can manage own addresses
DROP POLICY IF EXISTS "users_manage_own_addresses" ON "Address";
CREATE POLICY "users_manage_own_addresses" ON "Address"
  FOR ALL USING (auth.uid()::text = "userId");

-- Admins can read all addresses
DROP POLICY IF EXISTS "admins_read_all_addresses" ON "Address";
CREATE POLICY "admins_read_all_addresses" ON "Address"
  FOR SELECT USING (is_admin(auth.uid()::text));

-- ============================================
-- ORDER PACKING PROOF POLICIES
-- ============================================

-- Vendors can manage own packing proofs
DROP POLICY IF EXISTS "vendors_manage_own_packing_proofs" ON "OrderPackingProof";
CREATE POLICY "vendors_manage_own_packing_proofs" ON "OrderPackingProof"
  FOR ALL USING (auth.uid()::text = "vendorId");

-- Customers can read packing proofs for own orders
DROP POLICY IF EXISTS "customers_read_own_packing_proofs" ON "OrderPackingProof";
CREATE POLICY "customers_read_own_packing_proofs" ON "OrderPackingProof"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Order" 
      WHERE id = "orderId" AND "userId" = auth.uid()::text
    )
  );

-- Admins can do everything
DROP POLICY IF EXISTS "admins_full_access_packing_proofs" ON "OrderPackingProof";
CREATE POLICY "admins_full_access_packing_proofs" ON "OrderPackingProof"
  FOR ALL USING (is_admin(auth.uid()::text));

-- ============================================
-- ADDITIONAL CRITICAL TABLE POLICIES
-- ============================================

-- Payment: Users can read own payments
DROP POLICY IF EXISTS "users_read_own_payments" ON "Payment";
CREATE POLICY "users_read_own_payments" ON "Payment"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Order" 
      WHERE id = "orderId" AND "userId" = auth.uid()::text
    )
  );

-- PaymentIntent: Users can manage own payment intents
DROP POLICY IF EXISTS "users_manage_own_payment_intents" ON "PaymentIntent";
CREATE POLICY "users_manage_own_payment_intents" ON "PaymentIntent"
  FOR ALL USING (auth.uid()::text = "createdByUserId");

-- Notification: Users can read own notifications
DROP POLICY IF EXISTS "users_read_own_notifications" ON "Notification";
CREATE POLICY "users_read_own_notifications" ON "Notification"
  FOR SELECT USING (auth.uid()::text = "userId" OR "userId" IS NULL);

-- Wallet: Users can read own wallet
DROP POLICY IF EXISTS "users_read_own_wallet" ON "Wallet";
CREATE POLICY "users_read_own_wallet" ON "Wallet"
  FOR SELECT USING (auth.uid()::text = "userId");

-- CoinLedger: Users can read own coin ledger
DROP POLICY IF EXISTS "users_read_own_coin_ledger" ON "CoinLedger";
CREATE POLICY "users_read_own_coin_ledger" ON "CoinLedger"
  FOR SELECT USING (auth.uid()::text = "userId");

-- System can insert coin ledger entries
DROP POLICY IF EXISTS "system_insert_coin_ledger" ON "CoinLedger";
CREATE POLICY "system_insert_coin_ledger" ON "CoinLedger"
  FOR INSERT WITH CHECK (true); -- Service role bypasses RLS

-- AuditLog: Only admins can read
DROP POLICY IF EXISTS "admins_read_audit_logs" ON "AuditLog";
CREATE POLICY "admins_read_audit_logs" ON "AuditLog"
  FOR SELECT USING (is_admin(auth.uid()::text));

-- System can insert audit logs
DROP POLICY IF EXISTS "system_insert_audit_logs" ON "AuditLog";
CREATE POLICY "system_insert_audit_logs" ON "AuditLog"
  FOR INSERT WITH CHECK (true); -- Service role bypasses RLS

-- VendorServiceArea: Vendors manage own
DROP POLICY IF EXISTS "vendors_manage_own_service_areas" ON "VendorServiceArea";
CREATE POLICY "vendors_manage_own_service_areas" ON "VendorServiceArea"
  FOR ALL USING (auth.uid()::text = "vendorId");

-- VendorDeliveryWindow: Vendors manage own
DROP POLICY IF EXISTS "vendors_manage_own_delivery_windows" ON "VendorDeliveryWindow";
CREATE POLICY "vendors_manage_own_delivery_windows" ON "VendorDeliveryWindow"
  FOR ALL USING (auth.uid()::text = "vendorId");

-- PickupPoint: Vendors manage own
DROP POLICY IF EXISTS "vendors_manage_own_pickup_points" ON "PickupPoint";
CREATE POLICY "vendors_manage_own_pickup_points" ON "PickupPoint"
  FOR ALL USING (auth.uid()::text = "vendorId");

-- ReturnRequest: Users can manage own returns
DROP POLICY IF EXISTS "users_manage_own_returns" ON "ReturnRequest";
CREATE POLICY "users_manage_own_returns" ON "ReturnRequest"
  FOR ALL USING (auth.uid()::text = "userId");

-- Vendors can read returns for own orders
DROP POLICY IF EXISTS "vendors_read_own_returns" ON "ReturnRequest";
CREATE POLICY "vendors_read_own_returns" ON "ReturnRequest"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Order" o
      JOIN jsonb_array_elements(o.items) AS item ON true
      WHERE o.id = "orderId" AND (item->>'vendorId')::text = auth.uid()::text
    )
  );

-- Admins can do everything on returns
DROP POLICY IF EXISTS "admins_full_access_returns" ON "ReturnRequest";
CREATE POLICY "admins_full_access_returns" ON "ReturnRequest"
  FOR ALL USING (is_admin(auth.uid()::text));

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION is_admin(TEXT) IS 'Helper function to check if a user is an admin. Used in RLS policies.';
COMMENT ON FUNCTION get_user_role(TEXT) IS 'Helper function to get user role. Used in RLS policies.';

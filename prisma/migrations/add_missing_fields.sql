-- Add missing fields to existing tables (idempotent)

-- Add coinsUsed, coinsUsedDebited to Order if not exists
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "coinsUsed" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "coinsUsedDebited" BOOLEAN DEFAULT false;

-- Add referenceId to CoinLedger if not exists
ALTER TABLE "CoinLedger"
ADD COLUMN IF NOT EXISTS "referenceId" TEXT;

-- Add indexes if not exists (optional for performance)
CREATE INDEX IF NOT EXISTS "CoinLedger_referenceId_idx" ON "CoinLedger"("referenceId");
CREATE INDEX IF NOT EXISTS "CoinLedger_userId_idx" ON "CoinLedger"("userId");
CREATE INDEX IF NOT EXISTS "Order_razorpayOrderId_idx" ON "Order"("razorpayOrderId");
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");

-- ============================================
-- Row Level Security (RLS) - Enable for all
-- ============================================

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoomMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CoinLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Address" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CartItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Wishlist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Banner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vendor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GiftSKU" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoomPackage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeeklyOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Admin" ENABLE ROW LEVEL SECURITY;

-- User table: Users see their own profile, public users list
DROP POLICY IF EXISTS "Users can see own profile" ON "User";
CREATE POLICY "Users can see own profile"
  ON "User" FOR SELECT
  USING (auth.uid()::text = id OR true); -- Allow public read for now

DROP POLICY IF EXISTS "Users can update own profile" ON "User";
CREATE POLICY "Users can update own profile"
  ON "User" FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- Order table: Users see their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON "Order";
CREATE POLICY "Users can view own orders"
  ON "Order" FOR SELECT
  USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can insert orders" ON "Order";
CREATE POLICY "Users can insert orders"
  ON "Order" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can update own orders" ON "Order";
CREATE POLICY "Users can update own orders"
  ON "Order" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- CoinLedger: Users see their own ledger
DROP POLICY IF EXISTS "Users can view own coin ledger" ON "CoinLedger";
CREATE POLICY "Users can view own coin ledger"
  ON "CoinLedger" FOR SELECT
  USING (auth.uid()::text = "userId");

-- Address: Users see their own addresses
DROP POLICY IF EXISTS "Users can view own addresses" ON "Address";
CREATE POLICY "Users can view own addresses"
  ON "Address" FOR SELECT
  USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can insert own addresses" ON "Address";
CREATE POLICY "Users can insert own addresses"
  ON "Address" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can update own addresses" ON "Address";
CREATE POLICY "Users can update own addresses"
  ON "Address" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can delete own addresses" ON "Address";
CREATE POLICY "Users can delete own addresses"
  ON "Address" FOR DELETE
  USING (auth.uid()::text = "userId");

-- Cart: Users see their own cart
DROP POLICY IF EXISTS "Users can view own cart" ON "Cart";
CREATE POLICY "Users can view own cart"
  ON "Cart" FOR SELECT
  USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can insert own cart" ON "Cart";
CREATE POLICY "Users can insert own cart"
  ON "Cart" FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can update own cart" ON "Cart";
CREATE POLICY "Users can update own cart"
  ON "Cart" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- CartItem: Allow based on user's cart
DROP POLICY IF EXISTS "Users can manage own cart items" ON "CartItem";
CREATE POLICY "Users can manage own cart items"
  ON "CartItem" FOR ALL
  USING (EXISTS (SELECT 1 FROM "Cart" WHERE "Cart"."id" = "CartItem"."cartId" AND "Cart"."userId" = auth.uid()::text));

-- Wishlist: Users manage own wishlist
DROP POLICY IF EXISTS "Users can manage own wishlist" ON "Wishlist";
CREATE POLICY "Users can manage own wishlist"
  ON "Wishlist" FOR ALL
  USING (auth.uid()::text = "userId");

-- Notification: Users see own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON "Notification";
CREATE POLICY "Users can view own notifications"
  ON "Notification" FOR SELECT
  USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Users can update own notifications" ON "Notification";
CREATE POLICY "Users can update own notifications"
  ON "Notification" FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- RoomMember: Users see rooms they joined
DROP POLICY IF EXISTS "Users can view their room memberships" ON "RoomMember";
CREATE POLICY "Users can view their room memberships"
  ON "RoomMember" FOR SELECT
  USING (auth.uid()::text = "userId");

-- Product: Public read, vendors can update own
DROP POLICY IF EXISTS "Anyone can view products" ON "Product";
CREATE POLICY "Anyone can view products"
  ON "Product" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Vendors can update own products" ON "Product";
CREATE POLICY "Vendors can update own products"
  ON "Product" FOR UPDATE
  USING (EXISTS (SELECT 1 FROM "Vendor" WHERE "Vendor"."id" = "Product"."vendorId" AND "Vendor"."id" = auth.uid()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM "Vendor" WHERE "Vendor"."id" = "Product"."vendorId" AND "Vendor"."id" = auth.uid()::text));

-- Review: Users can view, own reviews can be updated
DROP POLICY IF EXISTS "Anyone can view reviews" ON "Review";
CREATE POLICY "Anyone can view reviews"
  ON "Review" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage own reviews" ON "Review";
CREATE POLICY "Users can manage own reviews"
  ON "Review" FOR ALL
  USING (auth.uid()::text = "userId");

-- Payment: Users see own payments
DROP POLICY IF EXISTS "Users can view own payments" ON "Payment";
CREATE POLICY "Users can view own payments"
  ON "Payment" FOR SELECT
  USING (EXISTS (SELECT 1 FROM "Order" WHERE "Order"."id" = "Payment"."orderId" AND "Order"."userId" = auth.uid()::text));

-- Category: Public read
DROP POLICY IF EXISTS "Anyone can view categories" ON "Category";
CREATE POLICY "Anyone can view categories"
  ON "Category" FOR SELECT
  USING (true);

-- GiftSKU: Public read
DROP POLICY IF EXISTS "Anyone can view gifts" ON "GiftSKU";
CREATE POLICY "Anyone can view gifts"
  ON "GiftSKU" FOR SELECT
  USING (true);

-- Room: Public read, members can join
DROP POLICY IF EXISTS "Anyone can view rooms" ON "Room";
CREATE POLICY "Anyone can view rooms"
  ON "Room" FOR SELECT
  USING (true);

-- Vendor: Public read
DROP POLICY IF EXISTS "Anyone can view vendors" ON "Vendor";
CREATE POLICY "Anyone can view vendors"
  ON "Vendor" FOR SELECT
  USING (true);

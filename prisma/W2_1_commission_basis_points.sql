-- RISBOW — W2.1 Commission/Rate fields to basis points (PostgreSQL)
-- Date: 2026-02-09
--
-- IMPORTANT:
-- - Take a DB backup before running.
-- - Run in a maintenance window.
-- - This converts percentage/rate fields from FLOAT/DECIMAL to INT basis-points (bp).
--   Convention: 10000 bp = 100%. Example: 15% => 1500.
-- - Room.maxDiscount is treated as a PERCENTAGE (80 => 80.00%) and is converted to bp via * 100.
--
-- Verify column types before running each ALTER.
-- You may need to adjust table/column names if your DB uses different naming.

BEGIN;

-- 1) CategoryCommission.commissionRate : Float -> Int (bp)
ALTER TABLE "CategoryCommission"
  ALTER COLUMN "commissionRate" TYPE INTEGER
  USING ROUND("commissionRate" * 10000)::INTEGER;

-- 2) CommissionRule.commissionRate : Float -> Int (bp)
ALTER TABLE "CommissionRule"
  ALTER COLUMN "commissionRate" TYPE INTEGER
  USING ROUND("commissionRate" * 10000)::INTEGER;

-- 3) OrderFinancialSnapshot.commissionRate : Float -> Int (bp)
ALTER TABLE "OrderFinancialSnapshot"
  ALTER COLUMN "commissionRate" TYPE INTEGER
  USING ROUND("commissionRate" * 10000)::INTEGER;

-- 4) VendorMembership.commissionRate : Float -> Int (bp)
ALTER TABLE "VendorMembership"
  ALTER COLUMN "commissionRate" TYPE INTEGER
  USING ROUND("commissionRate" * 10000)::INTEGER;

-- 5) Vendor.commissionRate : Float -> Int (bp)
ALTER TABLE "Vendor"
  ALTER COLUMN "commissionRate" TYPE INTEGER
  USING ROUND("commissionRate" * 10000)::INTEGER;

-- 6) Vendor.commissionOverride : Decimal(5,4) -> Int? (bp)
-- If the column currently stores a FRACTION (0.1250 for 12.50%), this conversion is correct.
ALTER TABLE "Vendor"
  ALTER COLUMN "commissionOverride" TYPE INTEGER
  USING CASE
    WHEN "commissionOverride" IS NULL THEN NULL
    ELSE ROUND(("commissionOverride"::NUMERIC) * 10000)::INTEGER
  END;

-- 7) Room.maxDiscount : Float? (PERCENT, e.g. 80) -> Int? (bp, e.g. 8000)
ALTER TABLE "Room"
  ALTER COLUMN "maxDiscount" TYPE INTEGER
  USING CASE
    WHEN "maxDiscount" IS NULL THEN NULL
    ELSE ROUND(("maxDiscount"::NUMERIC) * 100)::INTEGER
  END;

COMMIT;

-- Post-migration checks:
-- SELECT commissionRate FROM "CommissionRule" LIMIT 5;
-- Expect small ints like 0, 500, 1500, 2000 ... (not decimals).
--
-- SELECT maxDiscount FROM "Room" WHERE maxDiscount IS NOT NULL LIMIT 5;
-- Expect ints like 1000, 3300, 8000 ... (bp).


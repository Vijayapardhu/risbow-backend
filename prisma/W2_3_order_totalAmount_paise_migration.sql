-- RISBOW — W2.3 Fix Order.totalAmount units (rupees -> paise) for legacy rows
-- Date: 2026-02-09
--
-- Context:
-- Some legacy code paths stored "Order.totalAmount" in RUPEES by doing:
--   totalAmount = Math.round(payableInPaise / 100)
-- but RISBOW invariant is: ALL money stored as INTEGER PAISE.
--
-- This script provides a conservative heuristic using the Payment table:
-- If Payment.amount is in paise and Order.totalAmount equals round(Payment.amount / 100),
-- then Order.totalAmount is likely stored in rupees and should be multiplied by 100.
--
-- IMPORTANT:
-- - Take a DB backup before running.
-- - Review the "candidates" query output before executing the UPDATE.
-- - Run in a maintenance window.

BEGIN;

-- 1) Inspect candidates (sample)
SELECT
  o."id"              AS order_id,
  o."totalAmount"     AS order_total_amount,
  p."amount"          AS payment_amount_paise,
  p."status"          AS payment_status,
  o."createdAt"       AS order_created_at
FROM "Order" o
JOIN "Payment" p ON p."orderId" = o."id"
WHERE
  p."currency" = 'INR'
  AND p."amount" IS NOT NULL
  AND o."totalAmount" = ROUND(p."amount" / 100.0)::INT
ORDER BY o."createdAt" DESC
LIMIT 100;

-- 2) Apply update (review WHERE first!)
-- This updates only orders that match the heuristic exactly.
UPDATE "Order" o
SET "totalAmount" = o."totalAmount" * 100
FROM "Payment" p
WHERE
  p."orderId" = o."id"
  AND p."currency" = 'INR'
  AND p."amount" IS NOT NULL
  AND o."totalAmount" = ROUND(p."amount" / 100.0)::INT;

COMMIT;

-- Post-check:
-- Re-run the candidates query above; it should return 0 rows.


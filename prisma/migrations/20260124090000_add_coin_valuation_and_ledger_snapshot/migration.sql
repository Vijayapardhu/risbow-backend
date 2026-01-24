-- Converted from manual_add_coin_valuation_and_ledger_snapshot.sql
-- RISBOW: Bow Coin Valuation (admin-controlled, future-only) + ledger snapshot fields
-- Money safety: all money values are integer paise. Valuation is stored as integer paise per 1 coin.
--
-- Notes:
-- - This repo historically used manual SQL migrations.
-- - Service layer must enforce: only one active valuation per role (effectiveTo IS NULL).

-- 1) Add snapshot fields to CoinLedger (audit-safe defaults for historical rows)
ALTER TABLE "CoinLedger"
  ADD COLUMN IF NOT EXISTS "paisePerCoinAtTxn" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "roleAtTxn" "UserRole" NOT NULL DEFAULT 'CUSTOMER';

CREATE INDEX IF NOT EXISTS "CoinLedger_roleAtTxn_createdAt_idx"
  ON "CoinLedger" ("roleAtTxn", "createdAt");

-- 2) Create CoinValuation table
CREATE TABLE IF NOT EXISTS "CoinValuation" (
  "id" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "paisePerCoin" INTEGER NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "setByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoinValuation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CoinValuation_role_effectiveTo_idx"
  ON "CoinValuation" ("role", "effectiveTo");

CREATE INDEX IF NOT EXISTS "CoinValuation_role_effectiveFrom_idx"
  ON "CoinValuation" ("role", "effectiveFrom");

-- Add FK idempotently (Postgres doesn't support ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CoinValuation_setByUserId_fkey') THEN
    ALTER TABLE "CoinValuation"
      ADD CONSTRAINT "CoinValuation_setByUserId_fkey"
      FOREIGN KEY ("setByUserId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

-- 3) Seed default valuation rows (idempotent)
-- If there's already an active valuation for a role, do nothing.
INSERT INTO "CoinValuation" ("id", "role", "paisePerCoin", "effectiveFrom", "effectiveTo", "setByUserId")
SELECT
  concat('seed_', role_val)::text,
  role_val::"UserRole",
  100,
  CURRENT_TIMESTAMP,
  NULL,
  (SELECT "id" FROM "User" WHERE "role" IN ('SUPER_ADMIN','ADMIN') ORDER BY "createdAt" ASC LIMIT 1)
FROM (VALUES ('CUSTOMER'), ('VENDOR'), ('WHOLESALER')) AS roles(role_val)
WHERE NOT EXISTS (
  SELECT 1 FROM "CoinValuation" cv
  WHERE cv."role" = role_val::"UserRole" AND cv."effectiveTo" IS NULL
);


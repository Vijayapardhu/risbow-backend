-- Referral reward slabs (admin-managed) + immutable grant records (safe/idempotent)

CREATE TABLE IF NOT EXISTS "ReferralRewardRule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "minOrderPaise" INT NOT NULL,
  "maxOrderPaise" INT,
  "coinsInviter" INT NOT NULL,
  "coinsInvitee" INT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "effectiveTo" TIMESTAMPTZ,
  "setByAdminId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ReferralRewardGrant" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId" TEXT UNIQUE NOT NULL,
  "inviterUserId" TEXT NOT NULL,
  "inviteeUserId" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "orderValuePaiseAtAward" INT NOT NULL,
  "coinsInviterAtAward" INT NOT NULL,
  "coinsInviteeAtAward" INT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign keys (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralRewardRule_setByAdminId_fkey') THEN
    ALTER TABLE "ReferralRewardRule"
      ADD CONSTRAINT "ReferralRewardRule_setByAdminId_fkey"
      FOREIGN KEY ("setByAdminId") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralRewardGrant_orderId_fkey') THEN
    ALTER TABLE "ReferralRewardGrant"
      ADD CONSTRAINT "ReferralRewardGrant_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralRewardGrant_inviterUserId_fkey') THEN
    ALTER TABLE "ReferralRewardGrant"
      ADD CONSTRAINT "ReferralRewardGrant_inviterUserId_fkey"
      FOREIGN KEY ("inviterUserId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralRewardGrant_inviteeUserId_fkey') THEN
    ALTER TABLE "ReferralRewardGrant"
      ADD CONSTRAINT "ReferralRewardGrant_inviteeUserId_fkey"
      FOREIGN KEY ("inviteeUserId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralRewardGrant_ruleId_fkey') THEN
    ALTER TABLE "ReferralRewardGrant"
      ADD CONSTRAINT "ReferralRewardGrant_ruleId_fkey"
      FOREIGN KEY ("ruleId") REFERENCES "ReferralRewardRule"("id") ON DELETE RESTRICT;
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS "ReferralRewardRule_active_window_idx"
  ON "ReferralRewardRule" ("isActive", "effectiveFrom", "effectiveTo");
CREATE INDEX IF NOT EXISTS "ReferralRewardRule_min_idx" ON "ReferralRewardRule" ("minOrderPaise");
CREATE INDEX IF NOT EXISTS "ReferralRewardRule_max_idx" ON "ReferralRewardRule" ("maxOrderPaise");
CREATE INDEX IF NOT EXISTS "ReferralRewardRule_setByAdmin_idx" ON "ReferralRewardRule" ("setByAdminId");

CREATE INDEX IF NOT EXISTS "ReferralRewardGrant_inviter_idx" ON "ReferralRewardGrant" ("inviterUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReferralRewardGrant_invitee_idx" ON "ReferralRewardGrant" ("inviteeUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReferralRewardGrant_rule_idx" ON "ReferralRewardGrant" ("ruleId");

-- updatedAt trigger for ReferralRewardRule
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_referral_reward_rule') THEN
    CREATE OR REPLACE FUNCTION set_timestamp_referral_reward_rule()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW."updatedAt" = now();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;

    CREATE TRIGGER set_timestamp_referral_reward_rule
    BEFORE UPDATE ON "ReferralRewardRule"
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamp_referral_reward_rule();
  END IF;
END$$;


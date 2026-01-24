-- Converted from manual_add_user_device_tokens.sql
-- RISBOW: UserDevice tokens for push notifications (FCM)

CREATE TABLE IF NOT EXISTS "UserDevice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserDevice_token_key" ON "UserDevice" ("token");
CREATE INDEX IF NOT EXISTS "UserDevice_userId_isActive_idx" ON "UserDevice" ("userId", "isActive");
CREATE INDEX IF NOT EXISTS "UserDevice_lastSeenAt_idx" ON "UserDevice" ("lastSeenAt");

-- Add FK idempotently (Postgres doesn't support ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserDevice_userId_fkey') THEN
    ALTER TABLE "UserDevice"
      ADD CONSTRAINT "UserDevice_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;


-- Migration: Update PlatformConfig Schema
-- This migration updates the PlatformConfig table to add category, updatedById fields
-- and changes the unique constraint from key to (category, key)

-- Step 1: Add new columns
ALTER TABLE "PlatformConfig" 
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedById" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Step 2: Convert value column from TEXT to JSONB
-- First, make it nullable temporarily
ALTER TABLE "PlatformConfig" ALTER COLUMN "value" DROP NOT NULL;

-- Add a new temp column
ALTER TABLE "PlatformConfig" ADD COLUMN IF NOT EXISTS "value_json" JSONB;

-- Copy and convert existing string values to JSON strings
UPDATE "PlatformConfig" 
SET "value_json" = to_jsonb("value"::text)
WHERE "value" IS NOT NULL;

-- Drop old column and rename new one
ALTER TABLE "PlatformConfig" DROP COLUMN IF EXISTS "value";
ALTER TABLE "PlatformConfig" RENAME COLUMN "value_json" TO "value";

-- Step 3: Extract category from existing keys and populate category field
-- Keys like "general.siteName" → category="general", key="siteName"
-- Keys like "MAINTENANCE_MODE" → category="app", key="MAINTENANCE_MODE"

UPDATE "PlatformConfig"
SET 
  "category" = CASE 
    WHEN "key" LIKE '%.%' THEN split_part("key", '.', 1)
    ELSE 'app'
  END,
  "key" = CASE 
    WHEN "key" LIKE '%.%' THEN substring("key" from position('.' in "key") + 1)
    ELSE "key"
  END
WHERE "category" IS NULL;

-- Step 4: Set updatedById to 'system' for existing records
UPDATE "PlatformConfig"
SET "updatedById" = 'system'
WHERE "updatedById" IS NULL;

-- Step 5: Make new columns NOT NULL after populating
ALTER TABLE "PlatformConfig" 
  ALTER COLUMN "category" SET NOT NULL,
  ALTER COLUMN "updatedById" SET NOT NULL,
  ALTER COLUMN "value" SET NOT NULL;

-- Step 6: Drop old unique constraint on key if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlatformConfig_key_key') THEN
    ALTER TABLE "PlatformConfig" DROP CONSTRAINT "PlatformConfig_key_key";
  END IF;
END $$;

-- Step 7: Add new compound unique constraint
ALTER TABLE "PlatformConfig" 
  ADD CONSTRAINT "PlatformConfig_category_key_key" UNIQUE ("category", "key");

-- Step 8: Add index on category
CREATE INDEX IF NOT EXISTS "PlatformConfig_category_idx" ON "PlatformConfig"("category");

-- Migration complete

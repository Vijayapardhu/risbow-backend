-- Manual migration for Product Recommendations Engine
-- Run this SQL to create the new tables in your PostgreSQL database

-- Create UserInteractionType enum
DO $$ BEGIN
    CREATE TYPE "UserInteractionType" AS ENUM ('VIEW', 'ADD_TO_CART', 'PURCHASE', 'WISHLIST', 'REMOVE_FROM_CART');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create UserProductInteraction table
CREATE TABLE IF NOT EXISTS "UserProductInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "interactionType" "UserInteractionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "UserProductInteraction_pkey" PRIMARY KEY ("id")
);

-- Create ProductSimilarity table
CREATE TABLE IF NOT EXISTS "ProductSimilarity" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "similarProductId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "algorithm" TEXT NOT NULL DEFAULT 'content_based',

    CONSTRAINT "ProductSimilarity_pkey" PRIMARY KEY ("id")
);

-- Create indexes for UserProductInteraction
CREATE INDEX IF NOT EXISTS "UserProductInteraction_userId_productId_interactionType_idx" 
    ON "UserProductInteraction"("userId", "productId", "interactionType");

CREATE INDEX IF NOT EXISTS "UserProductInteraction_userId_createdAt_idx" 
    ON "UserProductInteraction"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "UserProductInteraction_productId_interactionType_idx" 
    ON "UserProductInteraction"("productId", "interactionType");

CREATE INDEX IF NOT EXISTS "UserProductInteraction_interactionType_createdAt_idx" 
    ON "UserProductInteraction"("interactionType", "createdAt");

-- Create indexes for ProductSimilarity
CREATE UNIQUE INDEX IF NOT EXISTS "ProductSimilarity_productId_similarProductId_algorithm_key" 
    ON "ProductSimilarity"("productId", "similarProductId", "algorithm");

CREATE INDEX IF NOT EXISTS "ProductSimilarity_productId_score_idx" 
    ON "ProductSimilarity"("productId", "score");

CREATE INDEX IF NOT EXISTS "ProductSimilarity_similarProductId_idx" 
    ON "ProductSimilarity"("similarProductId");

-- Add foreign key constraints
ALTER TABLE "UserProductInteraction" 
    ADD CONSTRAINT "UserProductInteraction_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserProductInteraction" 
    ADD CONSTRAINT "UserProductInteraction_productId_fkey" 
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductSimilarity" 
    ADD CONSTRAINT "ProductSimilarity_productId_fkey" 
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductSimilarity" 
    ADD CONSTRAINT "ProductSimilarity_similarProductId_fkey" 
    FOREIGN KEY ("similarProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- If using Supabase with RLS, enable RLS on new tables
ALTER TABLE "UserProductInteraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductSimilarity" ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your security requirements)
CREATE POLICY "Users can read their own interactions" 
    ON "UserProductInteraction" 
    FOR SELECT 
    USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert their own interactions" 
    ON "UserProductInteraction" 
    FOR INSERT 
    WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Anyone can read product similarities" 
    ON "ProductSimilarity" 
    FOR SELECT 
    USING (true);

-- For admin/system operations, you'll need additional policies or use service role

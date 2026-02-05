-- Migration: Add Product Variants Enhancements
-- Date: 2026-02-05
-- Description: Add missing fields to ProductVariant and hasVariants to Product

-- Add new columns to ProductVariant table
ALTER TABLE "ProductVariant" 
ADD COLUMN IF NOT EXISTS "name" TEXT,
ADD COLUMN IF NOT EXISTS "offerPrice" INTEGER,
ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add hasVariants to Product table
ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "hasVariants" BOOLEAN DEFAULT false NOT NULL;

-- Add index for isActive
CREATE INDEX IF NOT EXISTS "ProductVariant_isActive_idx" ON "ProductVariant"("isActive");

-- Add ON DELETE CASCADE to ProductVariant foreign key (if not already set)
-- Note: This requires dropping and recreating the constraint
DO $$
BEGIN
    -- Check if constraint exists without CASCADE
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ProductVariant_productId_fkey' 
        AND table_name = 'ProductVariant'
    ) THEN
        ALTER TABLE "ProductVariant" DROP CONSTRAINT "ProductVariant_productId_fkey";
        ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" 
            FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Update existing products with variants
UPDATE "Product" p
SET "hasVariants" = true
WHERE EXISTS (
    SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p."id"
);

-- Create trigger to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_product_variant_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_variant_timestamp ON "ProductVariant";
CREATE TRIGGER update_product_variant_timestamp
    BEFORE UPDATE ON "ProductVariant"
    FOR EACH ROW
    EXECUTE FUNCTION update_product_variant_updated_at();

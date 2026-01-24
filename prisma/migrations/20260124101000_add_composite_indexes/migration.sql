-- Performance indexes (composite)
-- Idempotent for safe `prisma migrate deploy` on already-upgraded DBs.

-- Orders: user order history + admin filtering by time
CREATE INDEX IF NOT EXISTS "Order_userId_status_createdAt_idx"
  ON "Order" ("userId", "status", "createdAt");

-- Products: vendor listing pages (active + in stock)
CREATE INDEX IF NOT EXISTS "Product_vendorId_isActive_stock_idx"
  ON "Product" ("vendorId", "isActive", "stock");


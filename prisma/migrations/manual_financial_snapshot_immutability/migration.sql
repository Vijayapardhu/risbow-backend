-- Migration: Financial Snapshot Immutability Protection
-- This migration documents the immutability constraint for OrderFinancialSnapshot
-- 
-- CONSTRAINT: OrderFinancialSnapshot records become IMMUTABLE once the associated
-- Order status moves beyond PENDING (i.e., when status is CONFIRMED, PAID, SHIPPED, etc.)
--
-- Enforcement:
-- 1. Application-level: FinancialSnapshotGuardService validates all modification attempts
-- 2. Service-level: All update operations check order.status before allowing changes
-- 3. Audit: All attempted violations are logged via AuditLog
--
-- This ensures financial integrity and prevents corruption of historical financial data.

-- Note: Prisma doesn't support CHECK constraints directly, so enforcement is at application level.
-- A database trigger could be added for additional protection, but application-level is preferred
-- for better error messages and audit logging.

COMMENT ON TABLE "OrderFinancialSnapshot" IS 'IMMUTABLE after order confirmation. Financial snapshot captures state at checkout and must never be modified once order status moves beyond PENDING. Protected by FinancialSnapshotGuardService.';

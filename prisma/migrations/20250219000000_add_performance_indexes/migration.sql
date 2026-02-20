-- Migration: Add performance indexes for slow queries
-- Generated: 2026-02-19
-- Purpose: Optimize frequently slow queries identified in audit

-- Campaign table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_status ON "Campaign"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_start_date ON "Campaign"(startDate);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_end_date ON "Campaign"(endDate);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_status_dates ON "Campaign"(status, startDate, endDate);

-- Room table indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_room_status ON "Room"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_room_expires_at ON "Room"(expiresAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_room_status_expires ON "Room"(status, expiresAt);

-- AdminSession table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_session_admin_id ON "AdminSession"(adminId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_session_token ON "AdminSession"(token);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_session_expires ON "AdminSession"(expiresAt);

-- Order table indexes (for POS queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_agent_id ON "Order"(agentId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_status ON "Order"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_created_at ON "Order"(createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_agent_status ON "Order"(agentId, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_status_created ON "Order"(status, createdAt);

-- Payment table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_status ON "Payment"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_provider ON "Payment"(provider);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_created_at ON "Payment"(createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_status_created ON "Payment"(status, createdAt);

-- Product table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_vendor_id ON "Product"(vendorId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_stock ON "Product"(stock);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_status ON "Product"(status);

-- OrderItem table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_item_product_id ON "OrderItem"(productId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_item_order_id ON "OrderItem"(orderId);

-- User table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role ON "User"(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_status ON "User"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_mobile ON "User"(mobile);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email ON "User"(email);

-- BannerCampaign table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_banner_campaign_status ON "BannerCampaign"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_banner_campaign_start_date ON "BannerCampaign"(startDate);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_banner_campaign_end_date ON "BannerCampaign"(endDate);

-- AbandonedCheckout table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_abandoned_checkout_status ON "AbandonedCheckout"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_abandoned_checkout_created ON "AbandonedCheckout"(createdAt);

-- Notifications (if using notification table)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_user_id ON "Notification"(userId);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_read ON "Notification"(read);

-- Add comments for documentation
COMMENT ON INDEX idx_campaign_status IS 'Optimizes Campaign.findMany queries filtered by status';
COMMENT ON INDEX idx_room_status_expires IS 'Optimizes Room.updateMany queries for expired room cleanup';
COMMENT ON INDEX idx_admin_session_admin_id IS 'Optimizes AdminSession lookups during authentication';
COMMENT ON INDEX idx_order_agent_status IS 'Optimizes POS order queries';
COMMENT ON INDEX idx_product_stock IS 'Optimizes low-stock inventory queries';

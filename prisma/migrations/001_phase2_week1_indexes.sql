-- Create all indexes for Phase 2 Week 1 Rooms optimization

-- Room indexes for performance
CREATE INDEX IF NOT EXISTS "idx_room_status_created" ON "Room"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_room_endat_status" ON "Room"("endAt", "status");
CREATE INDEX IF NOT EXISTS "idx_room_createdby" ON "Room"("createdById");

-- RoomMember indexes for atomic operations
CREATE INDEX IF NOT EXISTS "idx_roommember_roomid_status" ON "RoomMember"("roomId", "status");
CREATE INDEX IF NOT EXISTS "idx_roommember_userid" ON "RoomMember"("userId");

-- Order indexes for room validation and analytics
CREATE INDEX IF NOT EXISTS "idx_order_roomid_status" ON "Order"("roomId", "status");
CREATE INDEX IF NOT EXISTS "idx_order_userid_created" ON "Order"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_order_roomid_userid" ON "Order"("roomId", "userId");

-- BowInteraction indexes for performance
CREATE INDEX IF NOT EXISTS "idx_bowinteraction_userid_created" ON "BowInteraction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_bowinteraction_sessionid" ON "BowInteraction"("sessionId");
CREATE INDEX IF NOT EXISTS "idx_bowinteraction_type" ON "BowInteraction"("type");

-- AuditLog indexes for room activity tracking
CREATE INDEX IF NOT EXISTS "idx_auditlog_entity_created" ON "AuditLog"("entity", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_auditlog_room_activity" ON "AuditLog"("entity", "action") WHERE "entity" = 'RoomActivity';

-- WeeklyOffer indexes for room creation
CREATE INDEX IF NOT EXISTS "idx_weeklyoffer_active_end" ON "WeeklyOffer"("isActive", "endAt");
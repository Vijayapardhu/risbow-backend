-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "memberCount" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "BowInteraction_sessionId_createdAt_idx" ON "BowInteraction"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_roomId_userId_idx" ON "Order"("roomId", "userId");

-- CreateIndex
CREATE INDEX "Room_status_endAt_idx" ON "Room"("status", "endAt");

-- CreateIndex
CREATE INDEX "Room_createdById_idx" ON "Room"("createdById");

-- CreateIndex
CREATE INDEX "RoomMember_userId_idx" ON "RoomMember"("userId");

-- CreateEnum
CREATE TYPE "RoomBoostType" AS ENUM ('PRIORITY_VISIBILITY', 'UNLOCK_ACCELERATOR', 'SPONSORED_PRODUCT');

-- AlterEnum
ALTER TYPE "BowActionType" ADD VALUE 'ROOM_NUDGE';

-- CreateTable
CREATE TABLE "RoomBoost" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "vendorId" TEXT,
    "type" "RoomBoostType" NOT NULL,
    "coinsCost" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomBoost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomInsight" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomBoost_roomId_idx" ON "RoomBoost"("roomId");

-- CreateIndex
CREATE INDEX "RoomBoost_type_isActive_idx" ON "RoomBoost"("type", "isActive");

-- CreateIndex
CREATE INDEX "RoomBoost_startAt_endAt_idx" ON "RoomBoost"("startAt", "endAt");

-- CreateIndex
CREATE INDEX "RoomInsight_roomId_idx" ON "RoomInsight"("roomId");

-- CreateIndex
CREATE INDEX "RoomInsight_metric_idx" ON "RoomInsight"("metric");

-- AddForeignKey
ALTER TABLE "RoomBoost" ADD CONSTRAINT "RoomBoost_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomInsight" ADD CONSTRAINT "RoomInsight_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

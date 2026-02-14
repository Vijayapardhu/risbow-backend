-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'ARRIVED';

-- CreateTable
CREATE TABLE "OrderArrivalProof" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "videoPath" TEXT NOT NULL,
    "videoMime" TEXT,
    "videoSizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderArrivalProof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderArrivalProof_orderId_key" ON "OrderArrivalProof"("orderId");

-- CreateIndex
CREATE INDEX "OrderArrivalProof_createdAt_idx" ON "OrderArrivalProof"("createdAt");

-- CreateIndex
CREATE INDEX "OrderArrivalProof_vendorId_idx" ON "OrderArrivalProof"("vendorId");

-- AddForeignKey
ALTER TABLE "OrderArrivalProof" ADD CONSTRAINT "OrderArrivalProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderArrivalProof" ADD CONSTRAINT "OrderArrivalProof_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderArrivalProof" ADD CONSTRAINT "OrderArrivalProof_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "abandonedCheckoutId" TEXT,
ADD COLUMN     "agentId" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_abandonedCheckoutId_fkey" FOREIGN KEY ("abandonedCheckoutId") REFERENCES "AbandonedCheckout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

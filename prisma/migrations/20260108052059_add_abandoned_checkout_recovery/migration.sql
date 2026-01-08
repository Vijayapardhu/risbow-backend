-- CreateEnum
CREATE TYPE "CheckoutRecoveryStatus" AS ENUM ('NEW', 'ASSIGNED', 'FOLLOW_UP', 'CONVERTED', 'DROPPED');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('NOT_REACHABLE', 'FOLLOW_UP_SCHEDULED', 'CONVERTED', 'DROPPED', 'WRONG_NUMBER');

-- CreateTable
CREATE TABLE "AbandonedCheckout" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestInfo" JSONB,
    "cartSnapshot" JSONB NOT NULL,
    "financeSnapshot" JSONB NOT NULL,
    "metadata" JSONB,
    "status" "CheckoutRecoveryStatus" NOT NULL DEFAULT 'NEW',
    "agentId" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "abandonedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbandonedCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutFollowup" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "outcome" "CallOutcome",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutFollowup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AbandonedCheckout" ADD CONSTRAINT "AbandonedCheckout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbandonedCheckout" ADD CONSTRAINT "AbandonedCheckout_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutFollowup" ADD CONSTRAINT "CheckoutFollowup_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "AbandonedCheckout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutFollowup" ADD CONSTRAINT "CheckoutFollowup_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

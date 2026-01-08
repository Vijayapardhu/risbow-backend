-- AlterTable
ALTER TABLE "User" ADD COLUMN     "forceLogoutAt" TIMESTAMP(3),
ADD COLUMN     "kycDocuments" JSONB,
ADD COLUMN     "kycStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
ADD COLUMN     "miscDocuments" JSONB;

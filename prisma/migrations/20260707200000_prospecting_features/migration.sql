-- CreateEnum
CREATE TYPE "ImportSourceType" AS ENUM ('COMPETITOR_CUSTOMERS', 'DIRECTORY', 'OTHER');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('EMAIL', 'SMS', 'LINKEDIN');

-- CreateEnum
CREATE TYPE "SentimentTier" AS ENUM ('HOT', 'WARM', 'NEUTRAL', 'COLD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'ACCOUNT_SOURCED';
ALTER TYPE "ActivityType" ADD VALUE 'BULK_IMPORTED';
ALTER TYPE "ActivityType" ADD VALUE 'SCORING_RECALIBRATED';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "apolloOrgId" TEXT,
ADD COLUMN     "hiringSignalCheckedAt" TIMESTAMP(3),
ADD COLUMN     "hiringSignalDetail" TEXT,
ADD COLUMN     "hiringSignalDetected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "importBatchId" TEXT;

-- AlterTable
ALTER TABLE "OutreachMessage" ADD COLUMN     "channel" "MessageChannel" NOT NULL DEFAULT 'EMAIL';

-- AlterTable
ALTER TABLE "Reply" ADD COLUMN     "sentimentSource" TEXT,
ADD COLUMN     "sentimentTier" "SentimentTier";

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sourceType" "ImportSourceType" NOT NULL DEFAULT 'OTHER',
    "importedById" TEXT,
    "rowsTotal" INTEGER NOT NULL DEFAULT 0,
    "rowsCreated" INTEGER NOT NULL DEFAULT 0,
    "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringAdjustmentLog" (
    "id" TEXT NOT NULL,
    "previousWeights" JSONB NOT NULL,
    "newWeights" JSONB NOT NULL,
    "wonSampleSize" INTEGER NOT NULL,
    "lostSampleSize" INTEGER NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringAdjustmentLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringAdjustmentLog" ADD CONSTRAINT "ScoringAdjustmentLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


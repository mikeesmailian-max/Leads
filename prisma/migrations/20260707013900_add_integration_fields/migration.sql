-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'ACCOUNT_ENRICHED';
ALTER TYPE "ActivityType" ADD VALUE 'INBOX_INGESTED';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "lastEnrichedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "enrichedAt" TIMESTAMP(3),
ADD COLUMN     "enrichmentSource" TEXT,
ADD COLUMN     "isDecisionMaker" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OutreachMessage" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "messageId" TEXT;

-- AlterTable
ALTER TABLE "Reply" ADD COLUMN     "externalMessageId" TEXT,
ADD COLUMN     "fromEmail" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Reply_externalMessageId_key" ON "Reply"("externalMessageId");

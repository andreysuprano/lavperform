-- CreateEnum
CREATE TYPE "AudienceTargetingMode" AS ENUM ('RFV', 'AUDIENCE');

-- CreateTable
CREATE TABLE "Audience" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Audience_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "targetingMode" "AudienceTargetingMode" NOT NULL DEFAULT 'RFV';
ALTER TABLE "Campaign" ADD COLUMN "audienceId" TEXT;

-- AlterTable
ALTER TABLE "AutomaticCampaign" ADD COLUMN "targetingMode" "AudienceTargetingMode" NOT NULL DEFAULT 'RFV';
ALTER TABLE "AutomaticCampaign" ADD COLUMN "audienceId" TEXT;

-- CreateIndex
CREATE INDEX "Audience_companyId_idx" ON "Audience"("companyId");
CREATE INDEX "Audience_companyId_deletedAt_idx" ON "Audience"("companyId", "deletedAt");
CREATE INDEX "Campaign_audienceId_idx" ON "Campaign"("audienceId");
CREATE INDEX "AutomaticCampaign_audienceId_idx" ON "AutomaticCampaign"("audienceId");
CREATE INDEX "Address_neighborhood_idx" ON "Address"("neighborhood");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt" DESC);
CREATE INDEX "OrderItem_name_idx" ON "OrderItem"("name");

-- AddForeignKey
ALTER TABLE "Audience" ADD CONSTRAINT "Audience_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AutomaticCampaign" ADD CONSTRAINT "AutomaticCampaign_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE SET NULL ON UPDATE CASCADE;

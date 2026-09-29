CREATE TYPE "AutomaticCampaignSendMode" AS ENUM ('COVER_BATCH', 'CONTINUOUS');

ALTER TABLE "AutomaticCampaign"
  ADD COLUMN "sendMode" "AutomaticCampaignSendMode" NOT NULL DEFAULT 'COVER_BATCH',
  ADD COLUMN "batchSnapshottedAt" TIMESTAMP(3);

CREATE TABLE "AutomaticCampaignBatchRecipient" (
  "id" TEXT NOT NULL,
  "automaticCampaignId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomaticCampaignBatchRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomaticCampaignBatchRecipient_automaticCampaignId_customerId_key"
  ON "AutomaticCampaignBatchRecipient"("automaticCampaignId", "customerId");

CREATE INDEX "AutomaticCampaignBatchRecipient_automaticCampaignId_idx"
  ON "AutomaticCampaignBatchRecipient"("automaticCampaignId");

ALTER TABLE "AutomaticCampaignBatchRecipient"
  ADD CONSTRAINT "AutomaticCampaignBatchRecipient_automaticCampaignId_fkey"
  FOREIGN KEY ("automaticCampaignId") REFERENCES "AutomaticCampaign"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

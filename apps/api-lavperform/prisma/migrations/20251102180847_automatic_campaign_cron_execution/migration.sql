-- AlterTable
ALTER TABLE "public"."AutomaticCampaign" ADD COLUMN     "lastProcessedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."cron_automatic_campaign" (
    "id" TEXT NOT NULL,
    "automaticCampaignId" TEXT NOT NULL,
    "messagesGenerated" INTEGER NOT NULL DEFAULT 0,
    "consumersFound" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cron_automatic_campaign_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."cron_automatic_campaign" ADD CONSTRAINT "cron_automatic_campaign_automaticCampaignId_fkey" FOREIGN KEY ("automaticCampaignId") REFERENCES "public"."AutomaticCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

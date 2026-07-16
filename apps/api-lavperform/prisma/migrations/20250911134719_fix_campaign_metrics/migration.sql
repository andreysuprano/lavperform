-- DropForeignKey
ALTER TABLE "public"."CampaignMetric" DROP CONSTRAINT "CampaignMetric_automaticCampaignId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CampaignMetric" DROP CONSTRAINT "CampaignMetric_campaignId_fkey";

-- DropIndex
DROP INDEX "public"."CampaignMetric_campaignId_idx";

-- AlterTable
ALTER TABLE "public"."CampaignMetric" ALTER COLUMN "campaignId" DROP NOT NULL,
ALTER COLUMN "automaticCampaignId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "CampaignMetric_campaignId_automaticCampaignId_idx" ON "public"."CampaignMetric"("campaignId", "automaticCampaignId");

-- AddForeignKey
ALTER TABLE "public"."CampaignMetric" ADD CONSTRAINT "CampaignMetric_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignMetric" ADD CONSTRAINT "CampaignMetric_automaticCampaignId_fkey" FOREIGN KEY ("automaticCampaignId") REFERENCES "public"."AutomaticCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

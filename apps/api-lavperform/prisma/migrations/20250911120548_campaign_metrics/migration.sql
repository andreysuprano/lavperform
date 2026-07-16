-- CreateTable
CREATE TABLE "public"."CampaignMetric" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "automaticCampaignId" TEXT NOT NULL,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "messagesDelivered" INTEGER NOT NULL DEFAULT 0,
    "messagesRead" INTEGER NOT NULL DEFAULT 0,
    "messagesError" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "salesTotalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "salesTotalQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totalCustomers" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CampaignMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignMetric_campaignId_idx" ON "public"."CampaignMetric"("campaignId");

-- AddForeignKey
ALTER TABLE "public"."CampaignMetric" ADD CONSTRAINT "CampaignMetric_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignMetric" ADD CONSTRAINT "CampaignMetric_automaticCampaignId_fkey" FOREIGN KEY ("automaticCampaignId") REFERENCES "public"."AutomaticCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

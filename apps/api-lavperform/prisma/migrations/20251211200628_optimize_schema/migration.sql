/*
  Warnings:

  - A unique constraint covering the columns `[companyId,planId]` on the table `CompanySubscription` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `ConfirmationCode` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CampaignMetric_campaignId_automaticCampaignId_idx";

-- DropIndex
DROP INDEX "ConfirmationCode_code_idx";

-- CreateIndex
CREATE INDEX "Campaign_companyId_scheduledDate_idx" ON "Campaign"("companyId", "scheduledDate");

-- CreateIndex
CREATE INDEX "CampaignMetric_campaignId_idx" ON "CampaignMetric"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignMetric_automaticCampaignId_idx" ON "CampaignMetric"("automaticCampaignId");

-- CreateIndex
CREATE INDEX "Company_businessPartnerId_idx" ON "Company"("businessPartnerId");

-- CreateIndex
CREATE INDEX "CompanySubscription_companyId_idx" ON "CompanySubscription"("companyId");

-- CreateIndex
CREATE INDEX "CompanySubscription_planId_idx" ON "CompanySubscription"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySubscription_companyId_planId_key" ON "CompanySubscription"("companyId", "planId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfirmationCode_code_key" ON "ConfirmationCode"("code");

-- CreateIndex
CREATE INDEX "Order_companyId_createdAt_idx" ON "Order"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_companyId_integratorOrderId_idx" ON "Order"("companyId", "integratorOrderId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "WebhookReceived_companyId_createdAt_idx" ON "WebhookReceived"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookReceived_partnerId_createdAt_idx" ON "WebhookReceived"("partnerId", "createdAt");

-- CreateEnum
CREATE TYPE "MetaTemplateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISABLED', 'PAUSED', 'IN_APPEAL', 'DELETED', 'ERROR');

-- CreateEnum
CREATE TYPE "MetaTemplateCategory" AS ENUM ('AUTHENTICATION', 'MARKETING', 'UTILITY');

-- CreateTable
CREATE TABLE "meta_message_templates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "automaticCampaignCreativeId" TEXT,
    "metaTemplateId" TEXT,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'pt_BR',
    "category" "MetaTemplateCategory" NOT NULL DEFAULT 'MARKETING',
    "components" JSONB NOT NULL,
    "status" "MetaTemplateStatus" NOT NULL DEFAULT 'PENDING',
    "rejectedReason" TEXT,
    "qualityScore" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_message_templates_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "metaMessageTemplateId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "meta_message_templates_automaticCampaignCreativeId_key" ON "meta_message_templates"("automaticCampaignCreativeId");

-- CreateIndex
CREATE INDEX "meta_message_templates_companyId_idx" ON "meta_message_templates"("companyId");

-- CreateIndex
CREATE INDEX "meta_message_templates_metaTemplateId_idx" ON "meta_message_templates"("metaTemplateId");

-- CreateIndex
CREATE INDEX "Message_metaMessageTemplateId_idx" ON "Message"("metaMessageTemplateId");

-- AddForeignKey
ALTER TABLE "meta_message_templates" ADD CONSTRAINT "meta_message_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_message_templates" ADD CONSTRAINT "meta_message_templates_automaticCampaignCreativeId_fkey" FOREIGN KEY ("automaticCampaignCreativeId") REFERENCES "AutomaticCampaignCreative"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_metaMessageTemplateId_fkey" FOREIGN KEY ("metaMessageTemplateId") REFERENCES "meta_message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

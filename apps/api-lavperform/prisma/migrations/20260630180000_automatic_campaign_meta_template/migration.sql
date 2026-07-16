-- AlterTable
ALTER TABLE "AutomaticCampaign" ADD COLUMN "metaMessageTemplateId" TEXT;
ALTER TABLE "AutomaticCampaign" ADD COLUMN "metaTemplateVariableMappings" JSONB;

-- CreateIndex
CREATE INDEX "AutomaticCampaign_metaMessageTemplateId_idx" ON "AutomaticCampaign"("metaMessageTemplateId");

-- AddForeignKey
ALTER TABLE "AutomaticCampaign" ADD CONSTRAINT "AutomaticCampaign_metaMessageTemplateId_fkey" FOREIGN KEY ("metaMessageTemplateId") REFERENCES "meta_message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

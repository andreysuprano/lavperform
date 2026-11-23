-- Variáveis nomeadas de template, pausa por reclassificação e pendência de pagamento da Meta.

ALTER TABLE "meta_message_templates" ADD COLUMN "variableBindings" JSONB;

ALTER TABLE "AutomaticCampaign" ADD COLUMN "metaCategoryHoldAt" TIMESTAMP(3);

ALTER TABLE "meta_integrations" ADD COLUMN "metaPaymentIssueAt" TIMESTAMP(3);
ALTER TABLE "meta_integrations" ADD COLUMN "metaPaymentIssueCode" INTEGER;
ALTER TABLE "meta_integrations" ADD COLUMN "metaPaymentIssueMessage" TEXT;

ALTER TABLE "Message" ADD COLUMN "sentAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "externalProviderMessageId" TEXT;

CREATE INDEX "Message_externalProviderMessageId_idx" ON "Message"("externalProviderMessageId");

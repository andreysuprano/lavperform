-- Backfill do canal das mensagens de campanhas automáticas.
-- A estratégia da API Oficial (WhatsApp Business API) criava mensagens sem
-- definir "channel", que caíam no default WHATSAPP_WEB (custo 0). Isso zerava
-- custo, ROI e custo por venda no histórico. Aqui recuperamos o canal real a
-- partir do canal configurado na própria campanha automática.
UPDATE "Message" m
SET "channel" = ac."channel"
FROM "AutomaticCampaign" ac
WHERE m."automaticCampaignId" = ac."id"
  AND m."channel" = 'WHATSAPP_WEB'
  AND ac."channel" <> 'WHATSAPP_WEB';

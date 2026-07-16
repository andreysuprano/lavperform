-- AddColumn: channel to Campaign (default WHATSAPP_WEB)
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "channel" "CampaignChannel" NOT NULL DEFAULT 'WHATSAPP_WEB';

-- AddColumn: channel to Message (default WHATSAPP_WEB)
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "channel" "CampaignChannel" NOT NULL DEFAULT 'WHATSAPP_WEB';

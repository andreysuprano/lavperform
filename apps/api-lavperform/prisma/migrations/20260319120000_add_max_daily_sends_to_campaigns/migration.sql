-- Add max daily sends per campaign with default fallback.
ALTER TABLE "Campaign"
ADD COLUMN IF NOT EXISTS "maxDailySends" INTEGER NOT NULL DEFAULT 50;

ALTER TABLE "AutomaticCampaign"
ADD COLUMN IF NOT EXISTS "maxDailySends" INTEGER NOT NULL DEFAULT 50;

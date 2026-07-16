-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM (
    'WHATSAPP_WEB',
    'WHATSAPP_BUSINESS_API',
    'SMS',
    'RCS',
    'EMAIL',
    'PUSH_NOTIFICATION'
);

-- CreateEnum
CREATE TYPE "AutomaticCampaignStatus" AS ENUM (
    'PROCESSING',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED'
);

-- AlterTable: AutomaticCampaign add channel, status and couponId
ALTER TABLE "AutomaticCampaign"
ADD COLUMN "channel" "CampaignChannel" NOT NULL DEFAULT 'WHATSAPP_WEB',
ADD COLUMN "status" "AutomaticCampaignStatus" NOT NULL DEFAULT 'PROCESSING',
ADD COLUMN "couponId" TEXT;

-- Backfill existing campaigns: já existem em produção então já foram processadas pelo menos uma vez
UPDATE "AutomaticCampaign"
SET "status" = 'IN_PROGRESS';

-- Campanhas com endDate já vencido viram COMPLETED + inativas
UPDATE "AutomaticCampaign"
SET "status" = 'COMPLETED',
    "active" = false
WHERE "endDate" IS NOT NULL
  AND "endDate" < NOW();

-- CreateIndex
CREATE INDEX "AutomaticCampaign_couponId_idx" ON "AutomaticCampaign"("couponId");

-- AddForeignKey
ALTER TABLE "AutomaticCampaign"
ADD CONSTRAINT "AutomaticCampaign_couponId_fkey"
FOREIGN KEY ("couponId") REFERENCES "coupons"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: AutomaticCampaignCreative
CREATE TABLE "AutomaticCampaignCreative" (
    "id" TEXT NOT NULL,
    "automaticCampaignId" TEXT NOT NULL,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomaticCampaignCreative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomaticCampaignCreative_automaticCampaignId_idx" ON "AutomaticCampaignCreative"("automaticCampaignId");

-- AddForeignKey
ALTER TABLE "AutomaticCampaignCreative"
ADD CONSTRAINT "AutomaticCampaignCreative_automaticCampaignId_fkey"
FOREIGN KEY ("automaticCampaignId") REFERENCES "AutomaticCampaign"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Message adds redirectUrl and couponCode
ALTER TABLE "Message"
ADD COLUMN "redirectUrl" TEXT,
ADD COLUMN "couponCode" TEXT;

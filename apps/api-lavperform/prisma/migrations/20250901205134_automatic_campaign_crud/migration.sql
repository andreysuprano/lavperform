-- CreateEnum
CREATE TYPE "public"."AutomaticCampaignType" AS ENUM ('ACQUISITION', 'RECURRENCE', 'REACTIVATION');

-- AlterTable
ALTER TABLE "public"."Message" ADD COLUMN     "automaticCampaignId" TEXT;

-- CreateTable
CREATE TABLE "public"."AutomaticCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."AutomaticCampaignType" NOT NULL,
    "companyId" TEXT NOT NULL,
    "segmentation" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "images" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "messageText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AutomaticCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Gift" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "automaticCampaignId" TEXT NOT NULL,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomaticCampaign_companyId_idx" ON "public"."AutomaticCampaign"("companyId");

-- CreateIndex
CREATE INDEX "Gift_automaticCampaignId_idx" ON "public"."Gift"("automaticCampaignId");

-- AddForeignKey
ALTER TABLE "public"."AutomaticCampaign" ADD CONSTRAINT "AutomaticCampaign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Gift" ADD CONSTRAINT "Gift_automaticCampaignId_fkey" FOREIGN KEY ("automaticCampaignId") REFERENCES "public"."AutomaticCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_automaticCampaignId_fkey" FOREIGN KEY ("automaticCampaignId") REFERENCES "public"."AutomaticCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

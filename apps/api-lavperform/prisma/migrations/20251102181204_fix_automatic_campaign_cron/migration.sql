/*
  Warnings:

  - You are about to drop the column `automaticCampaignId` on the `cron_automatic_campaign` table. All the data in the column will be lost.
  - You are about to drop the column `consumersFound` on the `cron_automatic_campaign` table. All the data in the column will be lost.
  - You are about to drop the column `messagesGenerated` on the `cron_automatic_campaign` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."cron_automatic_campaign" DROP CONSTRAINT "cron_automatic_campaign_automaticCampaignId_fkey";

-- AlterTable
ALTER TABLE "public"."cron_automatic_campaign" DROP COLUMN "automaticCampaignId",
DROP COLUMN "consumersFound",
DROP COLUMN "messagesGenerated",
ADD COLUMN     "campaignsFound" INTEGER NOT NULL DEFAULT 0;

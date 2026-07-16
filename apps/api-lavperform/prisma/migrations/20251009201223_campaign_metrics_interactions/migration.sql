/*
  Warnings:

  - You are about to drop the column `messagesRead` on the `CampaignMetric` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."CampaignMetric" DROP COLUMN "messagesRead",
ADD COLUMN     "interactions" INTEGER NOT NULL DEFAULT 0;

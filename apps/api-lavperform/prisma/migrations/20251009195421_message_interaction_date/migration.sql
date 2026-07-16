/*
  Warnings:

  - You are about to drop the column `interaction` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `sale` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Message" DROP COLUMN "interaction",
DROP COLUMN "sale",
ADD COLUMN     "interactionAt" TIMESTAMP(3);

/*
  Warnings:

  - You are about to drop the column `whatsappMessage` on the `Link` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Link" DROP COLUMN "whatsappMessage";

-- AlterTable
ALTER TABLE "public"."LinkPage" ADD COLUMN     "whatsappMessage" TEXT DEFAULT 'Olá, tudo bem?';

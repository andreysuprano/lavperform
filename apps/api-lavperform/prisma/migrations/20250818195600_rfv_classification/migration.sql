/*
  Warnings:

  - A unique constraint covering the columns `[companyId]` on the table `WhatsappInstance` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "WhatsappInstance_companyId_idx";

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "rfvClassification" SET DEFAULT 'Não Classificado';

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappInstance_companyId_key" ON "WhatsappInstance"("companyId");

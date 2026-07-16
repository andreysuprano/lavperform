/*
  Warnings:

  - A unique constraint covering the columns `[customDomain]` on the table `landing_pages` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "landing_pages" ADD COLUMN     "customDomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_customDomain_key" ON "landing_pages"("customDomain");

-- CreateIndex
CREATE INDEX "landing_pages_customDomain_idx" ON "landing_pages"("customDomain");

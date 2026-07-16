-- AlterTable
ALTER TABLE "Partner" ADD COLUMN "partnerSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Partner_partnerSlug_key" ON "Partner"("partnerSlug");

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Company_deletedAt_idx" ON "Company"("deletedAt");

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "overAgentCompanyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Company_overAgentCompanyId_key" ON "Company"("overAgentCompanyId");

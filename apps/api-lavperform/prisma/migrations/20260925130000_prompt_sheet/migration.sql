-- CreateTable
CREATE TABLE "PromptSheet" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "draftKey" TEXT NOT NULL DEFAULT 'draft',
    "serviceModel" "CompanyServiceModel" NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptSheet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromptSheet_companyId_idx" ON "PromptSheet"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptSheet_companyId_draftKey_key" ON "PromptSheet"("companyId", "draftKey");

-- AddForeignKey
ALTER TABLE "PromptSheet" ADD CONSTRAINT "PromptSheet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

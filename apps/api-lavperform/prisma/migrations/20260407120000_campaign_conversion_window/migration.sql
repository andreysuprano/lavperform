-- CreateTable
CREATE TABLE "campaign_conversion_window" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rfvClassification" TEXT NOT NULL,
    "thresholdDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_conversion_window_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_conversion_window_companyId_rfvClassification_key" ON "campaign_conversion_window"("companyId", "rfvClassification");

-- CreateIndex
CREATE INDEX "campaign_conversion_window_companyId_idx" ON "campaign_conversion_window"("companyId");

-- AddForeignKey
ALTER TABLE "campaign_conversion_window" ADD CONSTRAINT "campaign_conversion_window_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "rfvConfigurationId" TEXT;

-- AlterTable  
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "rfvHistoryId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "customer_rfv_history" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "recencyScore" INTEGER NOT NULL,
    "frequencyScore" INTEGER NOT NULL,
    "monetaryScore" INTEGER NOT NULL,
    "rfvSegment" TEXT NOT NULL,
    "daysSinceLastOrder" INTEGER,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(10,2) NOT NULL,
    "averageTicket" DECIMAL(10,2) NOT NULL,
    "analysisStartDate" TIMESTAMP(3) NOT NULL,
    "analysisEndDate" TIMESTAMP(3) NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_rfv_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "rfv_configuration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "recencyPeriodDays" INTEGER NOT NULL DEFAULT 365,
    "frequencyPeriodDays" INTEGER NOT NULL DEFAULT 365,
    "monetaryPeriodDays" INTEGER NOT NULL DEFAULT 365,
    "recencyThresholds" JSONB NOT NULL,
    "frequencyThresholds" JSONB NOT NULL,
    "monetaryThresholds" JSONB NOT NULL,
    "autoRecalculate" BOOLEAN NOT NULL DEFAULT true,
    "recalculateFrequency" TEXT NOT NULL DEFAULT 'daily',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfv_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customer_rfv_history_customerId_idx" ON "customer_rfv_history"("customerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customer_rfv_history_customerId_calculatedAt_idx" ON "customer_rfv_history"("customerId", "calculatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customer_rfv_history_rfvSegment_idx" ON "customer_rfv_history"("rfvSegment");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "rfv_configuration_companyId_key" ON "rfv_configuration"("companyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rfv_configuration_companyId_idx" ON "rfv_configuration"("companyId");

-- AddForeignKey
ALTER TABLE "customer_rfv_history" ADD CONSTRAINT "customer_rfv_history_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfv_configuration" ADD CONSTRAINT "rfv_configuration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

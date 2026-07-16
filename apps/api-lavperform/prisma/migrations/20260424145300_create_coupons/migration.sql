-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coupons_companyId_idx" ON "coupons"("companyId");

-- CreateIndex
CREATE INDEX "coupons_companyId_active_idx" ON "coupons"("companyId", "active");

-- CreateIndex
CREATE INDEX "coupons_companyId_validUntil_idx" ON "coupons"("companyId", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_companyId_code_key" ON "coupons"("companyId", "code");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

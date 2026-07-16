-- AlterTable
ALTER TABLE "credit_ledger_entries" ADD COLUMN "defaultProductId" TEXT;

-- CreateTable
CREATE TABLE "default_credit_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "default_credit_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "default_credit_products_code_key" ON "default_credit_products"("code");

-- CreateIndex
CREATE INDEX "default_credit_products_active_idx" ON "default_credit_products"("active");

-- CreateIndex
CREATE INDEX "default_credit_products_deletedAt_idx" ON "default_credit_products"("deletedAt");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_defaultProductId_idx" ON "credit_ledger_entries"("defaultProductId");

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_defaultProductId_fkey" FOREIGN KEY ("defaultProductId") REFERENCES "default_credit_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

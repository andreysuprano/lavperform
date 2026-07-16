-- CreateEnum
CREATE TYPE "CreditPaymentMethod" AS ENUM ('PIX', 'CREDIT_CARD', 'DEBIT_CARD');

-- CreateEnum
CREATE TYPE "CreditTopupStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CreditLedgerEntryType" AS ENUM ('TOPUP', 'CONSUMPTION');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "asaasCustomerId" TEXT;

-- CreateTable
CREATE TABLE "company_credit_wallets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_credit_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_products" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "credit_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_topups" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "paymentMethod" "CreditPaymentMethod" NOT NULL,
    "status" "CreditTopupStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "asaasChargeId" TEXT,
    "paidAt" TIMESTAMP(3),
    "rawPaymentPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_topups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledger_entries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "CreditLedgerEntryType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "balanceAfterCents" INTEGER NOT NULL,
    "metadata" JSONB,
    "topupId" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_credit_wallets_companyId_key" ON "company_credit_wallets"("companyId");

-- CreateIndex
CREATE INDEX "company_credit_wallets_companyId_idx" ON "company_credit_wallets"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_products_companyId_code_key" ON "credit_products"("companyId", "code");

-- CreateIndex
CREATE INDEX "credit_products_companyId_idx" ON "credit_products"("companyId");

-- CreateIndex
CREATE INDEX "credit_products_companyId_active_idx" ON "credit_products"("companyId", "active");

-- CreateIndex
CREATE INDEX "credit_products_companyId_deletedAt_idx" ON "credit_products"("companyId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "credit_topups_asaasChargeId_key" ON "credit_topups"("asaasChargeId");

-- CreateIndex
CREATE INDEX "credit_topups_companyId_idx" ON "credit_topups"("companyId");

-- CreateIndex
CREATE INDEX "credit_topups_companyId_createdAt_idx" ON "credit_topups"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "credit_topups_companyId_status_idx" ON "credit_topups"("companyId", "status");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_companyId_idx" ON "credit_ledger_entries"("companyId");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_companyId_createdAt_idx" ON "credit_ledger_entries"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_companyId_type_idx" ON "credit_ledger_entries"("companyId", "type");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_topupId_idx" ON "credit_ledger_entries"("topupId");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_productId_idx" ON "credit_ledger_entries"("productId");

-- AddForeignKey
ALTER TABLE "company_credit_wallets" ADD CONSTRAINT "company_credit_wallets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_products" ADD CONSTRAINT "credit_products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_topups" ADD CONSTRAINT "credit_topups_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_topupId_fkey" FOREIGN KEY ("topupId") REFERENCES "credit_topups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "credit_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "phone" DROP NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "Customer_phone_companyId_key";

-- CreateIndex
CREATE INDEX "Customer_companyId_cpf_idx" ON "Customer"("companyId", "cpf");

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "partnerId" TEXT;

-- CreateIndex
CREATE INDEX "Order_partnerId_idx" ON "Order"("partnerId");

-- Deduplicate legacy rows before enforcing uniqueness (keep earliest order per pair)
UPDATE "Order" o
SET "externalOrderId" = NULL
FROM (
    SELECT id,
        ROW_NUMBER() OVER (
            PARTITION BY "companyId", "externalOrderId"
            ORDER BY "createdAt" ASC, id ASC
        ) AS rn
    FROM "Order"
    WHERE "externalOrderId" IS NOT NULL
) ranked
WHERE o.id = ranked.id
  AND ranked.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "Order_companyId_externalOrderId_key" ON "Order"("companyId", "externalOrderId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PublicApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hashedKey" TEXT NOT NULL,
    "encryptedSecret" TEXT,
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "companyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicApiKey_prefix_key" ON "PublicApiKey"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "PublicApiKey_hashedKey_key" ON "PublicApiKey"("hashedKey");

-- CreateIndex
CREATE INDEX "PublicApiKey_companyId_idx" ON "PublicApiKey"("companyId");

-- AddForeignKey
ALTER TABLE "PublicApiKey" ADD CONSTRAINT "PublicApiKey_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

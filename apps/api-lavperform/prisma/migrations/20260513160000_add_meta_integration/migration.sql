-- CreateEnum
CREATE TYPE "MetaIntegrationStatus" AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'REVOKED');

-- CreateTable
CREATE TABLE "meta_integrations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'bearer',
    "phoneNumberId" TEXT,
    "wabaId" TEXT,
    "businessId" TEXT,
    "displayName" TEXT,
    "qualityRating" TEXT,
    "messagingLimitTier" TEXT,
    "webhooksSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumberRegistered" BOOLEAN NOT NULL DEFAULT false,
    "status" "MetaIntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meta_integrations_companyId_key" ON "meta_integrations"("companyId");

-- CreateIndex
CREATE INDEX "meta_integrations_wabaId_idx" ON "meta_integrations"("wabaId");

-- CreateIndex
CREATE INDEX "meta_integrations_phoneNumberId_idx" ON "meta_integrations"("phoneNumberId");

-- AddForeignKey
ALTER TABLE "meta_integrations" ADD CONSTRAINT "meta_integrations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

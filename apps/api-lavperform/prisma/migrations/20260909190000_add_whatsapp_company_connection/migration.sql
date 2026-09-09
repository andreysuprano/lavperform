-- CreateEnum
CREATE TYPE "WhatsappCompanyConnectionStatus" AS ENUM ('connected', 'disconnected', 'connecting', 'pending', 'absent');

-- CreateTable
CREATE TABLE "WhatsappCompanyConnection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "instanceToken" TEXT,
    "instanceName" TEXT,
    "systemName" TEXT,
    "status" "WhatsappCompanyConnectionStatus" NOT NULL DEFAULT 'pending',
    "lastDisconnectedAt" TIMESTAMP(3),
    "lastConnectedAt" TIMESTAMP(3),
    "lastReconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappCompanyConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappCompanyConnection_companyId_key" ON "WhatsappCompanyConnection"("companyId");

-- CreateIndex
CREATE INDEX "WhatsappCompanyConnection_status_idx" ON "WhatsappCompanyConnection"("status");

-- CreateIndex
CREATE INDEX "WhatsappCompanyConnection_lastDisconnectedAt_idx" ON "WhatsappCompanyConnection"("lastDisconnectedAt");

-- CreateIndex
CREATE INDEX "WhatsappCompanyConnection_instanceToken_idx" ON "WhatsappCompanyConnection"("instanceToken");

-- CreateIndex
CREATE INDEX "WhatsappInstance_token_idx" ON "WhatsappInstance"("token");

-- AddForeignKey
ALTER TABLE "WhatsappCompanyConnection" ADD CONSTRAINT "WhatsappCompanyConnection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

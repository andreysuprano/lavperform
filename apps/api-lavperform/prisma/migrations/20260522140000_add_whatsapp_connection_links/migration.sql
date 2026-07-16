-- CreateTable
CREATE TABLE "WhatsappConnectionLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "whatsappInstanceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappConnectionLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappConnectionLink_token_key" ON "WhatsappConnectionLink"("token");

-- CreateIndex
CREATE INDEX "WhatsappConnectionLink_companyId_idx" ON "WhatsappConnectionLink"("companyId");

-- CreateIndex
CREATE INDEX "WhatsappConnectionLink_whatsappInstanceId_idx" ON "WhatsappConnectionLink"("whatsappInstanceId");

-- AddForeignKey
ALTER TABLE "WhatsappConnectionLink" ADD CONSTRAINT "WhatsappConnectionLink_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappConnectionLink" ADD CONSTRAINT "WhatsappConnectionLink_whatsappInstanceId_fkey" FOREIGN KEY ("whatsappInstanceId") REFERENCES "WhatsappInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

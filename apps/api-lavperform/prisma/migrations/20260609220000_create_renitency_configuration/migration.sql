-- CreateTable
CREATE TABLE "renitency_configuration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "minDaysBetween" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "renitency_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "renitency_configuration_companyId_key" ON "renitency_configuration"("companyId");

-- AddForeignKey
ALTER TABLE "renitency_configuration" ADD CONSTRAINT "renitency_configuration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (renitency lookup on Message)
CREATE INDEX "Message_customerId_companyId_channel_status_idx" ON "Message"("customerId", "companyId", "channel", "status");

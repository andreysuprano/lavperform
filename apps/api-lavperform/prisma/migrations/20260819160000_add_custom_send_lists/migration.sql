-- AlterEnum
ALTER TYPE "AudienceTargetingMode" ADD VALUE 'CUSTOMER_LIST';

-- CreateTable
CREATE TABLE "CustomSendList" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustomSendList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomSendListMember" (
    "listId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomSendListMember_pkey" PRIMARY KEY ("listId","customerId")
);

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "customSendListId" TEXT;

-- AlterTable
ALTER TABLE "AutomaticCampaign" ADD COLUMN "customSendListId" TEXT;

-- CreateIndex
CREATE INDEX "CustomSendList_companyId_idx" ON "CustomSendList"("companyId");

-- CreateIndex
CREATE INDEX "CustomSendList_companyId_deletedAt_idx" ON "CustomSendList"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "CustomSendListMember_listId_idx" ON "CustomSendListMember"("listId");

-- CreateIndex
CREATE INDEX "CustomSendListMember_customerId_idx" ON "CustomSendListMember"("customerId");

-- CreateIndex
CREATE INDEX "Campaign_customSendListId_idx" ON "Campaign"("customSendListId");

-- CreateIndex
CREATE INDEX "AutomaticCampaign_customSendListId_idx" ON "AutomaticCampaign"("customSendListId");

-- AddForeignKey
ALTER TABLE "CustomSendList" ADD CONSTRAINT "CustomSendList_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomSendListMember" ADD CONSTRAINT "CustomSendListMember_listId_fkey" FOREIGN KEY ("listId") REFERENCES "CustomSendList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomSendListMember" ADD CONSTRAINT "CustomSendListMember_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_customSendListId_fkey" FOREIGN KEY ("customSendListId") REFERENCES "CustomSendList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomaticCampaign" ADD CONSTRAINT "AutomaticCampaign_customSendListId_fkey" FOREIGN KEY ("customSendListId") REFERENCES "CustomSendList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

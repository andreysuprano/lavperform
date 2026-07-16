-- AlterTable
ALTER TABLE "Order" ADD COLUMN "externalOrderId" TEXT;

-- CreateIndex
CREATE INDEX "Order_companyId_externalOrderId_idx" ON "Order"("companyId", "externalOrderId");

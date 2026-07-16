-- DropForeignKey
ALTER TABLE "MessageOrder" DROP CONSTRAINT "MessageOrder_orderId_fkey";

-- AddForeignKey
ALTER TABLE "MessageOrder" ADD CONSTRAINT "MessageOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "public"."MessageOrder" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageOrder_messageId_idx" ON "public"."MessageOrder"("messageId");

-- CreateIndex
CREATE INDEX "MessageOrder_orderId_idx" ON "public"."MessageOrder"("orderId");

-- AddForeignKey
ALTER TABLE "public"."MessageOrder" ADD CONSTRAINT "MessageOrder_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageOrder" ADD CONSTRAINT "MessageOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "public"."DigitalMenuIntegration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "partnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "merchantId" TEXT,

    CONSTRAINT "DigitalMenuIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "integratorOrderId" INTEGER,
    "displayId" INTEGER NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "orderTiming" TEXT NOT NULL,
    "salesChannel" TEXT NOT NULL,
    "customerOrigin" TEXT,
    "tableNumber" TEXT,
    "estimatedTime" INTEGER,
    "cancellationReason" TEXT,
    "fiscalDocument" TEXT,
    "observation" TEXT,
    "deliveryFee" DECIMAL(10,2) NOT NULL,
    "serviceFee" DECIMAL(10,2) NOT NULL,
    "additionalFee" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderDeliveryAddress" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "reference" TEXT,

    CONSTRAINT "OrderDeliveryAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderSchedule" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "deliveryDateRaw" TEXT NOT NULL,
    "deliveryTimeRaw" TEXT NOT NULL,
    "deliveryAt" TIMESTAMP(3),

    CONSTRAINT "OrderSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "externalCode" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "observation" TEXT,
    "parentItemId" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderOption" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "optionId" INTEGER NOT NULL,
    "externalCode" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "optionGroupId" INTEGER NOT NULL,
    "optionGroupName" TEXT NOT NULL,

    CONSTRAINT "OrderOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderDiscount" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "description" TEXT,

    CONSTRAINT "OrderDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "paymentType" TEXT NOT NULL,
    "changeFor" DECIMAL(10,2),
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "cardNumber" TEXT,
    "cardBrand" TEXT,
    "observation" TEXT,
    "paymentFee" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DigitalMenuIntegration_companyId_key" ON "public"."DigitalMenuIntegration"("companyId");

-- CreateIndex
CREATE INDEX "Order_merchantId_displayId_idx" ON "public"."Order"("merchantId", "displayId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderDeliveryAddress_orderId_key" ON "public"."OrderDeliveryAddress"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderSchedule_orderId_key" ON "public"."OrderSchedule"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_itemId_idx" ON "public"."OrderItem"("itemId");

-- CreateIndex
CREATE INDEX "OrderOption_orderItemId_idx" ON "public"."OrderOption"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderOption_optionId_idx" ON "public"."OrderOption"("optionId");

-- CreateIndex
CREATE INDEX "OrderOption_optionGroupId_idx" ON "public"."OrderOption"("optionGroupId");

-- CreateIndex
CREATE INDEX "OrderDiscount_orderId_idx" ON "public"."OrderDiscount"("orderId");

-- CreateIndex
CREATE INDEX "OrderPayment_orderId_idx" ON "public"."OrderPayment"("orderId");

-- AddForeignKey
ALTER TABLE "public"."DigitalMenuIntegration" ADD CONSTRAINT "DigitalMenuIntegration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DigitalMenuIntegration" ADD CONSTRAINT "DigitalMenuIntegration_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "public"."Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderDeliveryAddress" ADD CONSTRAINT "OrderDeliveryAddress_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderSchedule" ADD CONSTRAINT "OrderSchedule_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "public"."OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderOption" ADD CONSTRAINT "OrderOption_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "public"."OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderDiscount" ADD CONSTRAINT "OrderDiscount_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderPayment" ADD CONSTRAINT "OrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

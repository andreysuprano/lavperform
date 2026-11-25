-- Marcos de sincronização e vínculo de clientes da SWL.

CREATE TABLE "swl_sync_states" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customersWatermark" TIMESTAMP(3),
    "deletionsWatermark" TIMESTAMP(3),
    "attendancesWatermark" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swl_sync_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "swl_customer_links" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "swlCustomerId" INTEGER NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swl_customer_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "swl_sync_states_companyId_key" ON "swl_sync_states"("companyId");
CREATE INDEX "swl_customer_links_customerId_idx" ON "swl_customer_links"("customerId");
CREATE UNIQUE INDEX "swl_customer_links_companyId_swlCustomerId_key" ON "swl_customer_links"("companyId", "swlCustomerId");

ALTER TABLE "swl_sync_states" ADD CONSTRAINT "swl_sync_states_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "swl_customer_links" ADD CONSTRAINT "swl_customer_links_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "swl_customer_links" ADD CONSTRAINT "swl_customer_links_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

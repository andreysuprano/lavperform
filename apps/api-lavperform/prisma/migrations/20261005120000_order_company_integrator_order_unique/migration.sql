DROP INDEX IF EXISTS "Order_companyId_integratorOrderId_idx";

CREATE UNIQUE INDEX "Order_companyId_integratorOrderId_key"
ON "Order" ("companyId", "integratorOrderId");

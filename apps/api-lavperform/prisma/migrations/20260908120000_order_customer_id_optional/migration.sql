-- Allow sales without a linked customer and keep the order if the customer is removed.
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

ALTER TABLE "Order" ALTER COLUMN "customerId" DROP NOT NULL;

ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

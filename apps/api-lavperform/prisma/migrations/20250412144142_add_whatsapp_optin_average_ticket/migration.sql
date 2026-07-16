-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "averageTicket" DECIMAL(10,2),
ADD COLUMN     "whatsappOptin" BOOLEAN NOT NULL DEFAULT true;

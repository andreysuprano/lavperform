-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "whatsappVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "digitalMenuIntegrationId" TEXT;

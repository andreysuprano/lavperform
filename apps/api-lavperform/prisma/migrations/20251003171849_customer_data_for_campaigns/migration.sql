-- AlterTable
ALTER TABLE "public"."Campaign" ADD COLUMN     "trakingCode" TEXT;

-- AlterTable
ALTER TABLE "public"."Customer" ADD COLUMN     "lastContactDate" TIMESTAMP(3),
ADD COLUMN     "lastOrderDate" TIMESTAMP(3),
ALTER COLUMN "rfvClassification" SET DEFAULT 'novo';

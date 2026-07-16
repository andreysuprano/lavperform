-- CreateEnum
CREATE TYPE "public"."CycleType" AS ENUM ('MONTHLY', 'YEARLY', 'SEMIANNUALLY', 'QUARTERLY');

-- AlterTable
ALTER TABLE "public"."Plan" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cycle" "public"."CycleType" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "maxPayments" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "recommended" BOOLEAN NOT NULL DEFAULT false;

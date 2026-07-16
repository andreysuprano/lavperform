-- CreateEnum
CREATE TYPE "public"."CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- AlterTable
ALTER TABLE "public"."Company" ADD COLUMN     "state" "public"."CompanyStatus" NOT NULL DEFAULT 'PENDING';

-- CreateEnum
CREATE TYPE "CompanyServiceModel" AS ENUM ('CONVENTIONAL', 'SELF_SERVICE');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "serviceModel" "CompanyServiceModel" NOT NULL DEFAULT 'CONVENTIONAL';

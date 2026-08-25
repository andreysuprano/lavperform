-- AlterTable
UPDATE "Customer" SET "phone" = NULL WHERE "phone" = '';
UPDATE "Customer" SET "cpf" = NULL WHERE "cpf" = '';

-- CreateEnum
CREATE TYPE "CustomerMergeMatchType" AS ENUM ('CROSS_IDENTIFIER');

-- CreateEnum
CREATE TYPE "CustomerMergeReviewStatus" AS ENUM ('PENDING_REVIEW', 'MERGED', 'KEPT_SEPARATE');

-- CreateTable
CREATE TABLE "customer_merge_review" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "matchType" "CustomerMergeMatchType" NOT NULL DEFAULT 'CROSS_IDENTIFIER',
    "status" "CustomerMergeReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "customerIdA" TEXT NOT NULL,
    "customerIdB" TEXT NOT NULL,
    "resolvedSurvivorId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_merge_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_merge_review_companyId_status_idx" ON "customer_merge_review"("companyId", "status");

-- CreateIndex
CREATE INDEX "customer_merge_review_customerIdA_idx" ON "customer_merge_review"("customerIdA");

-- CreateIndex
CREATE INDEX "customer_merge_review_customerIdB_idx" ON "customer_merge_review"("customerIdB");

-- AddForeignKey
ALTER TABLE "customer_merge_review" ADD CONSTRAINT "customer_merge_review_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

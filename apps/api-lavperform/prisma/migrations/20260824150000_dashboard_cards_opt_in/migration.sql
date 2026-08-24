-- AlterTable
ALTER TABLE "Company" ALTER COLUMN "showIncentivizedSales" SET DEFAULT false;
ALTER TABLE "Company" ALTER COLUMN "showTodayPurchases" SET DEFAULT false;

UPDATE "Company" SET "showIncentivizedSales" = false;
UPDATE "Company" SET "showTodayPurchases" = false;

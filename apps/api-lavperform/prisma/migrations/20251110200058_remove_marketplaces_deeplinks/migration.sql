/*
  Warnings:

  - You are about to drop the column `ifoodDeeplink` on the `LinkPage` table. All the data in the column will be lost.
  - You are about to drop the column `keetaDeepLink` on the `LinkPage` table. All the data in the column will be lost.
  - You are about to drop the column `nineNineFoodDeepLink` on the `LinkPage` table. All the data in the column will be lost.
  - You are about to drop the column `rappiDeepLink` on the `LinkPage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."LinkPage" DROP COLUMN "ifoodDeeplink",
DROP COLUMN "keetaDeepLink",
DROP COLUMN "nineNineFoodDeepLink",
DROP COLUMN "rappiDeepLink";

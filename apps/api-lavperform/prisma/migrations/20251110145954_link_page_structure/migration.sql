/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Company` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Company" ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "public"."Gallery" (
    "id" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "linkPageId" TEXT NOT NULL,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LinkPage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "biography" TEXT,
    "coverImage" TEXT,
    "ifoodDeeplink" TEXT,
    "rappiDeepLink" TEXT,
    "keetaDeepLink" TEXT,
    "nineNineFoodDeepLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Link" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "linkPageId" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'default',
    "iconType" TEXT NOT NULL DEFAULT 'icon',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkPage_companyId_idx" ON "public"."LinkPage"("companyId");

-- CreateIndex
CREATE INDEX "Link_linkPageId_idx" ON "public"."Link"("linkPageId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "public"."Company"("slug");

-- AddForeignKey
ALTER TABLE "public"."Gallery" ADD CONSTRAINT "Gallery_linkPageId_fkey" FOREIGN KEY ("linkPageId") REFERENCES "public"."LinkPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LinkPage" ADD CONSTRAINT "LinkPage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Link" ADD CONSTRAINT "Link_linkPageId_fkey" FOREIGN KEY ("linkPageId") REFERENCES "public"."LinkPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

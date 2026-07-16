-- AlterTable
ALTER TABLE "public"."Message" ADD COLUMN     "interaction" BOOLEAN DEFAULT false,
ADD COLUMN     "sale" BOOLEAN DEFAULT false;

/*
  Warnings:

  - The values [DELIVERED,READ] on the enum `MessageStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."MessageStatus_new" AS ENUM ('PENDING', 'SENT', 'PROCESSING', 'ERROR');
ALTER TABLE "public"."Message" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Message" ALTER COLUMN "status" TYPE "public"."MessageStatus_new" USING ("status"::text::"public"."MessageStatus_new");
ALTER TYPE "public"."MessageStatus" RENAME TO "MessageStatus_old";
ALTER TYPE "public"."MessageStatus_new" RENAME TO "MessageStatus";
DROP TYPE "public"."MessageStatus_old";
ALTER TABLE "public"."Message" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "webhook_events"
ADD COLUMN "completed_at" TIMESTAMP(3),
ADD COLUMN "error_message" TEXT;

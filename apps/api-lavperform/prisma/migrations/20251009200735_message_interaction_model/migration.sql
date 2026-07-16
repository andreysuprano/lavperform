/*
  Warnings:

  - You are about to drop the column `interactionAt` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Message" DROP COLUMN "interactionAt";

-- CreateTable
CREATE TABLE "public"."MessageInteraction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageInteraction_messageId_idx" ON "public"."MessageInteraction"("messageId");

-- AddForeignKey
ALTER TABLE "public"."MessageInteraction" ADD CONSTRAINT "MessageInteraction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

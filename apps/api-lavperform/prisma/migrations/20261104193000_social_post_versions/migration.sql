-- AlterTable
ALTER TABLE "social_post_variations" ADD COLUMN "selectedVersionId" TEXT;

-- CreateTable
CREATE TABLE "social_post_versions" (
    "id" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "prompt" TEXT,
    "assistantReply" TEXT,
    "headline" TEXT NOT NULL,
    "badgeText" TEXT,
    "captionShort" TEXT NOT NULL,
    "captionMedium" TEXT NOT NULL,
    "captionLong" TEXT NOT NULL,
    "activeCaption" TEXT NOT NULL DEFAULT 'medium',
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "slides" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_post_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_post_versions_variationId_idx" ON "social_post_versions"("variationId");

-- CreateIndex
CREATE UNIQUE INDEX "social_post_versions_variationId_number_key" ON "social_post_versions"("variationId", "number");

-- AddForeignKey
ALTER TABLE "social_post_versions" ADD CONSTRAINT "social_post_versions_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "social_post_variations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

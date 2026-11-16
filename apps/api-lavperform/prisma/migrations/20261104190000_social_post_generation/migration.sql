-- CreateTable
CREATE TABLE "brand_identities" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "logoLightUrl" TEXT,
    "logoDarkUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#7BC9F1',
    "deepColor" TEXT NOT NULL DEFAULT '#093A58',
    "accentColor" TEXT NOT NULL DEFAULT '#FFD23F',
    "neutralColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "titleFont" TEXT NOT NULL DEFAULT 'Poppins',
    "bodyFont" TEXT NOT NULL DEFAULT 'Inter',
    "tones" TEXT[] DEFAULT ARRAY['Próximo']::TEXT[],
    "voiceNotes" TEXT,
    "references" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_post_drafts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "slideCount" INTEGER NOT NULL DEFAULT 1,
    "artStyle" TEXT NOT NULL,
    "includeCaption" BOOLEAN NOT NULL DEFAULT true,
    "selectedVariationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_post_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_post_variations" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "headline" TEXT NOT NULL,
    "badgeText" TEXT,
    "captionShort" TEXT NOT NULL,
    "captionMedium" TEXT NOT NULL,
    "captionLong" TEXT NOT NULL,
    "activeCaption" TEXT NOT NULL DEFAULT 'medium',
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "slides" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_post_variations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_identities_companyId_key" ON "brand_identities"("companyId");

-- CreateIndex
CREATE INDEX "social_post_drafts_companyId_idx" ON "social_post_drafts"("companyId");

-- CreateIndex
CREATE INDEX "social_post_variations_draftId_idx" ON "social_post_variations"("draftId");

-- AddForeignKey
ALTER TABLE "brand_identities" ADD CONSTRAINT "brand_identities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_post_drafts" ADD CONSTRAINT "social_post_drafts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_post_variations" ADD CONSTRAINT "social_post_variations_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "social_post_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_post_versions" ADD COLUMN "referenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "social_post_references" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "draftId" TEXT,
    "position" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_post_references_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "social_post_references_companyId_userId_idx" ON "social_post_references"("companyId", "userId");
CREATE INDEX "social_post_references_draftId_idx" ON "social_post_references"("draftId");

ALTER TABLE "social_post_references" ADD CONSTRAINT "social_post_references_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_post_references" ADD CONSTRAINT "social_post_references_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "social_post_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

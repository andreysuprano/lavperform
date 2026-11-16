ALTER TABLE "social_post_drafts"
  ADD COLUMN "generationStatus" TEXT NOT NULL DEFAULT 'idle',
  ADD COLUMN "generationError" TEXT,
  ADD COLUMN "tone" TEXT,
  ADD COLUMN "wizardStep" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "placement" TEXT NOT NULL DEFAULT 'feed',
  ADD COLUMN "creativeFreedom" BOOLEAN NOT NULL DEFAULT false;

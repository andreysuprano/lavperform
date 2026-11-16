-- CreateTable
CREATE TABLE "ai_model_settings" (
    "id" TEXT NOT NULL,
    "textModel" TEXT,
    "imageModel" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_model_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationalWeekEvents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "isStream" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationalWeekEvents_pkey" PRIMARY KEY ("id")
);

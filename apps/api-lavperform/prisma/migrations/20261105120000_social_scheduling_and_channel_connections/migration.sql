-- Agendamento de posts e conexões Meta / Google por loja. Somente aditivo.

CREATE TYPE "ScheduledPostStatus" AS ENUM ('SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED');
CREATE TYPE "SocialPublishChannel" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'GOOGLE_BUSINESS');
CREATE TYPE "StoreConnectionProvider" AS ENUM ('META', 'GOOGLE_BUSINESS', 'GOOGLE_ADS');
CREATE TYPE "StoreConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'ERROR');

CREATE TABLE "scheduled_social_posts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "draftId" TEXT,
    "variationId" TEXT,
    "channels" "SocialPublishChannel"[],
    "caption" TEXT NOT NULL,
    "headline" TEXT,
    "imageDataUrl" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledPostStatus" NOT NULL DEFAULT 'SCHEDULED',
    "publishedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "channelResults" JSONB,
    "sandbox" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_social_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_social_connections" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" "StoreConnectionProvider" NOT NULL,
    "status" "StoreConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "pageAccessTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "pageId" TEXT,
    "pageName" TEXT,
    "igUserId" TEXT,
    "igUsername" TEXT,
    "adAccountId" TEXT,
    "adAccountName" TEXT,
    "accountName" TEXT,
    "locationId" TEXT,
    "locationName" TEXT,
    "locationAddress" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "lastError" TEXT,
    "metadata" JSONB,
    "sandbox" BOOLEAN NOT NULL DEFAULT false,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_social_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_oauth_states" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "StoreConnectionProvider" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_oauth_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_social_connections_companyId_provider_key" ON "store_social_connections"("companyId", "provider");
CREATE INDEX "store_social_connections_companyId_idx" ON "store_social_connections"("companyId");
CREATE INDEX "scheduled_social_posts_companyId_scheduledAt_idx" ON "scheduled_social_posts"("companyId", "scheduledAt");
CREATE INDEX "scheduled_social_posts_status_scheduledAt_idx" ON "scheduled_social_posts"("status", "scheduledAt");
CREATE UNIQUE INDEX "social_oauth_states_state_key" ON "social_oauth_states"("state");
CREATE INDEX "social_oauth_states_expiresAt_idx" ON "social_oauth_states"("expiresAt");

ALTER TABLE "scheduled_social_posts" ADD CONSTRAINT "scheduled_social_posts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scheduled_social_posts" ADD CONSTRAINT "scheduled_social_posts_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "social_post_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "store_social_connections" ADD CONSTRAINT "store_social_connections_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

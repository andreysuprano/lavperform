-- Sessão renovável das integrações cujo acesso é um token com validade.

CREATE TYPE "IntegrationSessionStatus" AS ENUM ('ACTIVE', 'NEEDS_REAUTH');

CREATE TABLE "integration_sessions" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "partnerSlug" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshAfter" TIMESTAMP(3) NOT NULL,
    "status" "IntegrationSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lockedUntil" TIMESTAMP(3),
    "lastRefreshedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_sessions_integrationId_key" ON "integration_sessions"("integrationId");
CREATE INDEX "integration_sessions_status_refreshAfter_idx" ON "integration_sessions"("status", "refreshAfter");
CREATE INDEX "integration_sessions_companyId_partnerSlug_idx" ON "integration_sessions"("companyId", "partnerSlug");

ALTER TABLE "integration_sessions" ADD CONSTRAINT "integration_sessions_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "DigitalMenuIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "integration_sessions" ADD CONSTRAINT "integration_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

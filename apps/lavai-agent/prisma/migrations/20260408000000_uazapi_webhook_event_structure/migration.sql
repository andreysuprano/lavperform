-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable: adicionar colunas como nullable para compatibilidade com dados existentes
ALTER TABLE "webhook_events"
ADD COLUMN     "processing_started_at" TIMESTAMP(3),
ADD COLUMN     "raw_payload" TEXT,
ADD COLUMN     "status" "WebhookEventStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updated_at" TIMESTAMP(3);

-- Migrar dados existentes: converter payload JSON para string
UPDATE "webhook_events" SET "raw_payload" = payload::text WHERE "raw_payload" IS NULL;

-- Definir updated_at nos registros existentes
UPDATE "webhook_events" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

-- Agora tornar as colunas obrigatórias
ALTER TABLE "webhook_events"
ALTER COLUMN "raw_payload" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- Remover coluna antiga
ALTER TABLE "webhook_events" DROP COLUMN "payload";

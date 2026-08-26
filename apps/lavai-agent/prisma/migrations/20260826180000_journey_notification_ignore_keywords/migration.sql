-- AlterTable
ALTER TABLE "agent_notification_configs" ADD COLUMN "help_notification_ignore_replies" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "agent_journey_configs" ALTER COLUMN "help_keywords" SET DEFAULT ARRAY['problema', 'ajuda', 'atendente', 'humano']::TEXT[];

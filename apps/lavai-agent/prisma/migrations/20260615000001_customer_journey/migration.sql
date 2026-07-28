-- CreateEnum
CREATE TYPE "CustomerJourneyStatus" AS ENUM ('ACTIVE', 'PURCHASED', 'HELP_REQUESTED', 'ESCALATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "JourneyTrigger" AS ENUM ('FIRST_MESSAGE', 'MENU_LINK_SENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "HelpRequestStatus" AS ENUM ('PENDING', 'CLAIMED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "agent_journey_configs" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "journey_trigger" "JourneyTrigger" NOT NULL DEFAULT 'FIRST_MESSAGE',
    "follow_up_enabled" BOOLEAN NOT NULL DEFAULT true,
    "cancel_on_reply" BOOLEAN NOT NULL DEFAULT true,
    "follow_up_steps" JSONB NOT NULL DEFAULT '[]',
    "help_keywords" TEXT[] DEFAULT ARRAY['atendente', 'humano', 'ajuda']::TEXT[],
    "help_auto_escalate" BOOLEAN NOT NULL DEFAULT true,
    "help_ack_message" TEXT,
    "purchase_webhook_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_journey_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_journeys" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_phone" TEXT NOT NULL,
    "status" "CustomerJourneyStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchase_at" TIMESTAMP(3),
    "help_requested_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "customer_journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_requests" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_phone" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "last_message" TEXT,
    "status" "HelpRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "help_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_journey_configs_agent_id_key" ON "agent_journey_configs"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_journeys_conversation_id_key" ON "customer_journeys"("conversation_id");

-- CreateIndex
CREATE INDEX "customer_journeys_agent_id_user_phone_idx" ON "customer_journeys"("agent_id", "user_phone");

-- CreateIndex
CREATE INDEX "customer_journeys_agent_id_status_idx" ON "customer_journeys"("agent_id", "status");

-- CreateIndex
CREATE INDEX "help_requests_agent_id_status_idx" ON "help_requests"("agent_id", "status");

-- AddForeignKey
ALTER TABLE "agent_journey_configs" ADD CONSTRAINT "agent_journey_configs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_journeys" ADD CONSTRAINT "customer_journeys_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_journeys" ADD CONSTRAINT "customer_journeys_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

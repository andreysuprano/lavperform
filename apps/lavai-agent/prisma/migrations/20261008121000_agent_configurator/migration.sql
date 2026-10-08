ALTER TABLE "agents" ADD COLUMN "platform_code" TEXT;

CREATE UNIQUE INDEX "agents_platform_code_key" ON "agents"("platform_code");

ALTER TABLE "platform_conversations" ADD COLUMN "target_agent_id" TEXT NOT NULL DEFAULT '';

DROP INDEX "platform_agent_company_user";

CREATE UNIQUE INDEX "platform_agent_company_user_target" ON "platform_conversations"("agent_id", "context_company_id", "platform_user_id", "target_agent_id");

ALTER TABLE "platform_conversation_messages" ADD COLUMN "blocks_json" TEXT;
ALTER TABLE "platform_conversation_messages" ADD COLUMN "proposal_status" TEXT;

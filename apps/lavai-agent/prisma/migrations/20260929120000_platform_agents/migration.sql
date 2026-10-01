-- CreateEnum
CREATE TYPE "AgentKind" AS ENUM ('PUBLIC', 'INTERNAL');

-- AlterTable
ALTER TABLE "agents" ADD COLUMN "kind" "AgentKind" NOT NULL DEFAULT 'PUBLIC';

-- Empresa dona do catálogo de agentes da Lavperform
INSERT INTO "companies" ("id", "name", "slug", "active", "created_at", "updated_at")
SELECT '00000000-0000-4000-8000-000000000001', 'Lavperform', 'lavperform-platform', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "companies" WHERE "slug" = 'lavperform-platform'
);

-- CreateTable
CREATE TABLE "platform_conversations" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "context_company_id" TEXT NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_conversation_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_agent_company_user" ON "platform_conversations"("agent_id", "context_company_id", "platform_user_id");

-- CreateIndex
CREATE INDEX "platform_conversation_messages_conversation_id_created_at_idx" ON "platform_conversation_messages"("conversation_id", "created_at");

-- AddForeignKey
ALTER TABLE "platform_conversations" ADD CONSTRAINT "platform_conversations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_conversation_messages" ADD CONSTRAINT "platform_conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "platform_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

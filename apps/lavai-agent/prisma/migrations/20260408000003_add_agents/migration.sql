-- CreateEnum
CREATE TYPE "AgentVoiceTone" AS ENUM ('FORMAL', 'INFORMAL', 'FRIENDLY', 'PROFESSIONAL', 'EMPATHETIC', 'ASSERTIVE');

-- CreateEnum
CREATE TYPE "AgentCommunicationStyle" AS ENUM ('CONCISE', 'DETAILED', 'TECHNICAL', 'SIMPLIFIED', 'BALANCED');

-- CreateEnum
CREATE TYPE "AgentLanguage" AS ENUM ('PT_BR', 'EN_US', 'ES_ES');

-- CreateEnum
CREATE TYPE "LlmProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE', 'GROQ');

-- CreateEnum
CREATE TYPE "AgentMemoryType" AS ENUM ('BUFFER', 'SUMMARY', 'VECTOR', 'NONE');

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_personas" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "persona_name" TEXT NOT NULL,
    "persona_description" TEXT,
    "system_prompt" TEXT NOT NULL,
    "behavior_guidelines" TEXT,
    "guardrails" TEXT,
    "context_prompt" TEXT,
    "welcome_message" TEXT,
    "voice_tone" "AgentVoiceTone" NOT NULL DEFAULT 'PROFESSIONAL',
    "communication_style" "AgentCommunicationStyle" NOT NULL DEFAULT 'BALANCED',
    "language" "AgentLanguage" NOT NULL DEFAULT 'PT_BR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agent_personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_model_configs" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "provider" "LlmProvider" NOT NULL DEFAULT 'OPENAI',
    "model_name" TEXT NOT NULL DEFAULT 'gpt-4o',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "max_tokens" INTEGER NOT NULL DEFAULT 1024,
    "top_p" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "frequency_penalty" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "presence_penalty" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "streaming" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agent_model_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_memory_configs" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "memory_type" "AgentMemoryType" NOT NULL DEFAULT 'BUFFER',
    "window_size" INTEGER NOT NULL DEFAULT 10,
    "max_summary_tokens" INTEGER NOT NULL DEFAULT 2000,
    "use_long_term_memory" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agent_memory_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_personas_agent_id_key" ON "agent_personas"("agent_id");
CREATE UNIQUE INDEX "agent_model_configs_agent_id_key" ON "agent_model_configs"("agent_id");
CREATE UNIQUE INDEX "agent_memory_configs_agent_id_key" ON "agent_memory_configs"("agent_id");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_personas" ADD CONSTRAINT "agent_personas_agent_id_fkey"
    FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_model_configs" ADD CONSTRAINT "agent_model_configs_agent_id_fkey"
    FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_memory_configs" ADD CONSTRAINT "agent_memory_configs_agent_id_fkey"
    FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

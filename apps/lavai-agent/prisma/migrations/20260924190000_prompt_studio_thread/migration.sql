-- CreateEnum
CREATE TYPE "PromptStudioMessageRole" AS ENUM ('USER', 'SPECIALIST');

-- CreateTable
CREATE TABLE "prompt_studio_threads" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_studio_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_studio_messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "role" "PromptStudioMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "proposal_json" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_studio_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prompt_studio_threads_agent_id_key" ON "prompt_studio_threads"("agent_id");

-- AddForeignKey
ALTER TABLE "prompt_studio_threads" ADD CONSTRAINT "prompt_studio_threads_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_studio_messages" ADD CONSTRAINT "prompt_studio_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "prompt_studio_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

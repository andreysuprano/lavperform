-- CreateEnum
CREATE TYPE "AgentPersonality" AS ENUM ('PROFESSIONAL', 'FRIENDLY', 'RELAXED');

-- CreateEnum
CREATE TYPE "AgentResponseStyle" AS ENUM ('CONCISE', 'DETAILED', 'BALANCED');

-- CreateEnum
CREATE TYPE "KnowledgeFileStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'ERROR');

-- CreateTable
CREATE TABLE "AiAgent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT,
    "personality" "AgentPersonality" NOT NULL DEFAULT 'PROFESSIONAL',
    "responseStyle" "AgentResponseStyle" NOT NULL DEFAULT 'BALANCED',
    "systemPrompt" TEXT,
    "userSystemPrompt" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "contextWindowLength" INTEGER NOT NULL DEFAULT 8192,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeFile" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "KnowledgeFileStatus" NOT NULL DEFAULT 'PENDING',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiAgent_companyId_idx" ON "AiAgent"("companyId");

-- CreateIndex
CREATE INDEX "KnowledgeFile_agentId_idx" ON "KnowledgeFile"("agentId");

-- CreateIndex
CREATE INDEX "KnowledgeFile_agentId_deletedAt_idx" ON "KnowledgeFile"("agentId", "deletedAt");

-- AddForeignKey
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeFile" ADD CONSTRAINT "KnowledgeFile_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AiAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

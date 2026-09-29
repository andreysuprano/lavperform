# Agentes de plataforma — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expor o catálogo de agentes da Lavperform e a conversa autenticada do app, sem tool e sem WhatsApp.

**Architecture:** O `lavai-agent` ganha `AgentKind`, a empresa `lavperform-platform` e tabelas de conversa próprias. O turno reusa o `PromptBuilderService` e o LLM, e devolve o texto no HTTP. O BFF autentica o usuário, confere `userCompany` e encaminha ao motor.

**Tech Stack:** NestJS 11, Prisma, Jest, JWT no `api-lavperform`.

## Global Constraints

- Enum `AgentKind`: `PUBLIC` (padrão) e `INTERNAL`
- Slug da empresa plataforma: `lavperform-platform`
- Prefixo `/platform-agents` no motor e no BFF
- Conversa única por agente + `Company.id` do Lavperform + `User.id`
- Turno sem tool, RAG, MCP, assinatura ou `MessageSender`
- Texto do turno: 1 a 8000 caracteres após trim
- Histórico: `limit` padrão 50, máximo 100, últimas N em ordem crescente
- Agente inativo some do consumo e do turno; a configuração do motor ainda lê e reativa
- Rotas antigas `/agents` respondem 404 para agente `INTERNAL`
- Webhook ignora agente `INTERNAL`
- Falha ou resposta vazia do modelo: 502, mensagem do usuário permanece, assistente não é gravado
- Sem telas nesta entrega

---

### Task 1: Modelo e prompt de sessão

**Files:**
- Modify: `apps/lavai-agent/prisma/schema.prisma`
- Create: `apps/lavai-agent/prisma/migrations/20260929120000_platform_agents/migration.sql`
- Modify: `apps/lavai-agent/src/application/agent-runner/services/prompt-builder.service.ts`
- Test: `apps/lavai-agent/src/application/agent-runner/services/prompt-builder.service.spec.ts`

- [x] Adicionar `kind`, conversa de plataforma e a empresa no schema e na migration
- [x] Acrescentar o bloco `Sessão atual` só quando o turno de plataforma passar `userName` e `companyName`
- [x] Teste: o bloco não contém telefone, chat id nem remoteJid; o caminho com `SenderContext` continua com telefone

### Task 2: Turno e catálogo no motor

**Files:**
- Create: `apps/lavai-agent/src/application/platform-agent/**`
- Create: `apps/lavai-agent/src/infrastructure/persistence/repositories/prisma-platform-conversation.repository.ts`
- Create: `apps/lavai-agent/src/infrastructure/http/platform-agent/platform-agent.controller.ts`
- Create: `apps/lavai-agent/src/modules/platform-agent/platform-agent.module.ts`
- Modify: `apps/lavai-agent/src/app.module.ts`
- Modify: `apps/lavai-agent/src/application/agent/ports/agent.repository.port.ts`
- Modify: `apps/lavai-agent/src/infrastructure/persistence/repositories/prisma-agent.repository.ts`
- Modify: `apps/lavai-agent/src/modules/agent/agent.module.ts`
- Modify: `apps/lavai-agent/src/infrastructure/http/agent/agent.controller.ts`
- Modify: `apps/lavai-agent/src/application/agent/use-cases/list-agents-by-company.use-case.ts`
- Modify: `apps/lavai-agent/src/application/webhook/use-cases/process-webhook-job.use-case.ts`

- [x] `POST /platform-agents` grava `INTERNAL` na empresa plataforma e recusa `instanceName`
- [x] CRUD de persona, modelo, memória, toggle e delete só para `INTERNAL`
- [x] `POST /platform-agents/:id/turns` e `GET` do histórico
- [x] Rotas `/agents/:id` devolvem 404 para `INTERNAL`
- [x] Listagem antiga só devolve `PUBLIC`
- [x] Webhook não chama handler quando `kind` é `INTERNAL`

### Task 3: Consumo no BFF

**Files:**
- Modify: `apps/api-lavperform/src/integrations/over-agent-api/over-agent-api.service.ts`
- Create: `apps/api-lavperform/src/platform-agent/**`
- Modify: `apps/api-lavperform/src/app.module.ts`
- Test: `apps/api-lavperform/src/platform-agent/application/platform-agent.service.spec.ts`

- [x] JWT + `userCompany`
- [x] Catálogo ativo com `id`, `name`, `description`, `personaName`, `welcomeMessage`
- [x] Turno devolve `{ conversationId, reply }` e propaga 502 do modelo
- [x] Histórico vazio responde 200 com `conversationId: null`

### Task 4: Verificação

- [x] `yarn workspace @lavperform/lavai-agent test --testPathPattern='platform-agent|prompt-builder|process-webhook|assert-agent-kind|list-agents'`
- [x] `yarn workspace @lavperform/api test --testPathPattern=platform-agent`

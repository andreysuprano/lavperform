# Chat de teste do agente público Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abrir um chat ao lado de Configurar para conversar com o agente público e ver se o prompt salvo responde, sem gravar o texto na lista de clientes e sem enviar essa resposta ao WhatsApp.

**Architecture:** O navegador guarda o histórico da visita e envia cada turno para a API. O `lavai-agent` cria um registro oculto `playground:`, roda a jornada de verdade e devolve o texto do mesmo loop de prompt, base e ferramentas. A lista de clientes ignora esse prefixo.

**Tech Stack:** NestJS, Prisma, Jest, React, Chakra, Vitest.

## Global Constraints

- Rota do app: `/whitelabel/ai-agent/:agentId/teste`
- Botão Testar ao lado de Configurar. Título Testar agente. Botão Conversas volta à tela do agente.
- Histórico só no estado da página.
- Telefone do remetente: `playground`. `chatId`: `playground:` + `sessionId`.
- Lista ignora `chatId` que começa com `playground:`.
- Aviso de agente inválido: `O teste não está disponível.`
- Aviso de falha: `A resposta falhou.`
- Passagem para humano: `O atendimento foi passado para um humano.`
- 400 para `sessionId` inválido ou texto vazio. 404 para agente inválido. 502 para falha ou texto vazio do modelo. 200 para a passagem para humano.
- A resposta do modelo não é gravada e não vai ao WhatsApp. Jornada, pedido de humano e ferramentas executam de verdade.
- Assinatura da persona entra só na resposta do modelo.

---

### Task 1: Lista e registro oculto

**Files:**
- Create: `apps/lavai-agent/src/application/agent-playground/playground-conversation.ts`
- Test: `apps/lavai-agent/src/application/agent-playground/playground-conversation.spec.ts`
- Modify: `apps/lavai-agent/src/application/webhook/ports/conversation.repository.port.ts`
- Modify: `apps/lavai-agent/src/infrastructure/persistence/repositories/prisma-conversation.repository.ts`

- [x] Esconder `playground:` em `listByAgentId` e buscar o token da conversa real mais recente.

### Task 2: Execução sem entrega

**Files:**
- Modify: `apps/lavai-agent/src/application/agent-runner/services/agent-runner.service.ts`
- Test: `apps/lavai-agent/src/application/agent-runner/services/agent-runner.service.spec.ts`

- [x] `AgentRunnerService.complete` reusa o loop e devolve o texto. Não grava mensagem e não chama o envio.

### Task 3: Turno de teste

**Files:**
- Create: `apps/lavai-agent/src/application/agent-playground/use-cases/run-playground-turn.use-case.ts`
- Test: `apps/lavai-agent/src/application/agent-playground/use-cases/run-playground-turn.use-case.spec.ts`
- Create: `apps/lavai-agent/src/infrastructure/http/agent-playground/agent-playground.controller.ts`
- Modify: `apps/lavai-agent/src/modules/agent-runner/agent-runner.module.ts`
- Modify: `apps/lavai-agent/src/modules/platform-agent/platform-agent.module.ts`

- [x] Caso de uso com jornada, janela, assinatura e os códigos HTTP da spec. `POST /agent-playground/turns`.

### Task 4: API

**Files:**
- Modify: `apps/api-lavperform/src/integrations/over-agent-api/over-agent-api.service.ts`
- Modify: `apps/api-lavperform/src/ai-agent/application/ai-agent.service.ts`
- Modify: `apps/api-lavperform/src/ai-agent/presentation/ai-agent.controller.ts`
- Test: `apps/api-lavperform/test/unit/ai-agent/ai-agent.service.spec.ts`

- [x] `POST companies/:companyId/ai-agents/:agentId/playground/turns` repassa o turno e preserva 404 e 502.

### Task 5: Tela

**Files:**
- Create: `apps/lavperform-app/src/whitelabel/pages/AIAgentPlaygroundPage/index.tsx`
- Test: `apps/lavperform-app/src/whitelabel/pages/AIAgentPlaygroundPage/index.test.tsx`
- Modify: `apps/lavperform-app/src/whitelabel/services/aiAgent.service.ts`
- Modify: `apps/lavperform-app/src/whitelabel/routes/whitelabel.routes.tsx`
- Modify: `apps/lavperform-app/src/whitelabel/pages/AIAgentDetailPage/index.tsx`
- Test: `apps/lavperform-app/src/whitelabel/pages/AIAgentDetailPage/index.test.tsx`

- [x] Chat com envio, espera, falha, indisponibilidade e passagem para humano. Botão Testar abre a rota.

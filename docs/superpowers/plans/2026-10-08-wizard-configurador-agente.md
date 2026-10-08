# Wizard do agente e chat configurador — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A unidade cria o agente de WhatsApp num wizard Typeform preenchendo o prompt padrão, e ajusta o comportamento num chat com o agente da plataforma, gravando só no aceite.

**Architecture:** O `.md` do WhatsApp é preenchido no `lavai-agent` sem modelo. A ficha continua no `PromptSheet` do `api-lavperform`. O chat usa um agente `INTERNAL` com `platformCode = agent-configurator`, devolve blocos markdown e proposta, e o app não recebe o texto do prompt.

**Tech Stack:** NestJS, Prisma, Jest, React, Chakra UI, Vitest.

## Global Constraints

- Novo agente abre `/whitelabel/ai-agent/novo`. Configurar abre `/whitelabel/ai-agent/:agentId/conversa`.
- Tipo da lavanderia vem da flag `CONVENTIONAL` ou `SELF_SERVICE`.
- A ficha é a de `scriptFor`. Sem resposta visível para o tipo, não cria.
- Toda pergunta com opção pronta tem "Outra resposta". Cadastro vazio é só campo de texto.
- Mídia fica fora do wizard.
- A pessoa não vê nem edita o prompt.
- O cartão mostra o que o agente passa a fazer, em markdown. Aceitar grava. Recusar não grava.
- Um rascunho por empresa. Conflito de `updatedAt` responde "O texto mudou. Peça a alteração de novo."
- Ao voltar, o wizard abre na primeira pergunta vazia. Depois de criar, abre a tela do agente.
- A resposta do chat chega inteira. HTML cru é descartado.
- FoodCRM fica fora.

---

### Task 1: Preencher o prompt

**Files:**
- Create: `apps/lavai-agent/src/application/agent-configurator/fill-whatsapp-prompt.ts`
- Create: `apps/lavai-agent/src/application/agent-configurator/fill-whatsapp-prompt.spec.ts`
- Create: `apps/lavai-agent/src/application/agent-configurator/prompts/whatsapp-agent.prompt.md`
- Create: `apps/lavai-agent/src/application/agent-configurator/prompts/platform-configurator.prompt.md`
- Test: `apps/lavai-agent/src/application/agent-configurator/fill-whatsapp-prompt.spec.ts`

**Interfaces:**
- Produces: `fillWhatsappPrompt(template, model, answers) -> { contextPrompt, systemPrompt, behaviorGuidelines, guardrails }`
- Produces: `IncompleteSheetError.missingKeys: string[]`
- Produces: `FillPromptError`

- [ ] Teste vermelho: fato igual no `contextPrompt`, bloco do tipo certo, template inválido, fato ausente
- [ ] Implementar o preenchimento e os dois `.md`
- [ ] `npx jest src/application/agent-configurator/fill-whatsapp-prompt.spec.ts` passa

### Task 2: Passos do wizard

**Files:**
- Create: `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/wizard-steps.ts`
- Create: `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/wizard-steps.spec.ts`
- Create: `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/markdown-for-display.ts`
- Create: `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/markdown-for-display.spec.ts`

**Interfaces:**
- Produces: `nextWizardStep(model, { agentName, agentObjective, answers })`
- Produces: `wizardChoices(key, model, preset)`
- Produces: `markdownForDisplay(source)` remove HTML cru

- [ ] Testes de próxima pergunta, outra resposta não é opção gravada, cadastro vazio e HTML
- [ ] Implementar
- [ ] `npx vitest run src/whitelabel/components/ai-agent/PromptStudio/wizard-steps.spec.ts src/whitelabel/components/ai-agent/PromptStudio/markdown-for-display.spec.ts` passa

### Task 3: Rascunho e conclusão

**Files:**
- Modify: `apps/api-lavperform/prisma/schema.prisma` (`PromptSheet`)
- Create: `apps/api-lavperform/prisma/migrations/20261008120000_prompt_sheet_wizard/migration.sql`
- Modify: `apps/api-lavperform/src/ai-agent/application/prompt-sheet.service.ts`
- Modify: `apps/api-lavperform/src/ai-agent/application/prompt-sheet.service.spec.ts`
- Modify: `apps/api-lavperform/src/ai-agent/application/ai-agent.service.ts`
- Modify: `apps/api-lavperform/src/ai-agent/presentation/ai-agent.controller.ts`
- Modify: `apps/api-lavperform/src/integrations/over-agent-api/over-agent-api.service.ts`
- Modify: `apps/lavai-agent/src/infrastructure/http` com `POST /agent-configurator/fill`
- Modify: `apps/lavai-agent/nest-cli.json` para copiar os `.md`

**Interfaces:**
- `PUT /companies/:companyId/ai-agents/prompt-sheet/intro` grava `agentName` e `agentObjective`
- `POST /companies/:companyId/ai-agents/from-wizard` cria o agente, grava `pendingAgentId` e adota a ficha
- `GET` da ficha devolve `agentName`, `agentObjective`, `pendingAgentId`

- [ ] Teste de intro, conflito e `adoptAndClear`
- [ ] Migração e serviço
- [ ] Jest do `prompt-sheet.service.spec.ts` passa

### Task 4: Tela do wizard

**Files:**
- Create: `apps/lavperform-app/src/whitelabel/pages/AIAgentWizardPage/index.tsx`
- Modify: `apps/lavperform-app/src/whitelabel/routes/whitelabel.routes.tsx`
- Modify: `apps/lavperform-app/src/whitelabel/services/aiAgent.service.ts`
- Modify: `apps/lavperform-app/src/whitelabel/types/prompt-studio.types.ts`

- [ ] Uma pergunta por tela, opções, Outra resposta, progresso, conflito e conclusão abrindo `/whitelabel/ai-agent/:id`

### Task 5: Turno e aceite do configurador

**Files:**
- Create: `apps/lavai-agent/src/application/agent-configurator/configurator-blocks.ts`
- Create: `apps/lavai-agent/src/application/agent-configurator/configurator-blocks.spec.ts`
- Create: `apps/lavai-agent/src/application/agent-configurator/use-cases/run-configurator-turn.use-case.ts`
- Create: `apps/lavai-agent/src/application/agent-configurator/use-cases/decide-configurator-proposal.use-case.ts`
- Modify: `apps/lavai-agent/prisma/schema.prisma`
- Create: `apps/lavai-agent/prisma/migrations/20261008121000_agent_configurator/migration.sql`
- Modify: repositórios de agente e conversa da plataforma
- Modify: `apps/api-lavperform` com rotas `.../configurator/turns` e `.../proposals/:messageId/accept|reject`

**Interfaces:**
- `parseConfiguratorReply(raw)` exige ao menos um markdown e no máximo uma proposta
- `toClientBlocks` omite `document`
- `decideProposal` grava só `pending` com `baseUpdatedAt` igual e os quatro campos
- Texto de obsoleto: `O texto mudou. Peça a alteração de novo.`
- Agente `platformCode = agent-configurator`

- [ ] Testes do parser e da decisão
- [ ] Persistência, turno e aceite
- [ ] Jest desses specs passa

### Task 6: Tela do chat

**Files:**
- Create: `apps/lavperform-app/src/whitelabel/pages/AIAgentConfiguratorPage/index.tsx`
- Create: `apps/lavperform-app/src/whitelabel/components/ai-agent/SafeMarkdown/SafeMarkdown.tsx`
- Modify: rota `/ai-agent/:agentId/conversa`
- Modify: botão Configurar no cartão e na tela do agente

- [ ] Histórico, campo embaixo, markdown, cartão Aceitar e Recusar, configurador indisponível

# Prompt padrão do agente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a conduta de todo agente público de WhatsApp pelo prompt padrão e guardar o prompt anterior no contexto, com um arquivo local para reverter.

**Architecture:** Uma função pura monta os quatro campos. O template em markdown já é o texto padrão. O script lê as personas públicas, grava um JSON de backup e só então atualiza o banco. O aceite do configurador grava o documento da proposta sem colar o resumo nas diretrizes.

**Tech Stack:** TypeScript, Jest, node pg, ts-node, NestJS.

## Global Constraints

- Estrutura do FoodChat: prompt principal, regras de comportamento, limites e contexto do negócio.
- Conduta igual vem de `apps/lavai-agent/src/application/agent-configurator/prompts/whatsapp-agent.prompt.md`.
- Identidade: atendente virtual, como a Seldinha. Não se apresenta como funcionário humano.
- Nome do agente continua na personalização. O template não fixa nome de loja nem de persona.
- Quem migra: persona de agente `PUBLIC` com `platform_code` nulo. Sem persona, não entra. O configurador fica de fora.
- Segunda execução: se o contexto já contém `## Informações já cadastradas desta lavanderia`, não copia de novo.
- Antes de gravar, o script salva os quatro campos num JSON em `apps/lavai-agent/scripts/backups/`. Esse JSON não entra no git.
- `--apply` só escreve depois do backup. Falha ao gravar o arquivo impede a escrita no banco.
- `--revert` sem `--apply` só lista. Com `--apply`, devolve os quatro campos do arquivo.
- Agente do backup que não existe mais: listar e não gravar nada.
- Cada execução gera um arquivo novo. Reverter a migração usa o arquivo da execução que trocou as lojas.
- Aceite do configurador grava os quatro campos da proposta. O texto `behavior` fica só na mensagem.
- Integrações, base de conhecimento, tom, assinatura e boas-vindas ficam fora.
- O `--apply` no banco ao vivo não faz parte da implementação. Roda só depois do dry-run ser aceito.

---

### Task 1: Função pura da migração

**Files:**
- Create: `apps/lavai-agent/src/application/agent-configurator/migrate-persona-prompt.ts`
- Test: `apps/lavai-agent/src/application/agent-configurator/migrate-persona-prompt.spec.ts`
- Modify: `apps/lavai-agent/src/application/agent-configurator/prompts/whatsapp-agent.prompt.md` (já escrito)

**Interfaces:**
- Consumes: `PromptDocument` de `fill-whatsapp-prompt.ts`
- Produces: `PRESERVED_TITLE`, `migratePersonaPrompt(current, standard)`, `standardConductFromTemplate(template)`, `documentFromBackup(row)`, `missingAgentIds(backupIds, existingIds)`

- [ ] **Step 1: Write the failing test** em `migrate-persona-prompt.spec.ts` cobrindo conduta nova, bloco preservado, campo vazio sem subtítulo, segunda chamada sem duplicar, template real com os três campos, e id ausente no backup.

- [ ] **Step 2: Run** `npx jest src/application/agent-configurator/migrate-persona-prompt.spec.ts --no-coverage` e confirme FAIL.

- [ ] **Step 3: Implement** `migratePersonaPrompt` e os helpers no arquivo da interface.

- [ ] **Step 4: Run** o mesmo jest. Expected: PASS.

### Task 2: Script com backup e reversão

**Files:**
- Create: `apps/lavai-agent/scripts/apply-standard-agent-prompt.ts`
- Modify: `apps/lavai-agent/.gitignore`
- Modify: `apps/lavai-agent/package.json` script `prompt:standard`

**Interfaces:**
- Consumes: `migratePersonaPrompt`, `standardConductFromTemplate`, `documentFromBackup`, `missingAgentIds`
- Produces: comando `npx ts-node --compiler-options "{\"module\":\"commonjs\"}" scripts/apply-standard-agent-prompt.ts`

O script, sem flag, lista empresa, agente e tamanho do contexto antes e depois. `--apply` grava o JSON e depois atualiza `agent_personas` numa transação. `--revert <arquivo>` restaura. Sem `--apply`, não escreve no banco.

### Task 3: Configurador grava o documento proposto

**Files:**
- Modify: `apps/lavai-agent/src/application/agent-configurator/prompts/platform-configurator.prompt.md`
- Modify: `apps/lavai-agent/src/application/agent-configurator/use-cases/decide-configurator-proposal.use-case.ts`
- Modify: `apps/lavai-agent/src/application/agent-configurator/configurator-blocks.ts`
- Test: `apps/lavai-agent/src/application/agent-configurator/configurator-blocks.spec.ts`

`instructionsWithSummary` devolve o documento sem acrescentar o resumo. O aceite chama `updatePersona(target.id, proposal.document)`.

- [ ] **Step 1:** Ajustar o teste para esperar o documento intacto.
- [ ] **Step 2:** Run jest desse spec. Expected: FAIL no teste antigo.
- [ ] **Step 3:** Implementar e tirar a chamada que cola o resumo.
- [ ] **Step 4:** Run `npx jest src/application/agent-configurator --no-coverage`. Expected: PASS.

### Task 4: Dry-run

Rodar o script sem `--apply`. Conferir a lista. Não gravar no banco até a pessoa aceitar o dry-run.

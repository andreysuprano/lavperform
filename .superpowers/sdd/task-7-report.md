# Task 7 Report: Conversa no lugar do formulário e do editor

## Status

**DONE_WITH_CONCERNS**

## Commits

| SHA | Subject |
|-----|---------|
| `a64e4a2` | feat: troca o questionário pela conversa da ficha |

## What changed

- Helper `progress` + teste Vitest em `PromptStudio/sheet-progress.ts`.
- Módulo cliente `sheet-script.ts` espelhando chaves/audiência de `lavai-agent` `sheet-script.ts`.
- `snapshot-shown-value.ts` para Confirmar quando o cadastro tem valor.
- `PromptSheetChat`: uma pergunta por vez, barra de progresso, Confirmar/Corrigir, Não tem / Não se aplica, PUT, Gerar prompt, documento só leitura via `onDocument`.
- Types `GeneratePromptStudioPayload` / `PromptSheetResponse`; service com GET/PUT ficha, `adoptPromptSheet`, generate com `{ model, answers }`.
- API `POST .../prompt-sheet/adopt` em `PromptSheetService.adopt`.
- Wizard e PersonaTab: removidos `QuestionnaireForm` e `PromptDocumentEditor` do fluxo; mantidos tom/estilo e `PromptTestPanel` só leitura.
- `vitest.config.ts`: `pool: 'vmThreads'` (pool padrão do Vitest 5 deixa `runner` undefined no Windows).

## RED

Command: `yarn test src/whitelabel/components/ai-agent/PromptStudio/sheet-progress.spec.ts` (cwd: `apps/lavperform-app`)

```
FAIL  src/whitelabel/components/ai-agent/PromptStudio/sheet-progress.spec.ts
Error: Failed to resolve import "./sheet-progress" from ".../sheet-progress.spec.ts". Does the file exist?

 Test Files  1 failed (1)
      Tests  no tests
```

Causa: módulo `sheet-progress` inexistente.

## GREEN

Command: `yarn test src/whitelabel/components/ai-agent/PromptStudio/sheet-progress.spec.ts` (cwd: `apps/lavperform-app`, após implementar helper + `pool: 'vmThreads'`)

```
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

(`progress(1, 4) === 25`, `progress(0, 0) === 0`)

Nota: o runner emite aviso de `virtual:pwa-register` não resolvido ao carregar o grafo Vite; os testes do helper passam mesmo assim.

## Typecheck

Command: `npx tsc --noEmit -p tsconfig.json` (cwd: `apps/lavperform-app`)

Exit code: 0 (sem erros).

## Related suite

Command: `yarn test prompt-sheet.service.spec.ts` (cwd: `apps/api-lavperform`)

```
PASS src/ai-agent/application/prompt-sheet.service.spec.ts
Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

(adopt não tem spec dedicado nesta task; suíte existente continua verde.)

## Files

- `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/PromptSheetChat.tsx`
- `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/sheet-progress.ts`
- `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/sheet-progress.spec.ts`
- `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/sheet-script.ts`
- `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/snapshot-shown-value.ts`
- `apps/lavperform-app/src/whitelabel/types/prompt-studio.types.ts`
- `apps/lavperform-app/src/whitelabel/services/aiAgent.service.ts`
- `apps/lavperform-app/src/whitelabel/components/ai-agent/AIAgentWizard/AIAgentWizard.tsx`
- `apps/lavperform-app/src/whitelabel/components/ai-agent/tabs/PersonaTab.tsx`
- `apps/lavperform-app/vitest.config.ts`
- `apps/api-lavperform/src/ai-agent/application/prompt-sheet.service.ts`
- `apps/api-lavperform/src/ai-agent/presentation/ai-agent.controller.ts`

## Browser / manual

Não foi possível subir o app (`vite` / login / empresa) nesta sessão. Não verifiquei no browser o passo Prompt do wizard nem a aba Persona: uma pergunta por vez, confirmar sem alterar cadastro, texto gerado sem editor.

## Notes / Concerns

- Vitest 5 no Windows com pool padrão falhava em `describe` (`runner.config` undefined); corrigido com `pool: 'vmThreads'`.
- Propose/accept/discard e chat especialista ficam fora desta task (próxima).
- `QuestionnaireForm` e `PromptDocumentEditor` permanecem no disco.
- Migration da ficha (Task 6) pode ainda não estar aplicada no banco local; sem ela GET/PUT da ficha falham em runtime.

## Review fix (Task 7)

### Findings addressed

1. **Propose no-op:** `onPropose` / accept / discard passaram a ser opcionais em `PromptTestPanel`. Sem `onPropose`, "Não ficou boa" / "Pedir correção" ficam ocultos. Wizard e `PersonaTab` deixam de passar no-ops; o teste de pergunta permanece.

2. **Adopt após create:** `handleFinish` no wizard cria o agente via `aiAgentService.createAgent` (sem toast prematuro de sucesso), trata falha de `adoptPromptSheet` com `finishError` + toaster de erro, não fecha o drawer nem navega, e mantém documento/formulário/respostas. Sucesso só após adopt + persona + mídia.

### Tests

Não há teste de componente do wizard; o caminho adopt/erro vive só no React. Não alterei `PromptSheetService.adopt`.

Command: `yarn test src/whitelabel/components/ai-agent/PromptStudio/sheet-progress.spec.ts` (cwd: `apps/lavperform-app`)

```
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

### Files touched in this fix

- `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/PromptTestPanel.tsx`
- `apps/lavperform-app/src/whitelabel/components/ai-agent/AIAgentWizard/AIAgentWizard.tsx`
- `apps/lavperform-app/src/whitelabel/components/ai-agent/tabs/PersonaTab.tsx`

## Review fix 2 (Task 7): no duplicate create on Finalizar retry

### Finding

Se `createAgent` sucedia e adopt/persona/mídia falhava depois, Finalizar chamava `createAgent` de novo e criava um segundo agente.

### Fix

- Extraído `wizard-finish-resume.ts` com estado puro (`agentId` + `lastCompleted`) e helpers `shouldCreateAgent` / `nextFinishPhase` / `advanceFinishResume`.
- O wizard guarda `finishResume` na tentativa de Finalizar: após create bem-sucedido, o id fica memorizado; no retry só retoma adopt → persona → mídia a partir do checkpoint, sem novo `createAgent`.

### Tests

Command: `yarn test src/whitelabel/components/ai-agent/AIAgentWizard/wizard-finish-resume.spec.ts` (cwd: `apps/lavperform-app`)

```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

Command: `yarn test src/whitelabel/components/ai-agent/PromptStudio/sheet-progress.spec.ts` (cwd: `apps/lavperform-app`)

```
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

### Files touched in this fix

- `apps/lavperform-app/src/whitelabel/components/ai-agent/AIAgentWizard/wizard-finish-resume.ts`
- `apps/lavperform-app/src/whitelabel/components/ai-agent/AIAgentWizard/wizard-finish-resume.spec.ts`
- `apps/lavperform-app/src/whitelabel/components/ai-agent/AIAgentWizard/AIAgentWizard.tsx`
- `.superpowers/sdd/task-7-report.md`

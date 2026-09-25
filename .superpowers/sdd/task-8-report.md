# Task 8 Report: Ajuste na mesma conversa só grava no aceite

## Status

**DONE**

## Commits

| SHA | Subject |
|-----|---------|
| `a1b37f5` | feat: grava ajuste do prompt só depois do aceite |
| *(pending)* | fix: endurece aceite e proposta do ajuste |

## What changed

- `ProposePromptEditUseCase`: recebe `facts`, `sheetUpdatedAt`, `currentSheetUpdatedAt`; mescla `{ ...document, ...changes }` e rejeita com `BadGatewayException` se `documentKeepsFacts` falhar; devolve `sheetUpdatedAt` (e `answerKey`/`answerValue` opcionais) na proposta.
- `isProposalStale`: também fica velha quando `proposal.sheetUpdatedAt !== currentSheetUpdatedAt`.
- DTO/controller propose: `facts` e `sheetUpdatedAt` (+ `currentSheetUpdatedAt`); system message pede alteração nos quatro campos e copiar fatos sem reescrever.
- `PromptSheetService.applyAcceptedAnswer`: muda só a chave; 409 com `O texto mudou. Peça a alteração de novo.` se `expectedSheetUpdatedAt` diferir de `PromptSheet.updatedAt`. PUT da ficha usa esse método quando o body traz `sheetUpdatedAt`.
- `PromptSheetChat`: após o prompt, mensagem livre chama propose; seed do painel de teste entra na mesma conversa; Aceitar grava (PATCH via callback + PUT da ficha se `answerKey`); Descartar limpa local e chama thread discard se houver agente (sem PUT/PATCH).
- Wizard e `PersonaTab`: `onPropose` real no `PromptTestPanel`; aceite aplica `changes` (wizard: documento local; PersonaTab: PATCH persona).

## RED

Command: `yarn test propose-prompt-edit.use-case.spec.ts` (cwd: `apps/lavai-agent`)

```
FAIL src/application/prompt-studio/propose-prompt-edit.use-case.spec.ts
  ● ProposePromptEditUseCase › devolve a parte alterada sem gravar persona
    Expected: "2026-09-25T10:00:00.000Z"
    Received: undefined

  ● ProposePromptEditUseCase › recusa proposta quando o documento mesclado perde um fato
    Received promise resolved instead of rejected

  ● ProposePromptEditUseCase › recusa proposta quando a ficha já mudou
    Received promise resolved instead of rejected

Tests:       3 failed, 2 passed, 5 total
```

Command: `yarn test prompt-sheet.service.spec.ts` (cwd: `apps/api-lavperform`)

```
FAIL src/ai-agent/application/prompt-sheet.service.spec.ts
  ● Test suite failed to run
    error TS2339: Property 'applyAcceptedAnswer' does not exist on type 'PromptSheetService'.
```

## GREEN

Command: `yarn test propose-prompt-edit.use-case.spec.ts` (cwd: `apps/lavai-agent`)

```
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

Command: `yarn test prompt-sheet.service.spec.ts` (cwd: `apps/api-lavperform`)

```
PASS src/ai-agent/application/prompt-sheet.service.spec.ts
  PromptSheetService
    √ cria a linha da empresa quando não existe e grava answers[key]
    √ não chama company.update, address.update nem openingHours.update ao gravar
    √ lê de volta o mesmo JSON com snapshot do cadastro
    √ usa draftKey draft sem agente e o id do agente lavai quando informado
    √ applyAcceptedAnswer muda só a chave informada
    √ applyAcceptedAnswer recusa se a ficha mudou depois da proposta
    √ descarte não chama applyAcceptedAnswer

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

## Full lavai-agent suite

Command: `yarn test` (cwd: `apps/lavai-agent`)

```
Test Suites: 18 passed, 18 total
Tests:       71 passed, 71 total
```

## Files

- `apps/lavai-agent/src/application/prompt-studio/propose-prompt-edit.use-case.ts`
- `apps/lavai-agent/src/application/prompt-studio/propose-prompt-edit.use-case.spec.ts`
- `apps/lavai-agent/src/application/prompt-studio/proposal-staleness.ts`
- `apps/lavai-agent/src/application/prompt-studio/proposal-staleness.spec.ts`
- `apps/lavai-agent/src/application/prompt-studio/prompt-studio.types.ts`
- `apps/lavai-agent/src/application/prompt-studio/parse-model-json.ts`
- `apps/lavai-agent/src/application/prompt-studio/dtos/prompt-studio.dto.ts`
- `apps/api-lavperform/src/ai-agent/application/prompt-sheet.service.ts`
- `apps/api-lavperform/src/ai-agent/application/prompt-sheet.service.spec.ts`
- `apps/api-lavperform/src/ai-agent/presentation/ai-agent.controller.ts`
- `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/PromptSheetChat.tsx`
- `apps/lavperform-app/src/whitelabel/components/ai-agent/PromptStudio/sheet-facts.ts`
- `apps/lavperform-app/src/whitelabel/components/ai-agent/tabs/PersonaTab.tsx`
- `apps/lavperform-app/src/whitelabel/components/ai-agent/AIAgentWizard/AIAgentWizard.tsx`
- `apps/lavperform-app/src/whitelabel/types/prompt-studio.types.ts`
- `apps/lavperform-app/src/whitelabel/services/aiAgent.service.ts`

## Browser / manual

Não foi possível subir o app (vite / login / empresa) nesta sessão. Não verifiquei no browser: gerar → marcar resposta ruim → aceitar/descartar; nem aceite recusado após mudar a ficha.

## Notes / Concerns

- Sem `answerKey`/`answerValue` na proposta do modelo, o aceite só aplica `changes` na persona (ou no documento local do wizard); a ficha não muda.
- Checagem de ficha no aceite: sempre via `assert-fresh` no servidor (409), com ou sem `answerKey`; com `answerKey`, o PUT ainda chama `applyAcceptedAnswer`.
- Thread especialista antigo (`PromptStudioThreadUseCase`) continua chamando propose sem facts/sheet (campos opcionais no use case).

---

## Review fixes (post Task 8)

### Fix

1. **Aceite sem answerKey:** `PromptSheetService.assertSheetUnchanged` compara `sheetUpdatedAt` do cliente com `PromptSheet.updatedAt` e lança `ConflictException` com mensagem exata `O texto mudou. Peça a alteração de novo.`. Endpoints `POST .../prompt-sheet/assert-fresh` (draft e agente). No aceite, o cliente chama isso **antes** do PATCH de persona (e antes do PUT da resposta se houver). `applyAcceptedAnswer` reutiliza o mesmo assert.
2. **answerValue no documento mesclado:** em `ProposePromptEditUseCase`, se a proposta traz `answerValue` e o texto não aparece em `{ ...document, ...changes }`, lança `BadGatewayException` (mesmo caminho de fato alterado); nada é devolvido/salvo.
3. **Resposta ruim no chat:** seed do painel de teste entra em `adjustmentMessages` e é renderizado na área de ajuste **antes** do card da proposta (não só propose silencioso).

### Commands / output

Command: `yarn test propose-prompt-edit.use-case.spec.ts` (cwd: `apps/lavai-agent`)

```
Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

Command: `yarn test prompt-sheet.service.spec.ts` (cwd: `apps/api-lavperform`)

```
PASS src/ai-agent/application/prompt-sheet.service.spec.ts
  PromptSheetService
    √ cria a linha da empresa quando não existe e grava answers[key]
    √ não chama company.update, address.update nem openingHours.update ao gravar
    √ lê de volta o mesmo JSON com snapshot do cadastro
    √ usa draftKey draft sem agente e o id do agente lavai quando informado
    √ applyAcceptedAnswer muda só a chave informada
    √ applyAcceptedAnswer recusa se a ficha mudou depois da proposta
    √ assertSheetUnchanged recusa se a ficha mudou mesmo sem answerKey
    √ assertSheetUnchanged aceita quando updatedAt bate
    √ descarte não chama applyAcceptedAnswer

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
```

### Status after fix

**DONE**

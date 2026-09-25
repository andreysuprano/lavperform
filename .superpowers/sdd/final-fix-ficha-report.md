# Final fix report — ficha conversacional

**Branch:** `feat/gerador-prompt-ia`  
**Date:** 2026-09-25  
**Scope:** Critical + Important findings from final review (no new features).

## Fixes

1. **Critical — missing comma** in `apps/lavperform-app/src/whitelabel/services/aiAgent.service.ts` after `putPromptSheetAnswer` (object literal broke parsing).
2. **Propose staleness** — API loads `PromptSheet.updatedAt` and sets `currentSheetUpdatedAt` from the DB; client `currentSheetUpdatedAt` is ignored. lavai `proposeForAgent` overrides `currentUpdatedAt` from persona.
3. **Propose facts** — API loads the sheet and passes `model` + `answers`; lavai derives facts via `factsFromSheet` and ignores client `facts`.
4. **Old specialist thread** — closed `GET …/thread` and `POST …/thread/messages` (api + lavai). Kept discard. Removed `PromptStudioChat.tsx` and related hooks.
5. **PUT DTO + atomic write** — `PutPromptSheetAnswerDto` with `@IsIn(PROMPT_SHEET_KEYS)`; `writeAnswer` uses `$transaction` + `SELECT … FOR UPDATE`.
6. **Accept order** — persona/`onAcceptProposal` first, then sheet PUT; sheet failure surfaces (no fake success).
7. **Repeat adjustment seed** — clear `seedHandledRef` when `adjustmentSeed` is null so a repeated complaint re-runs propose and clears `isProposingFromTest`.
8. **serviceModel** — `get`/`put`/`adopt` return/sync `Company.serviceModel`, not the frozen sheet copy.
9. **Parity** — `sheet-script.parity.spec.ts` asserts client keys/labels and API DTO keys match lavai `allSheetKeys()`.
10. **Minors** — `pieceBlanket` label → **Cobertor** (both scripts); deleted unused `QuestionnaireForm.tsx`, `PromptDocumentEditor.tsx`, `PromptStudioChat.tsx`.

## Commands and results

### lavai-agent

```text
$ yarn test propose-prompt-edit.use-case.spec.ts
$ yarn test generate-prompt.use-case.spec.ts
$ yarn test sheet-script.parity.spec.ts propose-prompt-edit.use-case.spec.ts generate-prompt.use-case.spec.ts

Test Suites: 3 passed, 3 total
Tests:       12 passed, 12 total
```

### api-lavperform

```text
$ yarn test prompt-sheet.service.spec.ts

PASS src/ai-agent/application/prompt-sheet.service.spec.ts
Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

### lavperform-app

```text
$ yarn test src/whitelabel/components/ai-agent/PromptStudio/sheet-progress.spec.ts \
           src/whitelabel/components/ai-agent/AIAgentWizard/wizard-finish-resume.spec.ts

 Test Files  2 passed (2)
      Tests  7 passed (7)
```

```text
$ npx tsc --noEmit -p tsconfig.app.json
EXIT:2
error TS count: 150
```

Touched prompt-sheet / PromptStudio / `aiAgent.service.ts` files: **no tsc errors**.  
Remaining errors are pre-existing elsewhere in the app (FormData naming clashes, Chakra/Button props, weather types, etc.). The Critical syntax error (missing comma) is fixed; those files type-check cleanly.

## Notes

- Propose routes moved under `companies/:companyId/ai-agents/.../prompt-studio/propose` so the API can load the sheet.
- `PromptStudioThreadUseCase.send` remains in code but is no longer exposed over HTTP.
- No prisma migrate / no live DB apply.

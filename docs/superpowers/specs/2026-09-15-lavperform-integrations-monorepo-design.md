# Integrar lavperform-integrations no monorepo Yarn

Data: 2026-09-15  
Status: aprovado em conversa

## Problema

`apps/lavperform-integrations` já está na árvore, mas ainda é um projeto npm isolado: nome sem escopo `@lavperform/*`, `package-lock.json`, scripts com `npm`, ausente do `package.json` da raiz, do README e do CI. O glob `workspaces: ["apps/*"]` já o inclui; falta tratá-lo como workspace de verdade.

## O que este ciclo resolve

1. Publicar o app como workspace Yarn 4 `@lavperform/integrations` (`private: true`).
2. Expor `dev` / `build` / `dist` na raiz, no mesmo padrão das outras apps.
3. Alinhar scripts de empacote local ao `@lavperform/lavai-client` (`package` / `package:win` / `package:mac`), mantendo o `electron-builder.yml` atual.
4. Job de CI no Ubuntu: typecheck + `electron-vite build` (sem instalador).
5. Documentar instalação e comandos via Yarn na raiz.

## Fora de escopo

- Matrix CI Windows/macOS e `electron-builder` no GitHub Actions.
- Downgrade de Electron/Vite/electron-vite para as versões do `lavai-client`.
- Mover a config do electron-builder para `package.json`.
- Estender `packages/tsconfig` (o app já usa `tsconfig.node` / `tsconfig.web` do electron-vite).
- Rodar `maxlav.client.test.ts` no CI (não há runner Jest/Vitest no `package.json` do app).
- Submodule / `.git` aninhado (não existe).

## Decisões

- Nome do workspace: `@lavperform/integrations`. Pasta permanece `apps/lavperform-integrations`.
- Gerenciador: Yarn 4 da raiz. Remover `package-lock.json`; `yarn.lock` da raiz passa a ser a única fonte.
- Empacote de instalador (DMG/NSIS) só local, via `yarn dist:integrations` → `package` do workspace.
- CI igual às outras apps: Node 20, corepack, `yarn install --immutable`, sem artefactos de release.

---

## Componentes

### `apps/lavperform-integrations/package.json`

- `name`: `@lavperform/integrations`; `private: true`.
- `typecheck` usa `yarn typecheck:node && yarn typecheck:web`.
- Scripts Yarn: `dev`, `build`, `preview`, `typecheck*`, `package`, `package:win`, `package:mac`.
- Dependências e versões de Electron/Vite inalteradas.

### `apps/lavperform-integrations/electron-builder.yml`

Sem mudança. Continua `appId` `cloud.lavperform.integrations`, `productName` LavPerform Integrações, targets dmg/nsis, `directories.buildResources: build`.

### `apps/lavperform-integrations/.gitignore`

Ignorar `node_modules`, `out`, `dist`, `release`. Não versionar lock npm.

### `package.json` (raiz)

| Script | Comando |
|--------|---------|
| `dev:integrations` | `yarn workspace @lavperform/integrations dev` |
| `build:integrations` | `yarn workspace @lavperform/integrations build` |
| `dist:integrations` | `yarn workspace @lavperform/integrations package` |

### `.github/workflows/ci.yml`

Job `integrations` (ubuntu-latest):

1. checkout, setup-node 20, corepack
2. `yarn install --immutable`
3. `yarn workspace @lavperform/integrations typecheck`
4. `yarn build:integrations`

### README

- Raiz: pasta, nome `@lavperform/integrations`, linhas na tabela de scripts.
- App: requisitos Yarn 4; comandos via raiz (`yarn dev:integrations`, `yarn build:integrations`, `yarn dist:integrations`) ou `yarn workspace`.

### Lockfile

Um `yarn install` na raiz após as mudanças de `package.json`. Commit do `yarn.lock` atualizado junto da implementação (não nesta spec).

---

## Fluxo

Desenvolvimento: `yarn install` na raiz → `yarn dev:integrations` (electron-vite, hot-reload).

CI / verificação de compilação: typecheck dos projetos node e web → `electron-vite build` em `./out`.

Distribuição local: `yarn dist:integrations` gera instalador da plataforma atual em `dist/` (default do `electron-builder.yml` atual). O CI não faz este passo.

## Erros e falhas

- `yarn install --immutable` no CI falha se o `yarn.lock` não incluir o workspace.
- Typecheck ou `electron-vite build` vermelho bloqueia o PR como nas outras apps.
- Falha de `electron-builder` em máquina local não afeta o CI.

## Verificação

- `yarn workspace @lavperform/integrations info` (ou equivalente) mostra o pacote.
- `yarn typecheck` e `yarn build` no workspace concluem sem erro.
- `package-lock.json` não existe mais no app.
- CI job `integrations` presente e alinhado ao molde de `app` / `landing`.

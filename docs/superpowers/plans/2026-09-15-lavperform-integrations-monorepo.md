# LavPerform Integrations Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer `apps/lavperform-integrations` ser um workspace Yarn 4 `@lavperform/integrations` com scripts na raiz, docs e job de CI (typecheck + `electron-vite build`).

**Architecture:** O glob `apps/*` já inclui a pasta. Trocar o `package.json` do app para o escopo `@lavperform/*`, apagar o lock npm, ligar scripts na raiz e um job Ubuntu no CI. Empacote DMG/NSIS continua só local via `electron-builder.yml` existente.

**Tech Stack:** Yarn 4.3, Electron 43, electron-vite 5, Vite 6, electron-builder 26, GitHub Actions.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-15-lavperform-integrations-monorepo-design.md`
- Nome do workspace: `@lavperform/integrations`. Pasta: `apps/lavperform-integrations`.
- `private: true`. Dependências e versões de Electron/Vite/electron-builder **inalteradas**.
- Não mover config do builder para `package.json`. Não editar `electron-builder.yml`.
- Não estender `packages/tsconfig`.
- CI: Ubuntu, Node 20, corepack, `yarn install --immutable`, typecheck + `yarn build:integrations`. Sem `electron-builder`, sem matrix win/mac, sem artefactos.
- Não ligar `maxlav.client.test.ts` no CI.
- Única fonte de lock: `yarn.lock` da raiz. Apagar `apps/lavperform-integrations/package-lock.json`.

---

## Estrutura de arquivos

### Novos

Nenhum arquivo de código novo. O app já existe em `apps/lavperform-integrations/`.

### Modificados

- `apps/lavperform-integrations/package.json` — nome, `private`, scripts Yarn (`preview`, `package*`, typecheck).
- `apps/lavperform-integrations/.gitignore` — incluir `release`.
- `package.json` (raiz) — `dev:integrations`, `build:integrations`, `dist:integrations`.
- `README.md` (raiz) — pasta, workspace, scripts.
- `apps/lavperform-integrations/README.md` — Yarn na raiz no lugar de npm.
- `.github/workflows/ci.yml` — job `integrations`.
- `yarn.lock` — após `yarn install` na raiz.

### Removidos

- `apps/lavperform-integrations/package-lock.json`

### Intocados

- `apps/lavperform-integrations/electron-builder.yml`
- `apps/lavperform-integrations/src/**`
- `packages/tsconfig/**`

---

### Task 1: Workspace `@lavperform/integrations`

**Files:**
- Modify: `apps/lavperform-integrations/package.json`
- Modify: `apps/lavperform-integrations/.gitignore`
- Delete: `apps/lavperform-integrations/package-lock.json`
- Modify: `yarn.lock` (gerado por `yarn install`)

**Interfaces:**
- Consumes: nada de tasks anteriores
- Produces: workspace name `@lavperform/integrations`
- Produces: scripts `dev`, `build`, `preview`, `typecheck`, `typecheck:node`, `typecheck:web`, `package`, `package:win`, `package:mac`

- [ ] **Step 1: Assertir o estado atual (vermelho)**

Na raiz do monorepo:

```bash
node -e "const p=require('./apps/lavperform-integrations/package.json'); if (p.name!=='@lavperform/integrations' || p.private!==true) process.exit(1)"
test ! -f apps/lavperform-integrations/package-lock.json
```

Expected: o `node -e` sai `1` (`name` ainda é `lavperform-integrations`). `test ! -f ...package-lock.json` também falha porque o arquivo existe.

- [ ] **Step 2: Substituir `apps/lavperform-integrations/package.json` por este conteúdo**

Manter `axios`, Electron `^43.0.0`, electron-vite `^5.0.0`, Vite `^6.0.7` e o resto das deps exatamente como hoje.

```json
{
  "name": "@lavperform/integrations",
  "version": "0.1.0",
  "private": true,
  "description": "App desktop LavPerform para importação de histórico de integrações (Laundry Kit, SisLav) para a API aberta.",
  "author": "LavPerform",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "preview": "electron-vite preview",
    "build": "electron-vite build",
    "typecheck:node": "tsc --noEmit -p tsconfig.node.json --composite false",
    "typecheck:web": "tsc --noEmit -p tsconfig.web.json --composite false",
    "typecheck": "yarn typecheck:node && yarn typecheck:web",
    "package": "yarn build && electron-builder",
    "package:win": "yarn build && electron-builder --win --x64",
    "package:mac": "yarn build && electron-builder --mac"
  },
  "dependencies": {
    "axios": "^1.7.9"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "electron": "^43.0.0",
    "electron-builder": "^26.0.0",
    "electron-vite": "^5.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.7.2",
    "vite": "^6.0.7"
  }
}
```

Não copiar o bloco `"build"` do `lavai-client` para este `package.json`. O empacote continua em `electron-builder.yml`.

- [ ] **Step 3: Atualizar `apps/lavperform-integrations/.gitignore`**

```
node_modules
out
dist
release
.DS_Store
*.log
```

- [ ] **Step 4: Apagar o lock npm**

```bash
rm apps/lavperform-integrations/package-lock.json
```

- [ ] **Step 5: Instalar na raiz**

```bash
yarn install
```

Expected: exit `0`. `yarn.lock` na raiz passa a listar `@lavperform/integrations`. Não recriar `package-lock.json` no app.

- [ ] **Step 6: Reassertir (verde)**

```bash
node -e "const p=require('./apps/lavperform-integrations/package.json'); if (p.name!=='@lavperform/integrations' || p.private!==true) process.exit(1); console.log('ok', p.name)"
test ! -f apps/lavperform-integrations/package-lock.json
yarn workspace @lavperform/integrations exec node -e "console.log('workspace-ok')"
```

Expected: `ok @lavperform/integrations`, `test` exit `0`, `workspace-ok`.

- [ ] **Step 7: Commit**

```bash
git add apps/lavperform-integrations/package.json apps/lavperform-integrations/.gitignore yarn.lock
git add -u apps/lavperform-integrations/package-lock.json
git commit -m "$(cat <<'EOF'
chore: promove lavperform-integrations a workspace Yarn

EOF
)"
```

Se o restante de `apps/lavperform-integrations/` ainda estiver untracked (código do app), **não** misturar neste commit: este task só muda identidade/lock/gitignore. O código do app entra num commit separado no fim da Task 4, se ainda não estiver no git.

---

### Task 2: Scripts da raiz e READMEs

**Files:**
- Modify: `package.json` (raiz)
- Modify: `README.md` (raiz)
- Modify: `apps/lavperform-integrations/README.md`

**Interfaces:**
- Consumes: workspace `@lavperform/integrations` (Task 1)
- Produces: root script `dev:integrations` → `yarn workspace @lavperform/integrations dev`
- Produces: root script `build:integrations` → `yarn workspace @lavperform/integrations build`
- Produces: root script `dist:integrations` → `yarn workspace @lavperform/integrations package`

- [ ] **Step 1: Assertir scripts da raiz (vermelho)**

```bash
node -e "const s=require('./package.json').scripts; if (!s['dev:integrations'] || !s['build:integrations'] || !s['dist:integrations']) process.exit(1)"
```

Expected: exit `1`.

- [ ] **Step 2: Acrescentar os três scripts em `package.json` da raiz**

Inserir depois de `"dev:lavai-client"` e depois de `"build:lavai-client"`:

```json
    "dev:lavai-client": "yarn workspace @lavperform/lavai-client dev",
    "dev:integrations": "yarn workspace @lavperform/integrations dev",
    "build": "yarn workspace @lavperform/app build",
    "build:app": "yarn workspace @lavperform/app build",
    "build:api": "yarn workspace @lavperform/api build",
    "build:landing": "yarn workspace @lavperform/client-landing build",
    "build:lavai-agent": "yarn workspace @lavperform/lavai-agent build",
    "build:lavai-dashboard": "yarn workspace @lavperform/lavai-dashboard build",
    "build:lavai-client": "yarn workspace @lavperform/lavai-client build",
    "build:integrations": "yarn workspace @lavperform/integrations build",
    "dist:integrations": "yarn workspace @lavperform/integrations package",
    "start:api": "yarn workspace @lavperform/api start:prod",
```

Os outros scripts da raiz (`lint:fix`, `format`, `preview`, etc.) permanecem iguais.

- [ ] **Step 3: Atualizar a árvore e a tabela em `README.md` da raiz**

Bloco `Estrutura` — acrescentar a linha do integrations depois de `lavai-client`:

```
apps/
  lavperform-app/             # CRM frontend (Vite + React) — @lavperform/app
  api-lavperform/             # Backend (NestJS + Prisma) — @lavperform/api
  client-landing/             # Landing por slug (Next.js) — @lavperform/client-landing
  lavai-agent/                # Motor IA LavAI (NestJS) — @lavperform/lavai-agent
  lavai-dashboard/            # Painel admin LavAI (Next.js) — @lavperform/lavai-dashboard
  lavai-client/               # Client Electron alertas — @lavperform/lavai-client
  lavperform-integrations/    # Importação desktop (Electron) — @lavperform/integrations
packages/
  tsconfig/                   # Bases TypeScript compartilhadas
docs/
  infra/                      # Runbooks
  migration/                  # Inventário e diffs da reestruturação
```

Tabela `Scripts` — acrescentar linhas e ajustar o build:

```markdown
| Comando | Descrição |
|---------|-----------|
| `yarn dev:app` | CRM frontend |
| `yarn dev:api` | API NestJS |
| `yarn dev:landing` | Client landing Next.js |
| `yarn dev:lavai-agent` | Motor LavAI |
| `yarn dev:lavai-dashboard` | Dashboard admin LavAI |
| `yarn dev:lavai-client` | Client Electron LavAI |
| `yarn dev:integrations` | Importação desktop (Electron) |
| `yarn build:app` / `build:api` / `build:landing` / `build:lavai-*` / `build:integrations` | Builds |
| `yarn dist:integrations` | Empacota o app de integrações (electron-builder local) |
| `yarn start:api` | API produção |
```

- [ ] **Step 4: Substituir requisitos/instalação/dev/build em `apps/lavperform-integrations/README.md`**

Trocar só as secções **Requisitos**, **Instalação**, **Desenvolvimento**, **Build e distribuição** e o bloco de typecheck. O resto do README (integrações, como usar, arquitetura, notas) permanece.

```markdown
## Requisitos

- Node.js 20+ (testado em Node 24)
- Yarn 4.3 (`packageManager` no `package.json` da raiz do monorepo)

Instalar dependências **na raiz** do monorepo, não nesta pasta:

```bash
yarn install
```

## Desenvolvimento

Na raiz:

```bash
yarn dev:integrations
```

Equivalente: `yarn workspace @lavperform/integrations dev`.

Abre a janela do app com hot-reload do renderer.

## Build e distribuição

Na raiz:

```bash
yarn build:integrations   # electron-vite → apps/lavperform-integrations/out
yarn dist:integrations    # build + electron-builder (instalador da plataforma atual em dist/)
```

Equivalentes no workspace:

```bash
yarn workspace @lavperform/integrations package      # plataforma atual
yarn workspace @lavperform/integrations package:mac  # .dmg
yarn workspace @lavperform/integrations package:win  # NSIS x64
```

Verificação de tipos:

```bash
yarn workspace @lavperform/integrations typecheck
```
```

- [ ] **Step 5: Reassertir (verde)**

```bash
node -e "const s=require('./package.json').scripts; ['dev:integrations','build:integrations','dist:integrations'].forEach(k=>{ if (s[k]!=='yarn workspace @lavperform/integrations '+({ 'dev:integrations':'dev','build:integrations':'build','dist:integrations':'package'}[k])) process.exit(1)}); console.log('scripts-ok')"
```

Expected: `scripts-ok`.

Confirmar docs:

```bash
grep -q "dev:integrations" README.md
grep -q "@lavperform/integrations" README.md
grep -q "yarn dev:integrations" apps/lavperform-integrations/README.md
grep -q "npm install" apps/lavperform-integrations/README.md && exit 1 || true
```

Expected: os três `grep -q` de Yarn passam; `npm install` **não** existe mais no README do app.

- [ ] **Step 6: Commit**

```bash
git add package.json README.md apps/lavperform-integrations/README.md
git commit -m "$(cat <<'EOF'
chore: expõe scripts e docs do workspace de integrações

EOF
)"
```

---

### Task 3: Job CI `integrations`

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `build:integrations` (Task 2)
- Consumes: script `typecheck` do workspace (Task 1)
- Produces: job GitHub Actions `integrations` em `ubuntu-latest`

- [ ] **Step 1: Assertir ausência do job (vermelho)**

```bash
grep -q "^  integrations:" .github/workflows/ci.yml && exit 1 || echo "job-absent"
```

Expected: `job-absent`.

- [ ] **Step 2: Acrescentar o job no fim de `.github/workflows/ci.yml`**

Não alterar jobs existentes. Não adicionar `electron-builder`, matrix, nem upload de artefactos.

```yaml
  lavai-dashboard:
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_API_URL: http://localhost:3000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: corepack enable
      - run: yarn install --immutable
      - run: yarn build:lavai-dashboard

  integrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: corepack enable
      - run: yarn install --immutable
      - run: yarn workspace @lavperform/integrations typecheck
      - run: yarn build:integrations
```

- [ ] **Step 3: Reassertir (verde)**

```bash
grep -q "^  integrations:" .github/workflows/ci.yml
grep -q "yarn workspace @lavperform/integrations typecheck" .github/workflows/ci.yml
grep -q "yarn build:integrations" .github/workflows/ci.yml
grep -q "electron-builder" .github/workflows/ci.yml && exit 1 || echo "ci-ok"
```

Expected: `ci-ok`. O ficheiro **não** contém `electron-builder`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
ci: adiciona job de typecheck e build das integrações

EOF
)"
```

---

### Task 4: Typecheck, build e código do app no git

**Files:**
- Test: typecheck e `electron-vite build` no workspace
- Add (se ainda untracked): `apps/lavperform-integrations/**` excepto `node_modules`, `out`, `dist`, `package-lock.json`

**Interfaces:**
- Consumes: workspace instalado (Task 1) e `build:integrations` (Task 2)

- [ ] **Step 1: Typecheck**

```bash
yarn workspace @lavperform/integrations typecheck
```

Expected: exit `0`. Se `tsc` falhar, corrigir só erros de tipo; não refatorar importers/mappers neste ciclo.

- [ ] **Step 2: Build electron-vite**

```bash
yarn build:integrations
```

Expected: exit `0`. Artefactos em `apps/lavperform-integrations/out/` (`main/index.js` e renderer). `out/` permanece gitignored.

Não correr `yarn dist:integrations` nesta task (electron-builder é só local, fora do critério de pronto).

- [ ] **Step 3: Commit do código do app se ainda untracked**

```bash
git add apps/lavperform-integrations
git status
```

Confirmar que **não** entram `node_modules`, `out`, `dist`, `package-lock.json`. Depois:

```bash
git commit -m "$(cat <<'EOF'
feat: adiciona o app desktop de importação de integrações

EOF
)"
```

Se o código já estiver no git, este step é no-op (não criar commit vazio).

---

## Verificação final

```bash
node -e "const p=require('./apps/lavperform-integrations/package.json'); if (p.name!=='@lavperform/integrations' || !p.private) process.exit(1)"
test ! -f apps/lavperform-integrations/package-lock.json
yarn workspace @lavperform/integrations typecheck
yarn build:integrations
grep -q "^  integrations:" .github/workflows/ci.yml
```

Todos exit `0`. `electron-builder.yml` sem diff. `packages/tsconfig` sem diff.

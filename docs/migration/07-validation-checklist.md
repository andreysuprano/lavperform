# Sprint 7–9 — Infra / CI / Validação

## Infra

- Redis dedicado para filas Bull (ver docs/infra/README.md)
- Postgres ainda pode ser partilhado — sem migrations destrutivas
- Dockerfiles da API ainda usam `npm ci` (backlog: adaptar Yarn)

## CI

Workflow `.github/workflows/ci.yml` — build app, api e landing.

## Checklist validação

- [x] `yarn install` (workspaces: app, api, client-landing, lavai-agent, lavai-dashboard, lavai-client, tsconfig)
- [x] `yarn build:api` (dist/main.js gerado; food processors não reintroduzidos)
- [x] `yarn build:lavai-agent` (Prisma generate + nest build)
- [x] `yarn build:lavai-dashboard` (Next 16 OK)
- [x] `yarn build:lavai-client` (electron-vite build)
- [ ] `yarn build:app` (smoke manual recomendado — renitency + schedule portados)
- [x] `yarn build:landing` (Next 16 OK)
- [x] Tema `seld` / whitelabel paths preservados (não sobrescritos no sync)
- [x] Sem módulos food na API (`app.module.ts`)
- [x] LavAI: migrado de FoodAI@45c3a57 → `apps/lavai-*` (ver `docs/migration/05-foodai-inventory.md`, `08-lavai-migration-plan.md`)
- [x] CI: `.github/workflows/ci.yml` (app, api, landing, lavai-agent, lavai-dashboard)
- [x] `packages/tsconfig` base compartilhado

# Sprint 7–9 — Infra / CI / Validação

## Infra

- Redis dedicado para filas Bull (ver docs/infra/README.md)
- Postgres ainda pode ser partilhado — sem migrations destrutivas
- Dockerfiles da API ainda usam `npm ci` (backlog: adaptar Yarn)

## CI

Workflow `.github/workflows/ci.yml` — build app, api e landing.

## Checklist validação

- [x] `yarn install` (workspaces: app, api, client-landing, food-ai, tsconfig)
- [x] `yarn build:api` (dist/main.js gerado; food processors não reintroduzidos)
- [ ] `yarn build:app` (smoke manual recomendado — renitency + schedule portados)
- [x] `yarn build:landing` (Next 16 OK)
- [x] Tema `seld` / whitelabel paths preservados (não sobrescritos no sync)
- [x] Sem módulos food na API (`app.module.ts`)
- [x] FoodAI: placeholder + doc de bloqueio (`docs/migration/05-foodai-inventory.md`)
- [x] CI: `.github/workflows/ci.yml`
- [x] `packages/tsconfig` base compartilhado

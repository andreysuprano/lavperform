# Backlog de limpeza (não executar automaticamente)

Itens identificados para etapas futuras:

1. Rebrand residual FoodCRM (seeds `demo@foodcrm.test`, Postman, placeholders, `@FoodCRM:token` no front).
2. Firebase/`overfood-foodcrm` hardcoded → projeto/ENV LavPerform.
3. Separação física do PostgreSQL (cluster dedicado + migração de dados).
4. Extrair `apps/api-lavperform/admin` para `apps/admin`.
5. Rename futuro de `DigitalMenuIntegration` quando o DB for exclusivo.
6. CORS `origin: '*'` → `CORS_ORIGINS` explícito.
7. Limpeza de rows `Partner` food no DB compartilhado (operação coordenada, não via migrate no monorepo).
8. Dívidas de arquitetura (Clean Architecture incompleta) — fora do escopo da separação.
9. ~~Dockerfiles da API ainda usam `npm ci` (legado); adaptar para Yarn workspaces do monorepo.~~ (feito)

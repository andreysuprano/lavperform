# Recognition and Sales Campaign Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir novas campanhas automáticas apenas dos tipos Reconhecimento e Venda, preservando campanhas legadas e exibindo vendas positivas somente nos cards de Venda.

**Architecture:** O enum do banco será apenas estendido; valores legados permanecem para leitura, filtro e compatibilidade. Backend separa tipos criáveis dos tipos persistidos, app e admin usam catálogos distintos para criação e exibição, e a duplicação de legado exige um tipo novo explícito.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Jest, React/Vite/Chakra UI, Next.js/Zod.

## Global Constraints

- Novos tipos internos: `RECOGNITION` e `SALES`.
- Criação nova aceita somente `RECOGNITION` e `SALES`.
- `ACQUISITION`, `RECURRENCE` e `REACTIVATION` permanecem no enum e em leitura/filtros.
- Edição de legado pode migrar para tipo novo; tipos novos não podem voltar para legado.
- Duplicação de legado exige `RECOGNITION` ou `SALES`.
- Reconhecimento não sugere segmentos.
- Venda não sugere segmentos.
- Vendas aparecem no card somente quando `type === "SALES"` e quantidade > 0.
- Receita incentivada e detalhes de performance não mudam.
- Não alterar o motor de disparos.

---

### Task 1: Contrato e regras do backend

**Files:**
- Modify: `apps/api-lavperform/prisma/schema.prisma`
- Create: `apps/api-lavperform/prisma/migrations/20260825150000_add_recognition_sales_campaign_types/migration.sql`
- Create: `apps/api-lavperform/src/automatic-campaign/domain/automatic-campaign-type.rules.ts`
- Create: `apps/api-lavperform/src/automatic-campaign/application/dto/duplicate-automatic-campaign.dto.ts`
- Modify: create/update DTOs, controller and service
- Test: `apps/api-lavperform/test/unit/automatic-campaign/automatic-campaign.service.spec.ts`

- [ ] Escrever testes falhando para criação, atualização e duplicação.
- [ ] Adicionar valores ao enum e migration aditiva.
- [ ] Centralizar tipos criáveis/legados e validações.
- [ ] Aceitar `targetType` opcional na duplicação; exigir nos legados.
- [ ] Rodar teste unitário e build da API.

### Task 2: App do cliente

**Files:**
- Modify: campaign types, constants, create/edit type steps, payload/service/hook de duplicação e card
- Create: componente de diálogo de escolha do tipo na duplicação legada, se necessário

- [ ] Separar catálogo completo (display) do catálogo criável.
- [ ] Criar/editar oferecem somente Reconhecimento e Venda, sem sugestão.
- [ ] Edição de legado mostra o valor atual, mas permite migrar apenas para novos.
- [ ] Duplicação de legado pede novo tipo.
- [ ] Card de Venda mostra Vendas somente acima de zero.
- [ ] Rodar TypeScript do app e validar que detalhes/receita permanecem.

### Task 3: Admin interno

**Files:**
- Modify: `apps/api-lavperform/admin/features/campaigns/types.ts`
- Modify: `apps/api-lavperform/admin/features/campaigns/utils.ts`
- Modify: schemas, filtros e formulários automático create/edit

- [ ] Manter todos os tipos em leitura/filtro.
- [ ] Usar somente tipos novos na criação.
- [ ] Permitir migração de legado para novos na edição, sem retorno.
- [ ] Rodar typecheck/build possível do admin e registrar limitações preexistentes.

### Task 4: Rollback

**Files:**
- Create: `docs/rollback/2026-08-25-campaign-recognition-sales-types.md`

- [ ] Documentar precheck de dados.
- [ ] Documentar reversão por `git revert`.
- [ ] Explicar que enum PostgreSQL é aditivo e os valores devem permanecer.
- [ ] Bloquear rollback se houver campanhas novas sem estratégia de migração.

### Task 5: Verificação, revisão e PR

- [ ] Rodar testes unitários focados, build API, typecheck app e verificações do admin.
- [ ] Revisar diff contra `origin/main`.
- [ ] Solicitar revisão independente e corrigir achados Critical/Important.
- [ ] Commitar somente arquivos desta feature.
- [ ] Push da branch `feat/campaign-recognition-sales-types`.
- [ ] Abrir PR para `main` com plano de teste e rollback.

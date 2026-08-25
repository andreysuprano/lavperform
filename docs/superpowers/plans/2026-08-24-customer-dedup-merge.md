# Customer Dedup/Merge Implementation Plan

> **For agentic workers:** Execute inline in this session. Spec: `docs/superpowers/specs/2026-08-24-customer-dedup-merge-design.md`.

**Goal:** Impedir clientes duplicados por telefone/CPF preenchidos e mesclar os existentes sem perder pedidos.

**Architecture:** Funções puras de classificação/perfil; `CustomerIdentityService` na ingestão de vendas; `CustomerDuplicateService` para scan/merge; unique de banco só via script após a base limpa.

**Tech Stack:** NestJS, Prisma/Postgres, Bull, admin Next.js.

## Global Constraints

- Venda nunca é rejeitada por identidade.
- Clientes sem telefone e sem CPF são ilimitados e não entram em agrupamento.
- Unique de phone/cpf NÃO entra no `migrate deploy` deste PR.
- Remover `@@unique([phone, companyId])` do schema (índice já não existe no banco).
- Superadmin no admin; merge por empresa.
- Reusar `isSimilarName` (0.5). Opt-out de WhatsApp vence.

## Files

- `apps/api-lavperform/src/deduplication/application/customer-duplicate.classification.ts`
- `apps/api-lavperform/src/deduplication/application/customer-merge-profile.ts`
- `apps/api-lavperform/src/deduplication/application/customer-duplicate.service.ts`
- `apps/api-lavperform/src/customers/application/customer-identity.service.ts`
- `apps/api-lavperform/src/customers/application/customer-identifier.ts`
- Prisma migration + `CustomerMergeReview`
- Admin endpoints/UI
- `src/scripts/enforce-customer-uniqueness.ts`

## Tasks

1. Classification + merge profile (unit tests)
2. Prisma model + nullify empty strings + drop phantom unique from schema
3. CustomerIdentityService + wire OrderIngestionProcessor
4. CustomerDuplicateService merge/keep-separate/scan
5. Jobs + admin API
6. Admin UI
7. Integrations + uniqueness script
8. Verify unit tests

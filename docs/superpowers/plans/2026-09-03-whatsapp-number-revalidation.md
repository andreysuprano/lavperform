# WhatsApp Number Revalidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedir campanhas de usarem validações WhatsApp expiradas e invalidar números com erro definitivo da UAZAPI.

**Architecture:** Centralizar regras de TTL/invalidação em `whatsapp-verification.policy.ts`, aplicar filtro de validação fresca no resolver de campanhas e integrar revalidação assíncrona + invalidação no envio.

**Tech Stack:** NestJS, Prisma, Bull queues, Jest

## Global Constraints

- TTL padrão: **30 dias** (`WHATSAPP_VERIFICATION_TTL_DAYS`, default 30)
- Campanha exclui validação expirada e revalida em background
- Invalidação imediata apenas para `not on WhatsApp` e `no LID found`
- Sem migration de banco

---

### Task 1: Policy utilitária

**Files:**
- Create: `apps/api-lavperform/src/whatsapp/application/whatsapp-verification.policy.ts`
- Test: `apps/api-lavperform/test/unit/whatsapp/whatsapp-verification.policy.spec.ts`

**Interfaces:**
- Produces: `getWhatsappVerificationTtlDays()`, `getWhatsappVerificationCutoff(now?)`, `isWhatsappVerificationFresh(verifiedAt, now?)`, `buildFreshWhatsappCustomerFilter(now?)`, `shouldInvalidateWhatsappOnSendError(errorMessage)`

- [ ] **Step 1: Write failing tests**
- [ ] **Step 2: Run tests — expect FAIL**
- [ ] **Step 3: Implement policy**
- [ ] **Step 4: Run tests — expect PASS**
- [ ] **Step 5: Commit**

---

### Task 2: Filtro de campanhas

**Files:**
- Modify: `apps/api-lavperform/src/audiences/application/campaign-customer-resolver.service.ts`
- Modify: `apps/api-lavperform/src/custom-send-lists/application/custom-send-lists.service.ts`
- Test: `apps/api-lavperform/src/audiences/application/campaign-customer-resolver.service.spec.ts`

- [ ] **Step 1: Update tests for fresh verification filter**
- [ ] **Step 2: Implement filter using policy**
- [ ] **Step 3: Run unit tests**
- [ ] **Step 4: Commit**

---

### Task 3: Reset ao alterar telefone

**Files:**
- Modify: `apps/api-lavperform/src/customers/application/customers.service.ts`
- Test: `apps/api-lavperform/test/unit/customers/customers.service.spec.ts`

- [ ] **Step 1: Add failing test for phone update reset + enqueue**
- [ ] **Step 2: Implement reset/enqueue on phone change**
- [ ] **Step 3: Run unit tests**
- [ ] **Step 4: Commit**

---

### Task 4: Revalidação de expirados por empresa

**Files:**
- Modify: `apps/api-lavperform/src/customers/domain/customer.repository.interface.ts`
- Modify: `apps/api-lavperform/src/customers/infrastructure/persistence/prisma-customer.repository.ts`
- Modify: `apps/api-lavperform/src/customers/application/customers.service.ts`
- Modify: `apps/api-lavperform/src/automatic-campaign/infrastructure/jobs/automatic-campaigns.processor.ts`
- Test: repository/service specs as needed

- [ ] **Step 1: Add repository method `findStaleWhatsappValidationCandidates`**
- [ ] **Step 2: Add `enqueueStaleWhatsappValidationForCompany` with deduped Bull jobs**
- [ ] **Step 3: Call from automatic campaign processor (WhatsApp channels only)**
- [ ] **Step 4: Run unit tests**
- [ ] **Step 5: Commit**

---

### Task 5: Invalidação no envio

**Files:**
- Modify: `apps/api-lavperform/src/message-engine/processor/message-processor.ts`
- Test: `apps/api-lavperform/test/unit/message-engine/message-processor.spec.ts` (create if missing)

- [ ] **Step 1: Add failing test for definitive send error invalidation**
- [ ] **Step 2: Implement customer invalidation in catch path**
- [ ] **Step 3: Run unit tests**
- [ ] **Step 4: Commit**

---

### Task 6: Verificação final

- [ ] Run: `npm run test:unit -- --testPathPattern="whatsapp-verification|campaign-customer-resolver|customers.service|message-processor"`
- [ ] Confirm no unrelated files changed

[← Documentation Home](../README.md)

# Technical Backlog

Consolidated technical debt, prioritized by severity and impact.

## Table of Contents
- [High Priority (P0)](#high-priority-p0)
- [Architecture Debt](#architecture-debt)
- [Code Quality Issues](#code-quality-issues)
- [Security Vulnerabilities](#security-vulnerabilities)
- [Testing Gaps](#testing-gaps)

---

## High Priority (P0)

These issues must be resolved immediately as they block functionality or cause security vulnerabilities.

### 1. Missing JwtAuthGuard in ApplicationController

**File:** `src/application/application.controller.ts`
**Severity:** HIGH (Endpoint unusable)
**Impact:** The `/application/preload` endpoint always returns 401 Unauthorized

**Problem:** The controller uses the `@User()` decorator but doesn't have `@UseGuards(AuthGuard('jwt'))` at the class or method level. The decorator relies on `request.user` populated by Passport, which is never populated without the guard.

**Recommendation:** Add `@UseGuards(AuthGuard('jwt'))` to the ApplicationController class.

---

### 2. Auth Service LoginResponse Type Mismatch

**File:** `src/auth/auth.service.ts:84`
**Severity:** HIGH (Blocking tests)
**Impact:** Breaks TypeScript compilation and blocks all integration tests

**Problem:** The `login()` method returns `{ access_token: string }` but the `LoginResponse` interface requires both `access_token` and `user` properties.

**Recommended Fix:**
```typescript
return {
  access_token: jwt,
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    // ... other user properties
  }
};
```

Or make `user` optional in the `LoginResponse` interface.

---

### 3. Companies Service Hardcoded BusinessPartnerId

**File:** `src/companies/companies.service.ts`
**Severity:** MEDIUM (Creates invalid data)
**Impact:** Creating a company without a business partner fails with 500 error due to FK constraint violation

**Problem:** The `create` method uses `businessPartnerId || ''`, defaulting to an empty string instead of `null`.

**Recommended Fix:** Change to `businessPartnerId || null` or just `businessPartnerId`.

---

### 4. Missing Subscription Validation in Companies Service

**File:** `src/companies/companies.service.ts` (`findSubscription`, `findSubscriptionPayments`)
**Severity:** MEDIUM (Runtime error)
**Impact:** 500 error for companies without subscriptions

**Problem:** Code assumes `company.companySubscriptions[0]` exists without checking.

**Recommended Fix:** Add check: `if (company.companySubscriptions.length > 0)` before accessing.

---

## Architecture Debt

### Missing Clean Architecture Boundaries

**Source:** docs/architecture.md
**Impact:** Tight coupling between controllers, services, and persistence

**Issues:**
- No separate domain/application layers
- Services call Prisma directly
- Business logic mixed with infrastructure

**Recommended Actions:**
- [ ] Define allowed dependencies between presentation, application, domain, and infrastructure
- [ ] Create folder layout for layers and codify lint rules to prevent cross-layer leaks
- [ ] Extract cross-cutting concerns (logging/auth/validation) behind interfaces
- [ ] Pilot refactor one module (e.g., Customers) to validate the layering approach

---

### Missing DDD Practices

**Source:** docs/architecture.md
**Impact:** Cross-module coupling and unclear ownership

**Issues:**
- No aggregates or bounded contexts defined
- Modules directly access each other's data
- No clear context boundaries

**Recommended Actions:**
- [ ] Identify bounded contexts (Customers, Orders, Campaigns, Messaging, Billing)
- [ ] Define aggregates/invariants and context ownership
- [ ] Document integration contracts
- [ ] Align module and schema boundaries to contexts
- [ ] Block direct cross-context data access
- [ ] Add anti-corruption layer patterns for inter-context calls

---

### Missing Hexagonal Ports/Adapters

**Source:** docs/architecture.md
**Impact:** Difficult to swap providers and test integrations

**External Services:**
- WhatsApp Evolution API
- Asaas (payments)
- OpenAI
- SMTP (Nodemailer)
- CardápioWeb

**Recommended Actions:**
- [ ] Catalog external dependencies
- [ ] Define port interfaces (messaging, payments, AI, email, webhooks, storage)
- [ ] Implement adapters for current providers and wire via DI
- [ ] Add contract tests/mocks for ports to enable offline testing

---

### Missing CQRS Separation

**Source:** docs/architecture.md
**Impact:** Read/write paths share services, limiting optimization and scalability

**Recommended Actions:**
- [ ] Choose target modules (Orders, Campaigns, Customers) for command/query split
- [ ] Implement command handlers for mutations
- [ ] Implement query handlers/read models for listings/metrics
- [ ] Enforce idempotent command handling
- [ ] Ensure pagination/sorting on queries
- [ ] Measure latency and adjust read models if needed

---

### Missing Repository Abstractions

**Status:** ✅ Auth module completed
**Source:** docs/architecture.md
**Impact:** Persistence leakage into business logic and harder testing

**Progress:**
- ✅ Auth module refactored with repository pattern
- Remaining modules still call Prisma directly

**Recommended Actions:**
- [ ] **Define Base Interfaces**: Create generic `IRepository<T>` if applicable
- [ ] **Create Concrete Interfaces**: Define `I[Entity]Repository` for core aggregates
  - Location: `src/<module>/repositories/interfaces/`
- [ ] **Implement Adapters**: Create `[Entity]PrismaRepository` implementing interface
  - Location: `src/<module>/repositories/prisma/`
- [ ] **Register DI**: Use `useClass` provider in module definition
  - Example: `provide: 'ICustomerRepository', useClass: CustomerPrismaRepository`
- [ ] **Refactor Service**: Inject repository interface using `@Inject('ICustomerRepository')`
- [ ] **Unit Tests**: Mock repository interface in service tests

**See Also:** [Repository Pattern Guide](../guides/repository-pattern-guide.md)

---

### No Event-Driven Boundaries

**Source:** docs/architecture.md
**Impact:** Synchronous coupling between modules and limited extensibility

**Recommended Actions:**
- [ ] Define domain events (CustomerCreated, OrderStatusChanged, CampaignSent, WebhookDelivered)
- [ ] Pick event bus strategy (in-process + queue publishing)
- [ ] Publish events in application/domain layer
- [ ] Add subscribers for cross-module workflows
- [ ] Add DLQ and metrics for event handling

---

## Code Quality Issues

### Integration Test Findings

**Source:** test-integration/technical-debt-integration-tests.md

#### Priority 0 (Immediate)
1. ✅ **CNPJ Generation Invalid** - Already addressed in P0 section above
2. **Missing Authentication Guards** - See ApplicationController issue above
3. **Inconsistent Route Patterns in Orders Controller**
   - **File:** `src/orders/order.controller.ts`
   - **Issue:** Uses `@Param('companyId')` without defining it in route path
   - **Impact:** Parameter won't work as expected
   - **Fix:** Either change to `@Controller('companies/:companyId/orders')` or use query parameters

#### Priority 1 (High)
4. **Missing DTO Validation Documentation**
   - **Impact:** Incomplete test coverage for edge cases, potential validation bypasses
   - **Recommendation:** Add class-validator decorators with constraints, document in JSDoc

5. **Test Data Factories Incomplete**
   - **Issue:** Only CustomerFactory exists; missing for Users, Companies, Orders
   - **Impact:** Inconsistent test setup, duplicated code
   - **Recommendation:** Create factory classes for all major entities

6. **Missing Error Response Testing**
   - **Issue:** Tests check status codes but don't validate error response structure
   - **Impact:** API consumers may receive inconsistent error formats
   - **Recommendation:** Define standard error response DTOs and assert structure

#### Priority 2 (Medium)
7. **Missing Webhook Integration Tests**
   - **Files:** `src/integrations/webhooks/webhooks.controller.ts`, `src/whatsapp/webhook.controller.ts`
   - **Impact:** Webhook contract changes could break integrations
   - **Recommendation:** Create integration tests for all webhook endpoints

8. **Missing Campaign Tests**
   - **Files:** `src/campaigns/campaigns.controller.ts`, `src/automatic-campaign/automatic-campaign.controller.ts`
   - **Impact:** Critical business logic untested
   - **Recommendation:** Create comprehensive campaign integration tests

9. **Missing Link Page Tests**
   - **File:** `src/link-page/link-page.controller.ts`
   - **Impact:** Public-facing feature may have bugs
   - **Recommendation:** Add integration tests for link page creation and access

10. **Missing Onboarding Tests**
    - **File:** `src/onboarding/onboarding.controller.ts`
    - **Impact:** New user experience not tested end-to-end
    - **Recommendation:** Create integration tests covering complete onboarding flow

**See Also:** [Testing Guide](../guides/testing-guide.md)

---

## Security Vulnerabilities

### Critical Severity

#### 1. form-data@4.0.2 - Unsafe Random Function

**CVE:** Unsafe random function
**Impact:** Potential weakening of cryptographic-strength randomness
**Risk:** May affect token generation, boundary values, or security-sensitive operations
**Fix Available:** Yes - upgrade to patched version

---

### High Severity

#### 2. axios@1.8.4 - DoS via data: URLs

**Issue:** Ignores `maxContentLength` / `maxBodyLength` for `data:` URLs
**Impact:** Attacker can force axios to load excessively large payloads into memory
**Risk:** Out-of-memory failures and service degradation
**Fix Available:** Yes - upgrade to patched version

---

#### 3. multer@1.4.5-lts.2 - Multiple DoS Vulnerabilities (4 CVEs)

**Issues:**
- Malformed multipart requests
- Streams not properly closed
- Unhandled error conditions

**Impact:** Upload endpoints become DoS vector
**Risk:** File descriptor exhaustion, memory growth, process crashes
**Fix Available:** Yes - upgrade to patched version

---

#### 4. hono@4.7.10 - Incorrect JWT Audience Validation

**Issue:** JWT audience (`aud`) validation flaw
**Impact:** Tokens meant for one service may be incorrectly accepted by another
**Risk:** Authorization boundary weakness in multi-service environments
**Fix Available:** Yes - upgrade to patched version

---

#### 5. jws@3.2.2 - HMAC Signature Validation Flaw

**Issue:** Flawed validation logic for HMAC signatures (e.g., HS256)
**Impact:** Compromises integrity guarantees for JWTs
**Risk:** Potential acceptance of forged or tampered tokens
**Fix Available:** Yes - upgrade to patched version

---

#### 6. valibot@1.1.0 - Regular Expression Denial of Service (ReDoS)

**Issue:** ReDoS in `EMOJI_REGEX`
**Impact:** Crafted inputs trigger excessive CPU consumption during validation
**Risk:** Response time spikes and thread starvation
**Fix Available:** Yes - upgrade to patched version

---

#### 7. validator@13.15.0 - Length Validation Bypass

**Issue:** `isLength()` doesn't account for Unicode variation selectors
**Impact:** Inputs appear shorter than actual size
**Risk:** DoS, truncation issues, incorrect size constraint enforcement
**Fix Available:** Yes - upgrade to patched version

---

### Security Remediation Phases

**Phase 1: Critical (Immediate)**
- [ ] Upgrade form-data to latest version
- [ ] Review and update all token generation code

**Phase 2: High Availability Risks**
- [ ] Upgrade axios, multer, valibot, validator
- [ ] Add request size limits
- [ ] Implement rate limiting

**Phase 3: High Auth/Authz Risks**
- [ ] Upgrade hono and jws
- [ ] Review JWT implementation
- [ ] Add comprehensive JWT validation tests

---

## Testing Gaps

### Unit Test Gaps

**Source:** qa/unit-testing-plan.md

**Priority Areas:**
- **Decorators**: `src/common/decorators/company.decorator.ts`, `src/common/decorators/user.decorator.ts`
  - Coverage for happy path and exception scenarios

- **Global Exception Filter**: `src/common/filters/global.filter.ts`
  - Test each branch (401/400/404/403/500)
  - Verify Sentry integration

- **SMTP Helper**: `src/common/smtp/smtp.ts`
  - Mock `createTransport`/`sendMail`
  - Test success and error paths

- **Queue Wiring & Processors**:
  - `src/common/queue/queue.module.ts` - Validate Redis config
  - `src/customers/customers.processor.ts` - Cover retry logic

---

### Integration Test Coverage Needed

**Current Coverage:** 24 tests (Auth: 7, Campaigns: 8, Orders: 9)

**Missing Coverage:**
- Webhooks (Asaas, WhatsApp)
- Full campaign lifecycle
- Link pages
- Onboarding flows
- Customers module
- Companies module
- Messages module

**Target:** 70% integration coverage

**See Also:** [Testing Guide](../guides/testing-guide.md)

---

## Additional Backlog Items

### No CI/CD Pipeline

**Source:** docs/architecture.md
**Impact:** Manual or undefined delivery path

**Recommended Actions:**
- [ ] Add CI workflow (lint, test, build, prisma migrate diff) on PR
- [ ] Publish coverage/artifacts from CI
- [ ] Define CD steps (image build, migration deploy, rollout)
- [ ] Document environments

---

### Security/RBAC Gaps

**Source:** PRD §6
**Impact:** OAuth2 and granular roles not implemented

**Recommended Actions:**
- [ ] Add OAuth2 client-credentials issuance/validation
- [ ] Define tenant-scoped roles/permissions
- [ ] Enforce via guards
- [ ] Add role-based tests per endpoint
- [ ] Document scopes, rotation, secrets management

---

### Rate Limiting and HMAC Webhook Signing

**Source:** PRD §7, §6
**Impact:** Abuse/spam risk and weaker webhook authenticity

**Recommended Actions:**
- [ ] Implement per-tenant rate limiting middleware/guard
- [ ] Add HMAC + timestamp signing for outbound webhooks with replay window
- [ ] Provide verification examples/tests
- [ ] Log signature failures
- [ ] Monitor rate-limit rejections and webhook validation errors

---

### Idempotency Keys Missing

**Source:** PRD §6
**Impact:** Risk of duplicate processing for order/campaign mutations

**Recommended Actions:**
- [ ] Define idempotency key storage keyed by tenant + operation + key
- [ ] Enforce idempotent handling on POST/PUT/PATCH for orders/campaigns
- [ ] Add TTL/cleanup and collision handling
- [ ] Test concurrent duplicate submissions

---

### Observability Gaps

**Source:** PRD §6
**Impact:** Weak traceability and SLO tracking

**Recommended Actions:**
- [ ] Add structured request/response logging with PII redaction
- [ ] Emit metrics (latency, error codes, queue stats)
- [ ] Set SLO dashboards
- [ ] Implement audit log for core mutations (contacts, orders, permissions, webhooks)
- [ ] Add correlation IDs and tracing spans across HTTP/queue flows

---

### Reliability Gaps

**Source:** PRD §7
**Impact:** Fragile integrations

**Recommended Actions:**
- [ ] Add retry with jitter and timeouts per external adapter
- [ ] Implement circuit breakers per provider with health checks
- [ ] Define fallback behaviors where applicable
- [ ] Monitor failure rates and breaker states

---

### Performance/SLO Gaps

**Source:** PRD §7
**Impact:** Risk of missing p95 targets (<200ms reads, <500ms writes)

**Recommended Actions:**
- [ ] Define p95/p99 budgets per endpoint
- [ ] Instrument measurements
- [ ] Review indexes for high-cardinality filters
- [ ] Add missing indexes
- [ ] Add caching for safe read paths with invalidation rules
- [ ] Load-test critical flows to validate targets

---

### GDPR/Data Lifecycle Gaps

**Source:** PRD §10, §7
**Impact:** Compliance risk

**Recommended Actions:**
- [ ] Implement hard-delete job for soft-deleted records per tenant request
- [ ] Add tenant data export with PII redaction where required
- [ ] Track consent history and enforce in messaging
- [ ] Document retention policies and automate enforcement

---

### Data Import/Export Tooling Missing

**Source:** PRD §6, §13
**Impact:** v1.1 capabilities blocked

**Recommended Actions:**
- [ ] Build bulk import endpoints/workers for CSV/JSON (contacts, orders)
- [ ] Add validation and partial-failure reports
- [ ] Add export jobs/endpoints for orders, feedback, campaign metrics
- [ ] Throttle imports to protect DB/queues
- [ ] Expose progress
- [ ] Test with 10k+ record datasets

---

### Webhook DLQ/Monitoring

**Source:** PRD §11, §7
**Impact:** Lower delivery success and operability

**Recommended Actions:**
- [ ] Ensure queues have DLQ with retries/backoff configured
- [ ] Add dashboards/alerts for webhook success, retries, DLQ depth
- [ ] Provide replay tooling for DLQed webhooks
- [ ] Document operational runbooks

---

### Campaign Segmentation/Consent Checks

**Source:** PRD §6, §14
**Impact:** Marketing flows and abuse mitigations incomplete

**Recommended Actions:**
- [ ] Implement consent flags and channel preferences on contacts
- [ ] Enforce consent checks and suppression lists in send pipeline
- [ ] Add segmentation rules (recency/frequency/value, tags) per PRD
- [ ] Validate segmentation outputs and log exclusions

---

### Swagger/OAS Gaps

**Source:** PRD §15
**Impact:** API usability gaps

**Recommended Actions:**
- [ ] Add request/response examples for all endpoints
- [ ] Document error codes, pagination, idempotency, rate limits in OAS
- [ ] Generate/publish OAS in CI
- [ ] Add contract tests to keep docs in sync

---

## Migration Roadmap

### Repository Pattern Migration

**Phase 1: High Severity** (Direct Prisma Usage)
1. ✅ `src/auth` - **COMPLETED**
2. `src/metrics`
3. `src/dashboard`
4. `src/application`

**Phase 2: Medium Severity** (Hybrid Usage)
5. `src/onboarding`
6. `src/companies`
7. `src/automatic-campaign`
8. `src/link-page`
9. `src/courses`

**Phase 3: Low Severity**
10. Other modules as needed

**See Also:** [Repository Pattern Guide](../guides/repository-pattern-guide.md)

---

## See Also

- [Product & Technical Roadmap](../ROADMAP.md) - Strategic phases and implementation timeline
- [Architecture Overview](../02-ARCHITECTURE.md) - Current architecture and identified gaps
- [Repository Pattern Guide](../guides/repository-pattern-guide.md) - How to refactor modules
- [Testing Guide](../guides/testing-guide.md) - Testing strategy and practices
- [Product Requirements](../01-PRODUCT.md) - Feature requirements and acceptance criteria

---
**Navigation:** [← Home](../README.md) | [Architecture →](../02-ARCHITECTURE.md)

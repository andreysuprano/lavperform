[← Documentation Home](./README.md)

# FoodCRM API Roadmap

Strategic roadmap for platform evolution, combining product features and technical improvements.

## Table of Contents
- [Overview](#overview)
- [Current State](#current-state)
- [Phase 0: Foundation & Critical Fixes](#phase-0-foundation--critical-fixes)
- [Phase 1: Architecture & Stability](#phase-1-architecture--stability)
- [Phase 2: Feature Completeness](#phase-2-feature-completeness)
- [Phase 3: Scale & Advanced Features](#phase-3-scale--advanced-features)
- [Phase 4: Platform Maturity](#phase-4-platform-maturity)
- [Security Remediation Timeline](#security-remediation-timeline)
- [Repository Pattern Migration Tracker](#repository-pattern-migration-tracker)
- [Success Metrics & KPIs](#success-metrics--kpis)
- [Dependencies & Prerequisites](#dependencies--prerequisites)

---

## Overview

### Vision
Build a reliable, scalable, and maintainable FoodCRM API that serves as the backbone for restaurant customer relationship management, supporting multi-channel campaigns, real-time order processing, and data-driven marketing.

### Goals
1. **Stability**: Eliminate critical bugs and security vulnerabilities
2. **Architecture**: Establish clean, testable, and maintainable code patterns
3. **Features**: Deliver complete PRD functionality for v1.0 launch
4. **Performance**: Achieve <200ms p95 read latency, <500ms write latency
5. **Scale**: Support horizontal scaling and event-driven patterns

### Roadmap Organization
This roadmap is organized into **5 implementation phases**, each with clear themes, deliverables, and success metrics. Phases are designed to be completed sequentially, with each phase building on the previous one's foundation.

---

## Current State

### ✅ Completed
- **Repository Pattern**: Auth module fully migrated with clean architecture
- **Testing Infrastructure**: 24 integration tests with Testcontainers (Auth: 7, Campaigns: 8, Orders: 9)
- **Builder Pattern**: 5 test data builders (User, Company, Campaign, Customer, Order)
- **Test Fixtures**: 8 reusable test scenarios
- **Documentation**: Comprehensive docs reorganized and consolidated
- **Quality Tools**: ESLint, Semgrep, Trivy integrated

### 🚧 In Progress
- Repository pattern migration for remaining modules
- Integration test coverage expansion
- Security vulnerability remediation

### ⚠️ Known Gaps
- **4 P0 bugs** blocking functionality
- **8 HIGH severity** security vulnerabilities
- **Repository pattern** - 9 modules remaining
- **Integration tests** - Major modules uncovered (Webhooks, Companies, Customers, Onboarding)
- **Architecture** - Missing Clean Architecture boundaries, DDD, CQRS
- **Product features** - Campaign segmentation, data import/export, webhook DLQ

---

## Phase 0: Foundation & Critical Fixes

**Goal:** Ensure system stability and eliminate blocking issues

### Themes
1. Critical Bug Resolution
2. High-Risk Security Remediation
3. Essential Infrastructure Fixes

### Key Deliverables

#### 1. Critical Bug Fixes (4 items)

**1.1 Fix Missing JwtAuthGuard in ApplicationController**
- **File**: `src/application/application.controller.ts`
- **Issue**: `/application/preload` endpoint always returns 401
- **Fix**: Add `@UseGuards(AuthGuard('jwt'))` to controller

**1.2 Fix Auth Service LoginResponse Type Mismatch**
- **File**: `src/auth/auth.service.ts:84`
- **Issue**: Breaks TypeScript compilation, blocks all tests
- **Fix**: Add `user` object to login response or make it optional in interface

**1.3 Fix Companies Service BusinessPartnerId Default**
- **File**: `src/companies/companies.service.ts`
- **Issue**: Empty string causes FK constraint violation
- **Fix**: Change `businessPartnerId || ''` to `businessPartnerId || null`

**1.4 Add Subscription Validation in Companies Service**
- **File**: `src/companies/companies.service.ts`
- **Issue**: 500 error when accessing companies without subscriptions
- **Fix**: Add null check before accessing `companySubscriptions[0]`

#### 2. Critical Security Fixes (2 CVEs)

**2.1 Upgrade hono (CVE-2025-62610)**
- **Severity**: HIGH - Improper Authorization
- **Current**: 4.7.10
- **Target**: 4.10.2+
- **Impact**: Authorization bypass vulnerability

**2.2 Upgrade jws (CVE-2025-65945)**
- **Severity**: HIGH - Improper signature verification
- **Current**: 3.2.2
- **Target**: 3.2.3+ or 4.0.1+
- **Impact**: JWT signature validation can be bypassed in HS256 algorithm

### Success Metrics
- ✅ 0 P0 bugs remaining
- ✅ 0 critical security CVEs (auth/authorization)
- ✅ All integration tests passing
- ✅ TypeScript compilation successful

### Dependencies
- None (foundation phase)

---

## Phase 1: Architecture & Stability

**Goal:** Establish clean architecture patterns and improve platform reliability

### Themes
1. Repository Pattern Migration
2. Clean Architecture Implementation
3. Test Coverage Expansion
4. Security Hardening (DoS vulnerabilities)

### Key Deliverables

#### 1. Repository Pattern Migration (9 modules)

**High Priority:**
- `src/metrics` - Direct Prisma usage
- `src/dashboard` - Direct Prisma usage
- `src/application` - Direct Prisma usage

**Medium Priority:**
- `src/onboarding` - Hybrid usage
- `src/companies` - Hybrid usage
- `src/automatic-campaign` - Hybrid usage
- `src/link-page` - Hybrid usage
- `src/courses` - Hybrid usage
- Other modules as needed

**Implementation per module:**
- Create domain entities
- Define repository interfaces
- Implement Prisma repositories with mappers
- Refactor services to use repositories
- Update module providers
- Add unit tests for entities, mappers, repositories, services

#### 2. Clean Architecture Pilot

**Pilot Module**: Customers

**Actions:**
- Define layer boundaries (domain, application, infrastructure, presentation)
- Create folder structure
- Implement domain entities and business logic
- Extract ports/adapters for external dependencies
- Add architectural linting rules
- Document patterns and guidelines

#### 3. Test Coverage Expansion

**Unit Tests:**
- Decorators (`company.decorator.ts`, `user.decorator.ts`)
- Global exception filter (`global.filter.ts`)
- SMTP helper (`smtp.ts`)
- Queue module and processors

**Integration Tests:**
- Webhooks (Asaas, WhatsApp)
- Companies module
- Customers module
- Onboarding flows
- **Target**: 70% integration test coverage

#### 4. Security Remediation (6 CVEs)

**4.1 Upgrade multer (4 CVEs)**
- **Current**: 1.4.5-lts.2
- **Target**: 2.0.2+
- **Issues**: DoS via memory leaks, malformed requests, unhandled exceptions
- **Impact**: Upload endpoints vulnerable to DoS attacks

**4.2 Upgrade valibot (CVE-2025-66020)**
- **Current**: 1.1.0
- **Target**: 1.2.0+
- **Issue**: ReDoS in `EMOJI_REGEX`
- **Impact**: CPU exhaustion from crafted inputs

**4.3 Upgrade validator (CVE-2025-12758)**
- **Current**: 13.15.0
- **Target**: 13.15.22+
- **Issue**: Length validation bypass with Unicode
- **Impact**: Size constraint bypass, potential DoS

### Success Metrics
- ✅ 70% of modules migrated to repository pattern
- ✅ Clean Architecture pilot completed with documentation
- ✅ 70% integration test coverage
- ✅ 90% unit test coverage for business logic
- ✅ 0 HIGH security CVEs remaining
- ✅ All quality tool checks passing (ESLint, Semgrep, Trivy)

### Dependencies
- Phase 0 completion (critical bugs and security fixes)

---

## Phase 2: Feature Completeness

**Goal:** Deliver complete PRD functionality and product parity

### Themes
1. Campaign & Marketing Features
2. Integration Enhancements
3. Data Management Tools
4. API Completeness

### Key Deliverables

#### 1. Campaign Segmentation

**Features:**
- Implement consent flags and channel preferences on contacts
- Enforce consent checks in send pipeline
- Add segmentation rules (recency/frequency/value, tags)
- Create suppression list handling
- Validate segmentation outputs and log exclusions

#### 2. Webhook Improvements

**Features:**
- Implement DLQ (Dead Letter Queue) with retry/backoff
- Add dashboards/alerts for webhook success, retries, DLQ depth
- Provide replay tooling for failed webhooks
- Document operational runbooks
- Add webhook signature validation tests

#### 3. Data Import/Export

**Features:**
- Bulk CSV/JSON import for contacts and orders
- Validation and partial-failure reports
- Export jobs for orders, feedback, campaign metrics
- Throttling to protect DB/queues
- Progress tracking
- Test with 10k+ record datasets

#### 4. Rate Limiting & HMAC Signing

**Features:**
- Per-tenant rate limiting middleware/guard
- HMAC + timestamp signing for outbound webhooks
- Replay window protection
- Verification examples and tests
- Monitoring for rate-limit rejections and signature failures

#### 5. Idempotency Keys

**Features:**
- Idempotency key storage (tenant + operation + key)
- Enforce on POST/PUT/PATCH for orders and campaigns
- TTL/cleanup handling
- Collision detection
- Test concurrent duplicate submissions

### Success Metrics
- ✅ All PRD MVP features implemented
- ✅ 99.9% API availability
- ✅ <0.5% error rate on validated requests
- ✅ Campaign segmentation live in production
- ✅ Webhook delivery success ≥98% after retries
- ✅ Bulk import processes 10k records within 5 minutes

### Dependencies
- Phase 1 completion (stable architecture and security)

---

## Phase 3: Scale & Advanced Features

**Goal:** Optimize performance and implement advanced architectural patterns

### Themes
1. Performance Optimization
2. Event-Driven Architecture
3. Advanced Observability
4. CQRS Implementation

### Key Deliverables

#### 1. CQRS Implementation

**Target Modules**: Orders, Campaigns, Customers

**Features:**
- Separate command handlers for mutations
- Query handlers and read models for listings/metrics
- Idempotent command handling
- Pagination/sorting on queries
- Performance measurement and optimization

#### 2. Event-Driven Patterns

**Features:**
- Define domain events (CustomerCreated, OrderStatusChanged, CampaignSent, WebhookDelivered)
- Implement event bus strategy (in-process + queue publishing)
- Publish events in application/domain layer
- Add subscribers for cross-module workflows
- Implement DLQ and metrics for event handling

#### 3. Performance Optimization

**Targets:**
- p95 <200ms for read operations
- p95 <500ms for write operations

**Actions:**
- Define p95/p99 budgets per endpoint
- Instrument latency measurements
- Review and add database indexes for high-cardinality filters
- Implement caching for safe read paths with invalidation
- Load-test critical flows
- Optimize N+1 queries

#### 4. Advanced Observability

**Features:**
- Structured request/response logging with PII redaction
- Emit metrics (latency, error codes, queue stats)
- Set up SLO dashboards
- Implement audit log for core mutations
- Add correlation IDs and distributed tracing spans
- Monitor business metrics (orders/hour, campaign conversion rates)

#### 5. Reliability Improvements

**Features:**
- Retry with jitter and timeouts per external adapter
- Circuit breakers per provider with health checks
- Fallback behaviors for degraded dependencies
- Monitor failure rates and breaker states

### Success Metrics
- ✅ p95 <200ms for reads, <500ms for writes
- ✅ CQRS implemented in 3 modules
- ✅ Event-driven patterns active for cross-module workflows
- ✅ 99.95% uptime (improved from 99.9%)
- ✅ Full distributed tracing coverage
- ✅ Circuit breakers preventing cascading failures

### Dependencies
- Phase 2 completion (feature completeness)
- Repository pattern at 90%+ coverage

---

## Phase 4: Platform Maturity

**Goal:** Achieve enterprise-grade platform with full automation and compliance

### Themes
1. CI/CD Automation
2. Advanced Testing
3. GDPR Compliance
4. Platform Scalability

### Key Deliverables

#### 1. CI/CD Pipeline

**Features:**
- Automated lint, test, build on PR
- Prisma migration validation (`migrate diff`)
- Coverage reporting and enforcement
- Automated deployments per environment
- Blue/green deployment strategy
- Rollback procedures
- Environment-specific configuration

#### 2. Advanced Testing

**Contract Testing:**
- Implement Pact for consumer-driven contracts
- Set up Pact Broker
- Create consumer tests for frontend expectations

**Performance Testing:**
- Load testing suite for critical endpoints
- Stress testing for peak scenarios
- Endurance testing for memory leaks

**Advanced Patterns:**
- Property-based testing with `fast-check`
- Mutation testing with `@stryker-mutator`
- Chaos engineering experiments

#### 3. GDPR Compliance

**Features:**
- Hard-delete job for soft-deleted records per tenant request
- Tenant data export with PII redaction
- Consent history tracking and enforcement
- Data retention policies with automated enforcement
- Right to be forgotten implementation
- Data processing agreements

#### 4. Platform Scalability

**Features:**
- Horizontal scaling documentation and testing
- Database read replicas for query scaling
- Redis cluster for distributed caching
- Queue partitioning strategies
- Multi-region deployment planning

#### 5. DDD & Bounded Contexts

**Features:**
- Identify and document bounded contexts (Customers, Orders, Campaigns, Messaging, Billing)
- Define aggregates and invariants
- Establish context ownership
- Document integration contracts
- Implement anti-corruption layers

### Success Metrics
- ✅ Fully automated CI/CD with <15min deploy time
- ✅ 90% overall test coverage
- ✅ 0% flaky tests
- ✅ GDPR compliance audit passed
- ✅ Successful load tests at 10x expected traffic
- ✅ <5 minute MTTR for production issues

### Dependencies
- Phase 3 completion (performance and observability)
- Architecture maturity (CQRS, events)

---

## Security Remediation Timeline

Comprehensive security vulnerability fix schedule based on risk assessment.

### Phase 0: Critical (Auth/Authorization)
**Timeline**: Immediate

| CVE | Package | Severity | Current | Fixed | Impact |
|-----|---------|----------|---------|-------|--------|
| CVE-2025-62610 | hono | HIGH | 4.7.10 | 4.10.2+ | Improper Authorization - auth bypass |
| CVE-2025-65945 | jws | HIGH | 3.2.2 | 3.2.3, 4.0.1 | HS256 signature validation bypass |

**Risk**: Authorization and authentication vulnerabilities can lead to data breaches
**Priority**: P0 - Fix before any other work

---

### Phase 1: High (DoS & Data Integrity)
**Timeline**: After Phase 0, before Phase 2

| CVE | Package | Severity | Current | Fixed | Impact |
|-----|---------|----------|---------|-------|--------|
| CVE-2025-47935 | multer | HIGH | 1.4.5-lts.2 | 2.0.0+ | DoS via memory leaks from unclosed streams |
| CVE-2025-47944 | multer | HIGH | 1.4.5-lts.2 | 2.0.0+ | DoS from maliciously crafted requests |
| CVE-2025-48997 | multer | HIGH | 1.4.5-lts.2 | 2.0.1+ | DoS via unhandled exception |
| CVE-2025-7338 | multer | HIGH | 1.4.5-lts.2 | 2.0.2+ | Multer Denial of Service |
| CVE-2025-66020 | valibot | HIGH | 1.1.0 | 1.2.0+ | ReDoS in `EMOJI_REGEX` - CPU exhaustion |
| CVE-2025-12758 | validator | HIGH | 13.15.0 | 13.15.22+ | Length validation bypass |

**Risk**: Denial of service attacks can affect availability (99.9% SLA at risk)
**Priority**: P1 - Fix during architecture stability phase

---

### Remediation Actions

**Phase 0:**
1. Update `package.json` with new versions for hono and jws
2. Run `npm install` to update lock file
3. Test authentication flows thoroughly
4. Verify JWT signature validation
5. Run full integration test suite
6. Deploy to staging for validation
7. Deploy to production with monitoring

**Phase 1:**
1. Update multer to 2.0.2+, valibot to 1.2.0+, validator to 13.15.22+
2. Test file upload functionality
3. Test validation logic with edge cases
4. Load test upload endpoints for DoS prevention
5. Monitor resource usage post-deployment

---

## Repository Pattern Migration Tracker

Track progress of repository pattern migration across all modules.

### Migration Status

| Module | Status | Phase | Complexity | Notes |
|--------|--------|-------|------------|-------|
| **auth** | ✅ Complete | - | High | Reference implementation |
| **metrics** | ⏳ Pending | 1 | High | Direct Prisma usage |
| **dashboard** | ⏳ Pending | 1 | High | Direct Prisma usage |
| **application** | ⏳ Pending | 1 | Medium | Direct Prisma usage |
| **onboarding** | ⏳ Pending | 1 | Medium | Hybrid usage |
| **companies** | ⏳ Pending | 1 | Medium | Hybrid usage |
| **automatic-campaign** | ⏳ Pending | 1 | Medium | Hybrid usage |
| **link-page** | ⏳ Pending | 1 | Low | Hybrid usage |
| **courses** | ⏳ Pending | 1 | Low | Hybrid usage |
| **customers** | ⏳ Pending | 1 | Medium | Clean Architecture pilot |
| **orders** | ⏳ Pending | 2 | High | Complex domain model |
| **campaigns** | ⏳ Pending | 2 | High | Complex domain model |
| **messages** | ⏳ Pending | 2 | Medium | Queue integration |
| **webhooks** | ⏳ Pending | 2 | Medium | External integration |

**Progress**: 1/14 modules (7%)
**Target Phase 1**: 10/14 modules (70%)
**Target Phase 2**: 14/14 modules (100%)

### Migration Checklist (Per Module)

- [ ] Analysis phase - identify entities and operations
- [ ] Create domain entities
- [ ] Define repository interfaces
- [ ] Create mappers
- [ ] Implement Prisma repositories
- [ ] Refactor service layer
- [ ] Update module providers
- [ ] Write entity tests
- [ ] Write mapper tests
- [ ] Write repository tests
- [ ] Update service tests
- [ ] Integration tests passing
- [ ] Code review and documentation

**Reference:** See [Repository Pattern Guide](./guides/repository-pattern-guide.md) for detailed migration steps.

---

## Success Metrics & KPIs

### Phase 0 Metrics
- **Bugs**: 0 P0 bugs remaining
- **Security**: 0 critical CVEs (auth/authorization)
- **Tests**: 100% integration test pass rate
- **Build**: TypeScript compilation successful

### Phase 1 Metrics
- **Architecture**: 70% repository pattern coverage
- **Testing**: 70% integration coverage, 90% unit coverage for business logic
- **Security**: 0 HIGH CVEs remaining
- **Quality**: All ESLint, Semgrep, Trivy checks passing

### Phase 2 Metrics
- **Features**: 100% PRD MVP features implemented
- **Availability**: 99.9% monthly uptime
- **Reliability**: <0.5% error rate on validated requests
- **Webhooks**: ≥98% delivery success after retries
- **Performance**: Bulk imports process 10k records in <5 minutes

### Phase 3 Metrics
- **Performance**: p95 <200ms reads, <500ms writes
- **Architecture**: CQRS in 3 core modules
- **Availability**: 99.95% uptime
- **Observability**: 100% request tracing coverage

### Phase 4 Metrics
- **Automation**: <15min CI/CD deploy time
- **Testing**: 90% overall coverage, 0% flaky tests
- **Compliance**: GDPR audit passed
- **Scale**: Successful load tests at 10x expected traffic
- **Reliability**: <5min MTTR for production issues

### Business Impact Metrics
- **API Latency**: Improve from baseline to <200ms p95
- **Error Rate**: Reduce from baseline to <0.5%
- **Availability**: Improve from baseline to 99.95%
- **Developer Velocity**: 50% faster feature delivery post-Phase 1
- **Test Confidence**: 90% coverage enables rapid iteration

---

## Dependencies & Prerequisites

### External Dependencies
- **PostgreSQL**: Primary data store
- **Redis**: Caching and Bull queues
- **Testcontainers**: Integration testing (PostgreSQL + Redis)
- **External APIs**: WhatsApp Evolution, Asaas, OpenAI, SMTP
- **Security Tools**: Trivy, Semgrep

### Technical Prerequisites

**For Phase 0:**
- None (foundation work)

**For Phase 1:**
- Phase 0 completion
- Repository pattern reference (Auth module)
- Testing infrastructure in place

**For Phase 2:**
- Phase 1 completion
- Stable architecture (repository pattern at 70%+)
- Good test coverage foundation

**For Phase 3:**
- Phase 2 completion
- Repository pattern at 90%+
- Observability infrastructure

**For Phase 4:**
- Phase 3 completion
- Event-driven patterns established
- Performance targets met

### Team Skills Required
- **Phase 0-1**: NestJS, TypeScript, Prisma, Testing
- **Phase 2**: Domain modeling, API design, Integration patterns
- **Phase 3**: Performance optimization, Event-driven architecture, Observability
- **Phase 4**: DevOps, CI/CD, Advanced testing patterns, Compliance

---

## See Also

### Planning & Strategy
- [Product Requirements](./01-PRODUCT.md) - Complete PRD with functional requirements
- [Technical Backlog](./planning/technical-backlog.md) - Detailed technical debt items

### Architecture & Patterns
- [Architecture Overview](./02-ARCHITECTURE.md) - Current state and architecture decisions
- [Repository Pattern Guide](./guides/repository-pattern-guide.md) - Migration implementation guide
- [Repository Pattern Examples](./reference/repository-pattern-examples.md) - Code samples

### Testing & Quality
- [Testing Guide](./guides/testing-guide.md) - Testing strategy and best practices
- [API Reference](./03-API-REFERENCE.md) - Endpoint documentation

### Reference
- [Database Schema](./reference/database-schema.md) - Prisma schema documentation
- [External Integrations](./reference/external-integrations.md) - Third-party services

---
**Navigation:** [← Home](./README.md) | [Technical Backlog →](./planning/technical-backlog.md)

---
**Last Updated**: 2025-12-25
**Status**: Living document - updated as priorities evolve

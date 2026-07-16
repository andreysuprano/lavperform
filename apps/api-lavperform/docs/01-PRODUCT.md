# FoodCRM API – Product Requirements Document (PRD)

## 1. Context and Purpose
- FoodCRM centralizes restaurant customer relationships, orders, feedback, and campaigns across channels. This PRD covers the API surfaces consumed by web/mobile clients and partner integrations.
- Objectives: deliver reliable CRUD access to core entities (accounts, contacts, locations, menus, orders, feedback), support campaign automation, and expose analytics hooks.
- Success criteria: API consumers can build end-to-end customer journeys with <200 ms p95 latency for core reads, <500 ms p95 for writes, 99.9% monthly availability, and error rate <0.5% on validated requests.

## 2. Problem Statement and Goals
- Provide a single source of truth for restaurants to manage customers, orders, and communications.
- Enable marketing teams to segment audiences and trigger campaigns without engineering support.
- Support partners to ingest orders and sync statuses via secure, well-documented APIs.

## 3. Non-Goals
- No in-product campaign content editor (assumed handled by frontends).
- No payment processing or PCI storage in this release.
- No real-time warehouse-grade analytics; only operational metrics and exports.

## 4. Target Users and Personas
- Restaurant operators: manage locations, menus, orders, and feedback.
- Marketing managers: build segments, trigger campaigns, track conversions.
- Integrators/partners: push/pull orders, customer updates, and status webhooks.
- Support agents: view customer history and resolve issues.

## 5. User Scenarios (Happy Path)
- Operator creates a location, uploads menu, receives online orders, updates order status, and captures feedback.
- Marketing manager defines a segment (e.g., last-30-day diners with >$50 LTV) and triggers an email/SMS campaign; conversions are tracked.
- Partner posts an order via API, receives status webhooks, and reconciles fulfilled/cancelled states.
- Support agent searches a customer, views history, updates contact preferences, and issues a make-good coupon.

## 6. Functional Requirements
- Authentication & Authorization
  - Support OAuth2 client credentials for service-to-service and JWT for user sessions.
  - Role-based access (admin, operator, marketing, support, integrator); enforce per-tenant scoping.
- Tenancy
  - All entities scoped by tenant; cross-tenant access is prohibited.
- Core Entities
  - Contacts: CRUD, consent flags, preferences, tags, loyalty attributes (points, tier, LTV).
  - Locations: CRUD, hours, service types (dine-in, pickup, delivery), throttling windows.
  - Menus/Items: CRUD menu sections, items, modifiers, availability windows; price versions with effective dates.
  - Orders: create/update with status transitions (placed → accepted → in_progress → ready → completed/cancelled); support delivery/pickup; attach line items, discounts, taxes, tips, fees.
  - Feedback: capture CSAT/NPS, comments, optional attachments; link to order and contact.
  - Campaigns: define target segments (rule-based), channel (email/SMS/push), content reference, schedule, and status; record sends, bounces, clicks, conversions.
- Integrations
  - Webhooks: configurable per tenant; retry with backoff; signature validation; event types: order.status_changed, feedback.created, contact.updated, campaign.delivery.
  - Imports/Exports: bulk CSV/JSON import for contacts and orders; exports for orders, feedback, and campaign metrics.
- Search and Filtering
  - Paginated, filterable list endpoints for contacts, orders, feedback, and campaigns; server-side sorting; text search on contact name/email/phone.
- Validation and Idempotency
  - Idempotency keys for POST/PUT/PATCH on orders and campaigns.
  - Strong validation for emails/phones, currency formats, time zones.
- Observability
  - Request/response logging (PII redaction), metrics (latency, error codes), structured audit log for changes to contacts, orders, permissions, and webhooks.

## 7. Non-Functional Requirements
- Performance: p95 latency targets above; bulk imports must process 10k records within 5 minutes.
- Availability: 99.9% monthly for public APIs; webhook delivery success ≥98% after retries.
- Security & Compliance: TLS 1.2+, OWASP top 10 mitigations, rate limiting per tenant, signed webhooks (HMAC), GDPR-friendly data deletion/export, secrets managed via environment variables/secret store.
- Scalability: horizontal scaling for stateless services; queue-based processing for webhooks and bulk operations.
- Reliability: retries with jitter for outbound calls; circuit breakers for third-party providers; idempotent handlers.
- Data Integrity: transactional writes for order + payments metadata; strong referential integrity.

## 8. Domain Model (high level)
- Tenants own locations, contacts, orders, feedback, campaigns, webhooks.
- Orders link to contacts (optional) and locations; contain line items, modifiers, discounts, taxes, tips, and status history.
- Campaigns reference segments and content; deliveries and conversions recorded per contact.

## 9. API Surfaces (representative)
- Authentication: `/auth/token` (client credentials) and JWT validation for user flows.
- Contacts: `GET /contacts`, `POST /contacts`, `PATCH /contacts/{id}`, `GET /contacts/{id}`, `DELETE /contacts/{id}`.
- Orders: `POST /orders` (idempotent), `GET /orders`, `GET /orders/{id}`, `PATCH /orders/{id}/status`.
- Feedback: `POST /orders/{id}/feedback`, `GET /feedback`.
- Campaigns: `POST /campaigns`, `GET /campaigns`, `PATCH /campaigns/{id}`, `POST /campaigns/{id}/send`, `GET /campaigns/{id}/metrics`.
- Webhooks: `POST /webhooks`, `GET /webhooks`, signature header `X-FoodCRM-Signature`, retries with exponential backoff and max attempts.

## 10. Data and Storage
- Primary relational store with migrations (see Prisma); enforce unique constraints on contact email/phone per tenant.
- Soft deletes for contacts and orders; hard delete job for GDPR requests.
- Audit log stored append-only; redact PII where required.
- File storage (object store) for attachments if needed (out of scope for MVP).

## 11. Eventing and Workflows
- Webhook delivery via queue worker; retries at 1m, 5m, 30m intervals; dead-letter after max attempts with alerting.
- Campaign send pipeline: segment resolution → content rendering → provider dispatch → delivery/engagement tracking.
- Order status transitions validated against allowed state machine; emit events for observability and webhooks.

## 12. Metrics and KPIs
- Product: active tenants, active contacts, order volume, GMV, campaign sends, delivery rate, open/click/conversion rates, feedback response rate.
- Reliability: availability, p95/p99 latency, webhook success rate, retry volume, DLQ depth.
- Data quality: duplicate rate on contacts, invalid contact details, bounced messages.

## 13. Release Scope and Phasing
- MVP (v1): contacts, locations, orders, feedback, webhooks, basic campaigns (rule-based segments, send via provider), audit logging, rate limits, idempotency keys.
- v1.1: bulk imports/exports, advanced segmentation, throttling for busy locations, menu versioning improvements.
- v1.2: conversion tracking, A/B experiments, richer analytics exports, multi-channel consent management.

## 14. Risks and Mitigations
- Data integrity across tenants → enforce per-tenant constraints and authorization checks in every resolver.
- Webhook failures at scale → queue with retries, DLQ monitoring, signing + timestamp to prevent replay.
- Campaign abuse/spam → per-tenant send caps, consent checks, provider feedback loops, bounce suppression.
- Latency regression on list endpoints → indexes on high-cardinality filters, pagination limits, caching where safe.

## 15. Acceptance Criteria
- All endpoints authenticated and enforce tenant isolation.
- Order and campaign POST/PUT/PATCH support idempotency keys and return consistent responses.
- Webhooks are signed, retried, and can be validated via docs examples.
- Observability: structured logs, metrics, and audit trails exist for core mutations.
- Documentation: OpenAPI/Swagger exposed; examples for each endpoint; error codes and pagination documented.

## 16. Open Questions
- Which message providers are in scope (e.g., Twilio, SendGrid) and per-tenant configuration model?
- Do we require multi-location inventory sync for menus and items?
- Should we support loyalty accrual/redemption flows in v1 or later?
- Data residency requirements per region?

## 17. Dependencies and External Integrations
- Messaging providers (email/SMS/push).
- Object storage for attachments if enabled.
- Analytics/monitoring stack (e.g., Prometheus/Grafana), logging pipeline.
- Auth provider/IdP for JWT issuance; secret store for keys.

## 18. Glossary
- Tenant: a restaurant brand/account.
- Location: a physical or virtual store belonging to a tenant.
- Contact: a customer record with preferences and consent.
- Campaign: a targeted communication to a segment of contacts.
- DLQ: dead-letter queue for failed async jobs.

---

## See Also

- [Product & Technical Roadmap](./ROADMAP.md) - Implementation phases and strategic priorities
- [System Architecture](./02-ARCHITECTURE.md) - Technical implementation and patterns
- [Technical Backlog](./planning/technical-backlog.md) - Detailed technical debt and improvements

---
**Navigation:** [Home](./README.md) | [Architecture →](./02-ARCHITECTURE.md)

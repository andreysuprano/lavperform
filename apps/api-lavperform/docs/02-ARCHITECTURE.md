# Architecture Overview

## 1. Purpose of This Document
Summarize the current FoodCRM API architecture, technologies, and organization, and identify gaps against Clean Architecture and DDD practices so they can be addressed deliberately.

## 2. High-Level Architecture
FoodCRM API is a NestJS-based modular monolith exposing HTTP endpoints. Feature modules (auth, companies, users, onboarding, customers, orders, campaigns, automatic-campaign, whatsapp, link-page, courses, dashboard, metrics, integrations) register controllers/services and share common infrastructure (Prisma for data access, Bull/BullMQ for background jobs, Swagger UI for documentation, Sentry instrumentation). Application bootstrap configures global validation, CORS, and Swagger, then loads all modules through `AppModule`.

## 3. Architectural Style
- Current style: NestJS modular monolith with controllers and services calling Prisma directly and enqueuing Bull jobs.
- Technical Debt: Missing Clean Architecture (no explicit domain/application/infrastructure boundaries).
- Technical Debt: Missing DDD (no aggregate/bounded context definitions).
- Technical Debt: Missing Hexagonal Architecture (no ports/adapters around external integrations).
- Technical Debt: Missing CQRS (commands and queries are handled together in services).

## 4. Layers and Responsibilities
### Domain
Domain rules live inside Nest services alongside infrastructure concerns (e.g., `customers.service.ts` formats data and writes via Prisma). There is no standalone domain layer.
- Technical Debt: Missing Domain layer as defined in Clean Architecture / DDD.

### Application
Use-case orchestration sits in feature services; there is no separate application layer that coordinates domain behaviors independently of delivery or persistence.
- Technical Debt: Missing Application layer.

### Infrastructure
Prisma provides database access to PostgreSQL (`prisma/schema.prisma`, `PrismaService`), Bull/BullMQ handles queues via `QueueModule`, Redis connection is configured via environment variables, SMTP and external HTTP clients (WhatsApp Evolution client, CardápioWeb, Asaas, OpenAI) are invoked directly from services. Sentry instrumentation is initialized in `instrument.ts`. Swagger documentation is generated in `main.ts`.

### Presentation
HTTP controllers expose REST endpoints with DTO validation (class-validator/transformer). CORS is enabled for all origins. Swagger UI is served at `/api`. No UI components are hosted here.

## 5. Bounded Contexts
Feature modules map to business areas (customers, orders, campaigns, whatsapp, onboarding, etc.), but there is no explicit DDD bounded context definition or separation of models across contexts.
- Technical Debt: No defined Bounded Contexts (DDD).

## 6. Data Flow
HTTP requests reach controllers, DTOs validate/transform payloads, services apply business logic and call Prisma for reads/writes. Some operations enqueue Bull jobs for asynchronous processing (e.g., imports, campaign processors, WhatsApp processing) and scheduled tasks via `@nestjs/schedule`. Responses are returned directly from services/controllers. Swagger documents the routes.

## 7. Database Design
PostgreSQL accessed through Prisma ORM. Schema is defined in `prisma/schema.prisma` with migrations under `prisma/migrations`. `PrismaService` configures a pooled connection via `pg`. Services call Prisma directly without repository interfaces.
- Technical Debt: Missing repository abstraction (DDD / Clean Architecture).

## 8. Integrations
External services include WhatsApp (Evolution client), CardápioWeb webhooks, Asaas payments APIs, OpenAI, SMTP email templates, and Sentry. Bull queues rely on Redis. Swagger UI is exposed for consumers; no explicit gateway API is present.

## 9. Eventing / Messaging
Bull/BullMQ queues are used for background jobs and cron processors. There is no documented domain event model or message bus connecting bounded contexts; webhooks are implemented for outbound notifications.
- Technical Debt: No event-driven boundaries or messaging strategy.

## 10. Error Handling Strategy
Global validation pipe enforces DTO rules. Services throw Nest HTTP exceptions. A `SentryExceptionFilter` exists to forward exceptions to Sentry, but no centralized error mapping or error taxonomy is documented.

## 11. Security Architecture
Authentication uses JWT via Passport (`auth` module) with secrets from environment variables; Swagger declares Bearer auth. Authorization rules are implemented per module; CORS allows all origins. Environment configuration is centralized with `@nestjs/config`.

## 12. Performance & Scalability
Queues offload background work via Redis; scheduled jobs run with `@nestjs/schedule`. No explicit caching, pagination is present in some services (e.g., customers). Scalability approach beyond Nest horizontal scaling is not documented.

## 13. DevOps & Infrastructure
Dockerfiles exist for containerization. Scripts cover build/test/lint and Prisma migrate deploy/generate. Bull Board is enabled at `/queues` with basic auth. Sentry is configured via environment variables. No CI/CD configuration is present in the repository.

## 14. Testing Strategy
Jest is configured and a growing suite of unit and integration specs lives under `tests/`. The `tests/unit` tree already exercises many core services (users, customers, companies, campaigns, onboarding, automatic campaigns, message/queue processors), common utilities, integrations (Asaas, CardápioWeb, OpenAI, WhatsApp/webhooks), and shared decorators/filters. Integration specs under `tests/integration/auth` focus on auth/CORS behavior. Coverage gaps still remain around some decorators, filters, queue wiring, cron processors, and rich end-to-end workflows such as order lifecycle and campaign sends.
- Technical Debt: Unit tests exist but coverage needs to expand to more modules (decorators, filters, queue wiring, cron tasks).
- Technical Debt: Integration/e2e coverage is still limited in cross-module flows (orders, campaigns, webhooks) and should grow alongside the domain.

## 15. Code Organization Structure
Top-level: `src` (feature modules, common utilities, bootstrap), `prisma` (schema and migrations), `docs`, `test`, Dockerfiles, config files. Feature modules reside under `src/<feature>` with `controller`, `service`, `dto`, and processors/cron files. Shared infrastructure lives under `src/common` (decorators, DTOs, filters, queue, smtp, utils) and `src/prisma`. `main.ts` bootstraps the Nest application; `app.module.ts` composes all modules.

## 16. Constraints & Technical Debt
1) Technical Debt: Missing Clean Architecture (no explicit domain/application/infrastructure boundaries).  
2) Technical Debt: Missing DDD (no aggregate/bounded context definitions).  
3) Technical Debt: Missing Hexagonal Architecture (no ports/adapters around external integrations).  
4) Technical Debt: Missing CQRS (commands and queries handled together).  
5) Technical Debt: Missing Domain layer as defined in Clean Architecture / DDD.  
6) Technical Debt: Missing Application layer.  
7) Technical Debt: Missing repository abstraction (DDD / Clean Architecture).
8) Technical Debt: No event-driven boundaries or messaging strategy.  
9) Technical Debt: Unit tests exist but coverage needs to expand to more modules (decorators, filters, queue wiring, cron tasks).
10) Technical Debt: Integration/e2e coverage is still limited in cross-module flows (orders, campaigns, webhooks) and should grow alongside the domain.

## 17. Recommended Improvements
1) Introduce Clean Architecture layering to separate presentation, application, domain, and infrastructure concerns.  
2) Define DDD bounded contexts (e.g., Customers, Orders, Campaigns, Messaging) with clear ownership of models and invariants.  
3) Add Hexagonal ports/adapters around external services (WhatsApp, OpenAI, payment/webhook providers) to decouple core logic from integrations.  
4) Apply CQRS by splitting command handlers and query handlers for high-traffic modules and read-optimized views.  
5) Create a dedicated Domain layer with entities/value objects and domain services instead of embedding rules inside Prisma calls.  
6) Add an Application layer of use cases that orchestrate domain logic and coordinate infrastructure.  
- [ ] **Unit Tests**: Mock the repository interface in service tests.

- Standardize Transaction Management (Unit of Work)
  - [ ] **Create UoW Interface**: `IUnitOfWork` exposing `run<T>(work: (repos) => Promise<T>): Promise<T>`.
  - [ ] **Implement Prisma UoW**: Wrapper around `$transaction`.
  - [ ] **Context Propagation**: Ensure repositories used inside UoW use the transaction client, not the base client.

- Implement Data Mappers
  - [ ] **Define Mappers**: Create static `toDomain` and `toPersistence` methods for entities.
  - [ ] **Refactor Repositories**: Ensure no Prisma types leak out of repository signatures.
  - [ ] **DTO Decoupling**: Ensure Controllers map DTOs to Domain Entities, not directly to Prisma types.
7) Introduce repository interfaces and implement them with Prisma to isolate persistence from business logic.  
8) Establish a domain event model and messaging strategy (publish/subscribe) to decouple cross-module workflows beyond direct service calls.  
9) Expand unit tests for controllers, services, decorators, filters, and queue/cron processors so each layer can be reasoned about individually.  
10) Increase integration/e2e coverage around orders, campaigns, webhooks, and queues (Prisma persistence + external adapters) to ensure the end-to-end flow remains reliable.

## 18. Repository Pattern Standard
To obtain better separation of concerns and testability, we will adopt the Repository Pattern.

**See Also:** [Repository Pattern Migration Guide](./guides/repository-pattern-guide.md) - Complete implementation guide and examples
- **Goal**: Decoupling the business logic (Services) from the data access technology (Prisma).
- **Naming**:
  - Interface: `I[Entity]Repository` (e.g., `ICustomerRepository`).
  - Implementation: `[Entity]PrismaRepository` (e.g., `CustomerPrismaRepository`).
- **Location**:
  - Interfaces: `src/<module>/domain/repositories/` (future) or `src/<module>/repositories/interfaces/` (current).
  - Implementations: `src/<module>/infrastructure/persistence/` (future) or `src/<module>/repositories/prisma/` (current).
- **Signatures** (Base):
  - `findAll(params): Promise<T[]>`
  - `findById(id: string): Promise<T | null>`
  - `create(data: CreateDto): Promise<T>`
  - `update(id: string, data: UpdateDto): Promise<T>`
  - `delete(id: string): Promise<void>`
- **Error Handling**: Repositories should throw standard domain exceptions (or return Result types) rather than bubbling Prisma errors directly.

## 19. Unit of Work Strategy
To maximize consistency and atomicity across multiple repository operations, we will implement the Unit of Work (UoW) pattern using Prisma Transactions.
- **Concept**: A `UnitOfWork` service that wraps a Prisma Transaction.
- **Mechanism**:
  - The UoW manager provides access to transactional repositories.
  - Operations within `uow.run(async (txRepo) => { ... })` share the same Prisma transaction client.
- **Benefit**: Ensures that complex multi-aggregate changes (e.g., creating an Order and updating Customer stats) either fully succeed or fully fail.

## 20. Data Mapper Pattern
To strictly decouple the Domain from Persistence, Repositories must perform mapping.
- **Rule**: Repository methods never accept or return Prisma-generated types (e.g., `User`, `Company`).
- **Implementation**:
  - **Strategy**: Manual Mapping. We explicitly avoid libraries (like `class-transformer` or `automapper`) for Domain mapping to prioritize type safety, performance, and decoupling.
  - **Mappers**: `src/<module>/infrastructure/mappers/[Entity]Mapper.ts`
  - **Domain Entities**: Plain TS classes with logic, no DB metadata.
  - **Flow**: `Repository.save(DomainEntity)` -> `Mapper.toPersistence(DomainEntity)` -> `Prisma.create()`.
  - **Flow**: `Prisma.find()` -> `Mapper.toDomain(PrismaRow)` -> `DomainEntity`.


---

## See Also

- [Repository Pattern Guide](./guides/repository-pattern-guide.md) - Implementation guide
- [Technical Backlog](./planning/technical-backlog.md) - Architecture improvements and gaps
- [Testing Guide](./guides/testing-guide.md) - Testing strategies

---
**Navigation:** [← Product](./01-PRODUCT.md) | [Home](./README.md) | [API Reference →](./03-API-REFERENCE.md)

[← Documentation Home](../README.md)

# Testing Guide

Complete testing strategy and practices for FoodCRM API.

## Table of Contents
1. [Testing Philosophy & Strategy](#testing-philosophy--strategy)
2. [Current Test Coverage](#current-test-coverage)
3. [Integration Testing Infrastructure](#integration-testing-infrastructure)
4. [Unit Testing Strategy](#unit-testing-strategy)
5. [Quality & Security Tools](#quality--security-tools)
6. [Running Tests](#running-tests)
7. [Writing Tests - Best Practices](#writing-tests---best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Testing Philosophy & Strategy

### The Testing Pyramid
Our testing strategy follows the modern testing pyramid:

```
        /\
       /E2E\         ← 5-10% (Critical User Journeys)
      /------\
     /  API  \       ← 15-20% (Integration/Contract Tests)
    /----------\
   /    Unit    \    ← 70-80% (Fast, Isolated, Deterministic)
  /--------------\
```

**Key Principles:**
1. **Fast Feedback**: Unit tests run in <1s, integration <30s
2. **Isolation**: Each test is independent and can run in parallel
3. **Determinism**: Tests produce the same result every time
4. **Readability**: Tests serve as executable documentation
5. **Maintainability**: Test code quality matches production code
6. **Right-BICEP**: Boundary conditions, Inverse relationships, Cross-check, Error conditions, Performance, Time-dependency

### Test Naming Convention
Follow the **GWT (Given-When-Then)** or **Should** pattern:

```typescript
// Pattern 1: Descriptive sentence
it('should return 401 when token is expired', ...)

// Pattern 2: Given-When-Then
describe('POST /auth/login', () => {
  describe('given valid credentials', () => {
    it('should return JWT token and user data', ...)
  })

  describe('given invalid password', () => {
    it('should return 401 with error message', ...)
  })
})
```

---

## Current Test Coverage

### Executive Summary

**Status**: ✅ Modern integration test infrastructure fully implemented
**Last Updated**: 2025-12-16
**Migration**: Postman/Newman → Jest/Testcontainers **COMPLETED**

The FoodCRM API has successfully migrated to a modern, native Jest-based integration test suite using **Testcontainers** for ephemeral PostgreSQL and Redis instances.

### Key Achievements
- ✅ **24 integration tests** covering Auth, Campaigns, and Orders
- ✅ **Builder Pattern** implemented for all core entities
- ✅ **TestFixtures** class with 8 reusable scenarios
- ✅ **Testcontainers** integration for isolated test environments
- ✅ **Database truncation** strategy for test isolation
- ✅ **JWT helpers** for authenticated requests
- ✅ **CORS testing** for preflight requests

### Integration Tests (24 tests)

#### Authentication Module (7 tests)
**File**: `tests/integration/auth/auth.integration.spec.ts`
- ✅ Login with valid credentials returns access token
- ✅ Return 401 for invalid email
- ✅ Return 401 for invalid password
- ✅ Return 400 for missing email
- ✅ Return 400 for missing password
- ✅ JWT payload contains user and company information

**File**: `tests/integration/auth/cors-auth.integration.spec.ts`
- ✅ Returns CORS headers on auth preflight

#### Campaigns Module (8 tests)
**File**: `tests/integration/campaigns/campaigns.integration.spec.ts`

**POST /campaigns**
- ✅ Create campaign with valid data and authentication
- ✅ Reject campaign creation without authentication
- ✅ Reject campaign creation with invalid token
- ✅ Reject campaign creation with missing required fields
- ✅ Create campaign with optional image URL

**GET /campaigns**
- ✅ List campaigns for authenticated user
- ✅ Return empty array when no campaigns exist
- ✅ Reject unauthenticated requests

#### Orders Module (9 tests)
**File**: `tests/integration/orders/orders.integration.spec.ts`

**GET /orders**
- ✅ List orders for authenticated user
- ✅ Return empty array when no orders exist
- ✅ Reject unauthenticated requests
- ✅ Only return orders for the authenticated company

**GET /orders/:id**
- ✅ Return a specific order by ID
- ✅ Return 404 for non-existent order
- ✅ Reject access to orders from other companies
- ✅ Reject unauthenticated requests

**Order filtering and pagination**
- ✅ Filter orders by status

### Quality Metrics
- **Integration Tests**: 24 tests
- **Test Execution Time**: ~30-45 seconds (with Testcontainers startup)
- **Test Reliability**: 100% (deterministic with isolated containers)
- **Test Isolation**: ✅ Each test has clean database state
- **Multi-tenancy Testing**: ✅ Tests verify company data isolation

### Future Coverage Goals
- **Test Execution Time**: <30s for integration suite
- **Coverage**: 70% integration, 90% unit for business logic
- **Reliability**: 0% flaky tests
- **CI/CD**: Tests run in parallel with same reliability as local

---

## Integration Testing Infrastructure

### Builders (5 builders)

All builders follow the **Fluent Builder Pattern** for flexible, readable test data creation:

1. **UserBuilder** - `tests/helpers/builders/user.builder.ts`
   - Methods: `withEmail()`, `withPassword()`, `withName()`, `withCompany()`, `withAccessRules()`

2. **CompanyBuilder** - `tests/helpers/builders/company.builder.ts`
   - Methods: `withState()`, `withName()`, `withSlug()`, `withDocument()`

3. **CampaignBuilder** - `tests/helpers/builders/campaign.builder.ts`
   - Methods: `withName()`, `withMessageText()`, `withStatus()`, `withCompany()`

4. **CustomerBuilder** - `tests/helpers/builders/customer.builder.ts`
   - Methods: `withName()`, `withPhone()`, `withEmail()`, `withCompany()`

5. **OrderBuilder** - `tests/helpers/builders/order.builder.ts`
   - Methods: `withCompany()`, `withCustomer()`, `withStatus()`, `withTotal()`, `withDisplayId()`

### Test Fixtures (8 scenarios)

**File**: `tests/helpers/fixtures.ts`

High-level fixtures for common test scenarios:

1. `companyWithActiveStatus()` - Creates an ACTIVE company
2. `companyWithPendingStatus()` - Creates a PENDING company
3. `authenticatedUser()` - Creates user + company + JWT token
4. `campaignScenario()` - Creates company + campaign
5. `orderScenario()` - Creates company + customer + order
6. `companyWithCustomers(count)` - Creates company + N customers
7. `authenticatedUserWithOrders(count)` - Creates complete order test setup
8. `authenticatedUserWithCampaigns(count)` - Creates complete campaign test setup

### Helper Utilities

**Database Helper** - `tests/helpers/database.helper.ts`
- `truncateAllTables(prisma)` - Truncates all tables except migrations for test isolation

**Auth Helper** - `tests/helpers/auth.helper.ts`
- `generateAuthToken(payload)` - Generates JWT tokens for authenticated requests
- `generateAuthTokenFromEntities(user, company, accessRules)` - Generates token from entities

**Test App Factory** - `tests/helpers/test-app.factory.ts`
- `createTestApp()` - Creates and configures NestJS test application
- `closeTestApp(app)` - Properly closes test application

**Base Integration Test** - `tests/integration/base-integration.spec.ts`
- Base class with `setup()`, `cleanup()`, `teardown()` methods (optional usage)

### Configuration

**Integration Tests**: `tests/integration/jest-integration.json`
- Uses Testcontainers (PostgreSQL + Redis)
- Global setup: `jest.globalSetup.ts`
- Global teardown: `jest.globalTeardown.ts`
- Timeout: 60 seconds
- Max workers: 1 (sequential execution for test isolation)

**E2E Tests**: `tests/e2e/jest-e2e.json`
- Same infrastructure as integration tests
- Timeout: 120 seconds
- Coverage directory: `./coverage/e2e`

---

## Unit Testing Strategy

### Current Gaps Worth Adding Unit Tests

- **Decorators**: `src/common/decorators/company.decorator.ts` and `src/common/decorators/user.decorator.ts` currently read from an `ExecutionContext` request and throw an `UnauthorizedException` when the user is missing. Coverage should confirm the happy path returns the expected identifiers and the failure path throws the configured exception.

- **Global exception filter**: `src/common/filters/global.filter.ts` rethrows specific Nest exceptions after capturing them for Sentry. Tests should exercise each branch (401/400/404/403/500) to make sure the original payload/message is preserved and the filter chain continues as expected.

- **SMTP helper**: `src/common/smtp/smtp.ts` builds a `nodemailer` transporter from env vars and calls `sendMail` with logging only. Focus on mocking `createTransport`/`sendMail` so the config/headers are verified and the callback path is exercised both for success and when a transport error occurs.

- **Queue wiring & processors**:
  - `src/common/queue/queue.module.ts` exposes a `forRootAsync` factory. Unit tests should validate the Redis config is passed from a mocked `ConfigService` to `BullModule`.
  - `src/customers/customers.processor.ts` encapsulates retry logic around `CustomersService.create`. Cover the success path, a retry (less than 3 attempts), and the final failure branch where `attemptsMade >= 3` to ensure the job is reraised.

### Suggested Next Steps

1. Write decorator/filter specs that mock `ExecutionContext`/exceptions and assert both success and failure behavior.
2. Mock `nodemailer` in an `Smtp` spec to assert transporter creation, mail arguments, and error handling.
3. Add unit tests for the queue module factory and for `CustomersProcessor.handleImport`, covering success plus retry/failure scenarios.

---

## Quality & Security Tools

Our quality and security analysis suite includes:

- **ESLint** (best practices, style, code smells)
- **Semgrep** (advanced static analysis and security detection)
- **Trivy** (dependency vulnerability scanning)
- **Jest** (tests and coverage reporting)

### Goals

- Surface structural issues in the codebase via linting
- Detect vulnerabilities in third-party libraries
- Identify application-level security gaps
- Enforce a minimum automated test coverage
- Maintain an automated inspection loop inside CI/CD

### ESLint (Linting)

Run:
```bash
npm run lint
```

Configuration in `.eslintrc.js` with plugins:
- `@typescript-eslint/parser`
- `@typescript-eslint/eslint-plugin`
- `eslint-plugin-import`
- `eslint-plugin-security`

### Semgrep (SAST for security and code smells)

The repository ships with `.semgrep.yml` to enforce project-specific rules on top of general presets.

Run:
```bash
npm run semgrep
```

### Trivy (dependency vulnerability scanning)

Requires Docker. The repo ships with `npm run trivy:scan`, which caches data in `.trivy-cache` and writes reports to `reports/trivy`.

Run locally:
```bash
npm run trivy:scan
```

Configuration:
- `TRIVY_SEVERITY` controls failing severities (default `HIGH,CRITICAL`)
- `TRIVY_IGNORE_UNFIXED=true` skips advisories without fixes (default)
- `TRIVY_EXIT_CODE` controls exit behavior on findings (default `1`)
- `TRIVY_SKIP_DIRS` can skip extra directories beyond `node_modules`, `dist`, and `coverage`

### Jest + Coverage

Run with coverage:
```bash
npm test -- --coverage
```

Enforce coverage thresholds in `package.json`:
```json
"jest": {
  "coverageThreshold": {
    "global": {
      "branches": 50,
      "functions": 60,
      "lines": 60,
      "statements": 60
    }
  }
}
```

### Local Execution Checklist

1. Install lint tooling and confirm `npm run lint` passes
2. Run `npm test -- --coverage` to execute Jest with coverage thresholds
3. Run `npm run semgrep` to execute the bundled ruleset
4. Run `npm run trivy:scan` to capture dependency vulnerabilities

### Acceptance Criteria for Dev PRs

Each pull request must:
- Pass linting without any errors
- Pass Semgrep analysis
- Pass the Trivy scan with no HIGH/CRITICAL findings
- Meet the required minimum coverage threshold

---

## Running Tests

### Commands

```bash
# Run all tests
npm run test:all

# Run only integration tests
npm run test:integration

# Run only unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:cov
```

---

## Writing Tests - Best Practices

### ✅ DO

- Use builders for creating test data
- Use fixtures for common scenarios
- Truncate database in `afterEach` for test isolation
- Test both success and error paths
- Test authentication and authorization
- Test multi-tenancy (company data isolation)
- Use descriptive test names (AAA pattern: Arrange, Act, Assert)

### ❌ DON'T

- Don't rely on `seed:local` for test data
- Don't create global data dumps
- Don't skip authentication tests
- Don't test multiple concerns in one test
- Don't forget to clean up test data
- Don't hardcode IDs or timestamps
- Don't use real external APIs (use mocks/stubs)

### Testing Patterns

#### Pattern 1: Simple Integration Test

```typescript
describe('GET /resource (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let fixtures: TestFixtures;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaClient);
    fixtures = new TestFixtures(prisma);
  });

  afterEach(async () => {
    await truncateAllTables(prisma);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('should return resources for authenticated user', async () => {
    const { token } = await fixtures.authenticatedUser();

    const response = await request(app.getHttpServer())
      .get('/resource')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

#### Pattern 2: Using Builders Directly

```typescript
it('should create resource with specific data', async () => {
  const company = await new CompanyBuilder()
    .withState('ACTIVE')
    .withName('Acme Corp')
    .build(prisma);

  const user = await new UserBuilder()
    .withEmail('john@acme.com')
    .withCompany(company)
    .build(prisma);

  // Test logic here...
});
```

#### Pattern 3: Using Fixtures for Complex Scenarios

```typescript
it('should list orders for company', async () => {
  const { token, company, orders } = await fixtures.authenticatedUserWithOrders(5);

  const response = await request(app.getHttpServer())
    .get('/orders')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(response.body.length).toBe(5);
});
```

---

## Troubleshooting

### Tests fail with "Connection refused"
- Ensure Docker/Podman is running
- Check Testcontainers can start PostgreSQL and Redis containers
- Verify `jest.globalSetup.ts` is executing successfully

### Tests fail with "Table does not exist"
- Ensure `npx prisma migrate deploy` runs in global setup
- Check DATABASE_URL is correctly set by Testcontainers

### Tests are flaky
- Check for race conditions in async code
- Ensure database is truncated in `afterEach`
- Verify test data doesn't depend on execution order
- Check for shared state between tests

### Tests are slow
- Verify Testcontainers are reused (started once in global setup)
- Consider using fewer tests or optimizing builders
- Check for unnecessary database queries
- Profile with `npm run test:debug`

---

## See Also

- [Technical Backlog](../planning/technical-backlog.md) - Testing gaps and improvements
- [API Reference](../03-API-REFERENCE.md) - Endpoint documentation
- [Repository Pattern Guide](./repository-pattern-guide.md) - Testing repositories

---

## References

- [Testcontainers Documentation](https://testcontainers.com/)
- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Builder Pattern](https://refactoring.guru/design-patterns/builder)

---
**Navigation:** [← Home](../README.md) | [Repository Pattern →](./repository-pattern-guide.md)

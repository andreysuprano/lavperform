> **ARCHIVED**: This document has been superseded by [docs/guides/testing-guide.md](../../guides/testing-guide.md). See [docs/README.md](../../README.md) for current documentation.

# Integration Testing Summary

**Status**: ✅ Modern integration test infrastructure fully implemented
**Last Updated**: 2025-12-16
**Migration**: Postman/Newman → Jest/Testcontainers **COMPLETED**

---

## Executive Summary

The FoodCRM API has successfully migrated from Postman/Newman contract tests to a modern, native Jest-based integration test suite. The new infrastructure uses **Testcontainers** for ephemeral PostgreSQL and Redis instances, **Builder Pattern** for test data creation, and **TestFixtures** for common scenarios.

### Key Achievements
- ✅ **24 integration tests** covering Auth, Campaigns, and Orders
- ✅ **Builder Pattern** implemented for all core entities
- ✅ **TestFixtures** class with 8 reusable scenarios
- ✅ **Testcontainers** integration for isolated test environments
- ✅ **Database truncation** strategy for test isolation
- ✅ **JWT helpers** for authenticated requests
- ✅ **CORS testing** for preflight requests

---

## Current Test Coverage

### Integration Tests (24 tests)

#### Authentication Module (7 tests)
**File**: [tests/integration/auth/auth.integration.spec.ts](../tests/integration/auth/auth.integration.spec.ts)
- ✅ Login with valid credentials returns access token
- ✅ Return 401 for invalid email
- ✅ Return 401 for invalid password
- ✅ Return 400 for missing email
- ✅ Return 400 for missing password
- ✅ JWT payload contains user and company information

**File**: [tests/integration/auth/cors-auth.integration.spec.ts](../tests/integration/auth/cors-auth.integration.spec.ts)
- ✅ Returns CORS headers on auth preflight

#### Campaigns Module (8 tests)
**File**: [tests/integration/campaigns/campaigns.integration.spec.ts](../tests/integration/campaigns/campaigns.integration.spec.ts)

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
**File**: [tests/integration/orders/orders.integration.spec.ts](../tests/integration/orders/orders.integration.spec.ts)

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

---

## Test Infrastructure

### Builders (5 builders)

All builders follow the **Fluent Builder Pattern** for flexible, readable test data creation:

1. **UserBuilder** - [tests/helpers/builders/user.builder.ts](../tests/helpers/builders/user.builder.ts)
   - Methods: `withEmail()`, `withPassword()`, `withName()`, `withCompany()`, `withAccessRules()`

2. **CompanyBuilder** - [tests/helpers/builders/company.builder.ts](../tests/helpers/builders/company.builder.ts)
   - Methods: `withState()`, `withName()`, `withSlug()`, `withDocument()`

3. **CampaignBuilder** - [tests/helpers/builders/campaign.builder.ts](../tests/helpers/builders/campaign.builder.ts)
   - Methods: `withName()`, `withMessageText()`, `withStatus()`, `withCompany()`

4. **CustomerBuilder** - [tests/helpers/builders/customer.builder.ts](../tests/helpers/builders/customer.builder.ts)
   - Methods: `withName()`, `withPhone()`, `withEmail()`, `withCompany()`

5. **OrderBuilder** - [tests/helpers/builders/order.builder.ts](../tests/helpers/builders/order.builder.ts)
   - Methods: `withCompany()`, `withCustomer()`, `withStatus()`, `withTotal()`, `withDisplayId()`

### Test Fixtures (8 scenarios)

**File**: [tests/helpers/fixtures.ts](../tests/helpers/fixtures.ts)

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

**Database Helper** - [tests/helpers/database.helper.ts](../tests/helpers/database.helper.ts)
- `truncateAllTables(prisma)` - Truncates all tables except migrations for test isolation

**Auth Helper** - [tests/helpers/auth.helper.ts](../tests/helpers/auth.helper.ts)
- `generateAuthToken(payload)` - Generates JWT tokens for authenticated requests
- `generateAuthTokenFromEntities(user, company, accessRules)` - Generates token from entities

**Test App Factory** - [tests/helpers/test-app.factory.ts](../tests/helpers/test-app.factory.ts)
- `createTestApp()` - Creates and configures NestJS test application
- `closeTestApp(app)` - Properly closes test application

**Base Integration Test** - [tests/integration/base-integration.spec.ts](../tests/integration/base-integration.spec.ts)
- Base class with `setup()`, `cleanup()`, `teardown()` methods (optional usage)

---

## Test Execution

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

### Configuration

**Integration Tests**: [tests/integration/jest-integration.json](../tests/integration/jest-integration.json)
- Uses Testcontainers (PostgreSQL + Redis)
- Global setup: [jest.globalSetup.ts](../jest.globalSetup.ts)
- Global teardown: [jest.globalTeardown.ts](../jest.globalTeardown.ts)
- Timeout: 60 seconds
- Max workers: 1 (sequential execution for test isolation)

**E2E Tests**: [tests/e2e/jest-e2e.json](../tests/e2e/jest-e2e.json)
- Same infrastructure as integration tests
- Timeout: 120 seconds
- Coverage directory: `./coverage/e2e`

---

## Testing Patterns

### Pattern 1: Simple Integration Test

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

### Pattern 2: Using Builders Directly

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

### Pattern 3: Using Fixtures for Complex Scenarios

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

## Migration from Postman/Newman

### ✅ Completed Steps

1. **Infrastructure Setup**
   - ✅ Installed Testcontainers (PostgreSQL + Redis)
   - ✅ Installed testing dependencies (@nestjs/testing, supertest)
   - ✅ Configured Jest global setup/teardown
   - ✅ Created test database truncation helper

2. **Builder Pattern Implementation**
   - ✅ UserBuilder with fluent API
   - ✅ CompanyBuilder with state management
   - ✅ CampaignBuilder for campaign tests
   - ✅ CustomerBuilder for order tests
   - ✅ OrderBuilder with relationships

3. **Test Fixtures**
   - ✅ Created TestFixtures class with 8 scenarios
   - ✅ Implemented `authenticatedUser()` pattern
   - ✅ Implemented bulk data creation patterns

4. **Integration Tests Migration**
   - ✅ Auth module: 7 tests (login, validation, JWT, CORS)
   - ✅ Campaigns module: 8 tests (create, list, auth)
   - ✅ Orders module: 9 tests (list, get, filter, multi-tenancy)

5. **Postman/Newman Removal**
   - ✅ Removed Postman collection files
   - ✅ Removed Newman dependency
   - ✅ Removed `test:contract` script

### 🎯 Next Steps (Future Enhancements)

1. **Expand Test Coverage**
   - Add tests for Customers module
   - Add tests for Companies/Onboarding module
   - Add tests for Messages module
   - Add tests for Webhooks (Asaas integration)
   - Target: 70% integration coverage

2. **Advanced Testing Patterns**
   - Implement snapshot testing for API responses
   - Add performance assertions (<100ms for critical endpoints)
   - Add concurrent request testing
   - Add queue job testing (Bull queues)

3. **Contract Testing (Optional)**
   - Evaluate Pact for consumer-driven contracts
   - Setup Pact Broker if needed
   - Create consumer tests for frontend expectations

4. **CI/CD Integration**
   - Add parallel test execution in CI
   - Add test timing monitoring
   - Add coverage threshold enforcement (70% integration, 90% unit)
   - Add flakiness detection

---

## Quality Metrics

### Current State
- **Integration Tests**: 24 tests
- **Test Execution Time**: ~30-45 seconds (with Testcontainers startup)
- **Test Reliability**: 100% (deterministic with isolated containers)
- **Test Isolation**: ✅ Each test has clean database state
- **Multi-tenancy Testing**: ✅ Tests verify company data isolation

### Goals (Future)
- **Test Execution Time**: <30s for integration suite
- **Coverage**: 70% integration, 90% unit for business logic
- **Reliability**: 0% flaky tests
- **CI/CD**: Tests run in parallel with same reliability as local

---

## Best Practices

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

## References

- [REFACTOR_PLAN.md](./REFACTOR_PLAN.md) - Original migration plan
- [Testcontainers Documentation](https://testcontainers.com/)
- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Builder Pattern](https://refactoring.guru/design-patterns/builder)

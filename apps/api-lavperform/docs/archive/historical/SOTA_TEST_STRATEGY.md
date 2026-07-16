> **ARCHIVED**: This historical document is kept for reference. Key concepts have been extracted to [docs/guides/testing-guide.md](../../guides/testing-guide.md). See [docs/README.md](../../README.md) for current documentation.

# State-of-the-Art (SOTA) Testing Strategy
## Master Implementation Plan for FoodCRM API

This document outlines the comprehensive architectural strategy for modernizing `foodcrm-api` testing using ephemeral infrastructure, network isolation, consumer-driven contracts, and industry-leading quality practices.

## Table of Contents
1. [Testing Philosophy & Principles](#testing-philosophy--principles)
2. [Gap Analysis & Architecture Shift](#gap-analysis--architecture-shift)
3. [Library Selection](#library-selection)
4. [Code Structure](#code-structure)
5. [Implementation Steps](#implementation-steps)
6. [Contract Testing Strategy](#contract-testing-strategy)
7. [Advanced Testing Practices](#advanced-testing-practices)
8. [Quality Metrics & Coverage](#quality-metrics--coverage)
9. [Performance & Resilience Testing](#performance--resilience-testing)
10. [Pipeline Integration](#pipeline-integration)

---

## Testing Philosophy & Principles

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

## Gap Analysis & Architecture Shift

| Feature | Current State (Legacy/Standard) | Target State (SOTA) |
| :--- | :--- | :--- |
| **Infrastructure** | Persistent/Shared DB or In-Memory (H2/Sqlite) | **Ephemeral Containers** (Testcontainers) for every run. |
| **Network Calls** | Mocking `axios` manually or hitting Dev APIs | **WireMock** running strict HTTP contracts locally. |
| **Data Seeding** | SQL Dumps or manual inserts | **Object Mothers / Builders** (`@faker-js/faker`). |
| **Schema Validation**| Manual Joi/Zod assertions | **Pact** (Consumer-Driven Contracts). |
| **Reliability** | Flaky (state leakage) | **Deterministic** (Fresh DB/Clean State per suite). |

**Missing Components identified in `foodcrm-api`:**
1.  **Testcontainers**: No native Docker orchestration for tests.
2.  **Contract Testing**: No Pact infrastructure.
3.  **Database Management**: Need programmable migration execution (Prisma push/deploy) on container startup.
4.  **WireMock**: No high-fidelity HTTP server for mocking external APIs.

---

## Library Selection (Node.js / TypeScript)

We will install these specific libraries to enable the architecture:

*   **Infrastructure**: `testcontainers` (Manages Docker/Podman from Node)
*   **Database**: `@prisma/client` (Existing, but will use for test setup), `pg`
*   **Mocking**:
    *   `wiremock` (or run via Testcontainers)
    *   `@faker-js/faker` (For robust data generation)
    *   `msw` (Mock Service Worker - for HTTP mocking as alternative to WireMock)
*   **Contract Testing**: `@pact-foundation/pact`
*   **Assertions**:
    *   `jest` (Existing)
    *   `supertest` (Existing - API testing)
    *   `jest-extended` (Additional matchers)
*   **Advanced Testing**:
    *   `fast-check` (Property-based testing)
    *   `@stryker-mutator/core` (Mutation testing)
    *   `artillery` or `k6` (Load/Performance testing)
*   **Test Quality**:
    *   `jest-junit` (CI reporting)
    *   `istanbul` / `nyc` (Coverage - bundled with Jest)

---

## Proposed Code Structure

We will restructure the `test/` folder to separate concerns explicitly.

```text
foodcrm-api/
├── src/
├── test/
│   ├── unit/                        <-- Fast, isolated unit tests
│   │   ├── services/
│   │   ├── controllers/
│   │   ├── utils/
│   │   └── validators/
│   ├── integration/                 <-- SOTA Integration Tests
│   │   ├── setup/                   <-- Global Setup (Containers)
│   │   │   ├── global-setup.ts
│   │   │   ├── global-teardown.ts
│   │   │   └── test-environment.ts  <-- Custom Jest Environment
│   │   ├── utils/
│   │   │   ├── database-helper.ts   <-- Clean/Seed/Transaction Logic
│   │   │   ├── test-server.ts       <-- NestJS app bootstrapping
│   │   │   └── api-client.ts        <-- Typed API client for tests
│   │   ├── fixtures/                <-- Object Mothers / Test Data Builders
│   │   │   ├── customer.factory.ts
│   │   │   ├── order.factory.ts
│   │   │   └── index.ts
│   │   ├── auth/                    <-- Feature-based tests
│   │   │   ├── auth-login.integration.spec.ts
│   │   │   ├── auth-refresh.integration.spec.ts
│   │   │   └── auth-permissions.integration.spec.ts
│   │   ├── customers/
│   │   ├── orders/
│   │   └── ...
│   ├── contract/                    <-- Pact Consumer-Driven Contracts
│   │   ├── consumers/               <-- We as consumer
│   │   │   └── payment-gateway.consumer.spec.ts
│   │   └── providers/               <-- We as provider
│   │       └── foodcrm-api.provider.spec.ts
│   ├── e2e/                         <-- Critical user journeys (5-10%)
│   │   ├── order-flow.e2e.spec.ts
│   │   └── customer-registration.e2e.spec.ts
│   ├── performance/                 <-- Load/Performance tests
│   │   ├── scenarios/
│   │   │   ├── order-creation.yml   <-- Artillery scenario
│   │   │   └── api-load.js          <-- K6 scenario
│   │   └── baselines/               <-- Performance baselines
│   ├── mutation/                    <-- Mutation testing configs
│   │   └── stryker.conf.json
│   └── __fixtures__/                <-- Shared test data (JSON/SQL)
│       ├── sample-orders.json
│       └── seed-data.sql
├── jest.config.ts                   <-- Base Jest config
├── jest.unit.config.ts              <-- Unit tests (fast)
├── jest.integration.config.ts       <-- Integration tests
├── jest.contract.config.ts          <-- Contract tests
├── jest.e2e.config.ts               <-- E2E tests
└── .nycrc.json                      <-- Coverage config
```

---

## Implementation Steps (The "Hello World" Strategy)

#### Step 1: Install Dependencies
```bash
npm install --save-dev testcontainers @pact-foundation/pact @faker-js/faker wiremock-captain
```

#### Step 2: Configure Global Infrastructure (The "Golden Rule")
Create `test/integration/setup/global-setup.ts` to:
1.  Spin up a **PostgreSQL** Container.
2.  Spin up a **Redis** Container.
3.  Set `process.env.DATABASE_URL` to the container's mapped port.
4.  Run Prisma Migrations (`npx prisma migrate deploy`) against the container.

#### Step 3: Create the "Hello World" Integration Test
**File:** `test/integration/health.integration.spec.ts`

**Goal:** Verify code can talk to the ephemeral DB.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

// The DB URL is already injected by global-setup
describe('Health Check (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should connect to the ephemeral DB and return 200', async () => {
    // This endpoint should ostensibly check DB connectivity
    return request(app.getHttpServer())
      .get('/health') 
      .expect(200);
  });
});
```

#### Step 4: The Data Management Strategy (Builder Pattern)
Do not manually insert generic data. Create `test/integration/fixtures/customer.factory.ts`:

```typescript
import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

export class CustomerFactory {
  constructor(private prisma: PrismaClient) {}

  async create(overrides: Partial<Customer> = {}) {
    return this.prisma.customer.create({
      data: {
        email: overrides.email || faker.internet.email(),
        name: overrides.name || faker.person.fullName(),
        phone: overrides.phone || faker.phone.number(),
        address: overrides.address || {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          zipCode: faker.location.zipCode(),
        },
        createdAt: overrides.createdAt || new Date(),
        ...overrides,
      },
    });
  }

  async createMany(count: number, overrides: Partial<Customer> = {}) {
    return Promise.all(
      Array.from({ length: count }, () => this.create(overrides))
    );
  }

  // Trait methods for specific scenarios
  async createPremium(overrides: Partial<Customer> = {}) {
    return this.create({
      ...overrides,
      subscription: 'premium',
      creditLimit: 10000,
    });
  }
}
```

**Database Cleanup Strategies:**

**IMPORTANT:** For integration tests using HTTP (supertest), transaction rollback does NOT work. See [Rule 3: Black-Box Cleanup](#rule-3-black-box-cleanup-for-http-tests-no-transaction-rollback) for details.

1. **TRUNCATE (Recommended for Integration Tests)**:
```typescript
import { DatabaseCleaner } from '../utils/db-cleaner';

let dbCleaner: DatabaseCleaner;

beforeAll(async () => {
  const prisma = new PrismaClient();
  dbCleaner = new DatabaseCleaner(prisma);
});

afterEach(async () => {
  await dbCleaner.cleanAll();
});
```

2. **Transaction Rollback** (ONLY for Unit Tests):
```typescript
// ⚠️ WARNING: Only use this for direct Prisma calls, NOT HTTP tests
beforeEach(async () => {
  await prisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  await prisma.$executeRaw`ROLLBACK`;
});
```

3. **Fresh Database** (For E2E tests):
```typescript
// Spin up new container per test suite (slowest but most isolated)
```

---

## Critical Architectural Rules & Solutions

### The "Double Bind" Problem & Solutions

**IMPORTANT:** The following architectural rules are critical for production-ready integration testing. Ignoring these will result in flaky tests and CI/CD failures.

### Rule 1: CI/CD Parity (Fixing the "Double Bind")

**The Problem:**
Most tutorials show `services: postgres` in GitHub Actions, but this creates environment drift:
- Local Dev: Uses Testcontainers
- CI: Uses GitHub Actions services
- Result: "Works on my machine" syndrome

**The Solution:**
The CI pipeline MUST use Testcontainers exclusively, ensuring 100% parity with local development.

**Implementation:**

#### Step 1: Global Setup with Testcontainers

**File:** `test/integration/setup/global-setup.ts`

```typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

let postgresContainer: StartedPostgreSqlContainer;

export default async function globalSetup() {
  console.log('🐳 Starting PostgreSQL container...');

  // Start PostgreSQL container (singleton pattern)
  postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('testdb')
    .withUsername('postgres')
    .withPassword('postgres')
    .withExposedPorts(5432)
    .start();

  const databaseUrl = postgresContainer.getConnectionUri();

  console.log(`✅ PostgreSQL started on ${databaseUrl}`);

  // CRITICAL: Write DATABASE_URL to file for Jest workers
  // Jest workers cannot access global variables from global-setup
  const testEnvPath = path.join(__dirname, 'test-env.json');
  fs.writeFileSync(
    testEnvPath,
    JSON.stringify({
      DATABASE_URL: databaseUrl,
      CONTAINER_ID: postgresContainer.getId(),
    }),
    'utf-8'
  );

  // Run Prisma migrations against the containerized database
  console.log('🔄 Running Prisma migrations...');
  process.env.DATABASE_URL = databaseUrl;

  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });
    console.log('✅ Migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await postgresContainer.stop();
    throw error;
  }

  // Store container reference globally for teardown
  (global as any).__POSTGRES_CONTAINER__ = postgresContainer;
}
```

#### Step 2: Global Teardown

**File:** `test/integration/setup/global-teardown.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  // Stop the container
  const container = (global as any).__POSTGRES_CONTAINER__;
  if (container) {
    await container.stop();
    console.log('✅ PostgreSQL container stopped');
  }

  // Delete test-env.json
  const testEnvPath = path.join(__dirname, 'test-env.json');
  if (fs.existsSync(testEnvPath)) {
    fs.unlinkSync(testEnvPath);
    console.log('✅ Test environment file deleted');
  }
}
```

---

### Rule 2: Jest Worker Isolation (Solving the Variable Access Problem)

**The Problem:**
```typescript
// ❌ THIS DOES NOT WORK
// global-setup.ts
process.env.DATABASE_URL = databaseUrl; // Not accessible in test workers!

// test file
console.log(process.env.DATABASE_URL); // undefined!
```

Jest runs tests in parallel workers. Variables set in `global-setup.ts` are NOT available in test files.

**The Solution:**
Use a file-based approach to share the DATABASE_URL between global-setup and test workers.

**Implementation:**

**File:** `jest.integration.config.ts`

```typescript
import type { Config } from 'jest';
import * as fs from 'fs';
import * as path from 'path';

// Read the DATABASE_URL from the file created by global-setup
const testEnvPath = path.join(__dirname, 'test/integration/setup/test-env.json');

let testEnv: { DATABASE_URL: string } = { DATABASE_URL: '' };

if (fs.existsSync(testEnvPath)) {
  testEnv = JSON.parse(fs.readFileSync(testEnvPath, 'utf-8'));
  console.log('📖 Loaded test environment from file');
}

const config: Config = {
  displayName: 'integration',
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Point to integration tests
  testMatch: ['<rootDir>/test/integration/**/*.integration.spec.ts'],

  // Global setup/teardown
  globalSetup: '<rootDir>/test/integration/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/setup/global-teardown.ts',

  // CRITICAL: Inject DATABASE_URL into all test workers
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup/setup-after-env.ts'],

  // Force sequential execution to avoid container conflicts
  maxWorkers: 1,

  // Ensure tests run in band
  runInBand: true,

  // Timeout for slow integration tests
  testTimeout: 30000,

  // Coverage (optional for integration tests)
  collectCoverage: false,
};

export default config;
```

**File:** `test/integration/setup/setup-after-env.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';

// This file runs INSIDE each Jest worker
const testEnvPath = path.join(__dirname, 'test-env.json');

if (fs.existsSync(testEnvPath)) {
  const testEnv = JSON.parse(fs.readFileSync(testEnvPath, 'utf-8'));

  // Inject DATABASE_URL into process.env for THIS worker
  process.env.DATABASE_URL = testEnv.DATABASE_URL;

  console.log('✅ DATABASE_URL injected into test worker');
} else {
  throw new Error(
    '❌ test-env.json not found. Did global-setup run successfully?'
  );
}
```

---

### Rule 3: Black-Box Cleanup for HTTP Tests (No Transaction Rollback)

**The Problem:**
```typescript
// ❌ THIS DOES NOT WORK FOR INTEGRATION TESTS
beforeEach(async () => {
  await prisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  await prisma.$executeRaw`ROLLBACK`;
});
```

**Why it fails:**
1. Your test uses `supertest` to make HTTP requests to the API
2. The API runs in the NestJS application with its own Prisma Client
3. The API's transaction is SEPARATE from the test's transaction
4. Rollback only affects the test's transaction, not the API's data

**The Solution:**
Use explicit `TRUNCATE` after each test to clean up data created by the API.

**Implementation:**

**File:** `test/integration/utils/db-cleaner.ts`

```typescript
import { PrismaClient } from '@prisma/client';

export class DatabaseCleaner {
  constructor(private prisma: PrismaClient) {}

  /**
   * Truncates all tables except Prisma migrations
   * Uses CASCADE to handle foreign key constraints
   */
  async cleanAll(): Promise<void> {
    const tablenames = await this.prisma.$queryRaw<
      Array<{ tablename: string }>
    >`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
    `;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter(name => name !== '_prisma_migrations');

    try {
      // Disable triggers to avoid FK constraint issues during truncation
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

      // Truncate all tables
      for (const table of tables) {
        await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      }

      // Re-enable triggers
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);

      console.log(`🧹 Cleaned ${tables.length} tables`);
    } catch (error) {
      // Ensure triggers are re-enabled even on error
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
      throw error;
    }
  }

  /**
   * Clean specific tables (for targeted cleanup)
   */
  async cleanTables(tableNames: string[]): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

      for (const table of tableNames) {
        await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      }

      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
    } catch (error) {
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
      throw error;
    }
  }
}
```

**Usage in Tests:**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '@/app.module';
import { DatabaseCleaner } from '../utils/db-cleaner';

describe('Customers API (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = new PrismaClient();
    dbCleaner = new DatabaseCleaner(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // CRITICAL: Clean database after EACH test
  afterEach(async () => {
    await dbCleaner.cleanAll();
  });

  it('should create a customer via HTTP', async () => {
    const response = await request(app.getHttpServer())
      .post('/customers')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'John Doe',
      email: 'john@example.com',
    });

    // Verify in database
    const customer = await prisma.customer.findUnique({
      where: { id: response.body.id },
    });
    expect(customer).toBeDefined();
  });

  it('should list all customers', async () => {
    // Create test data via API
    await request(app.getHttpServer())
      .post('/customers')
      .send({ name: 'Alice', email: 'alice@example.com' });

    await request(app.getHttpServer())
      .post('/customers')
      .send({ name: 'Bob', email: 'bob@example.com' });

    // List customers
    const response = await request(app.getHttpServer())
      .get('/customers')
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toHaveProperty('name');
  });
});
```

---

### Rule 4: CI/CD Configuration (NO Postgres Service)

**The Problem:**
Most tutorials show this in GitHub Actions:
```yaml
# ❌ DO NOT DO THIS
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_PASSWORD: postgres
```

This creates environment drift between local and CI.

**The Correct Approach:**

**File:** `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop, feature/*]
  pull_request:
    branches: [main, develop]

env:
  NODE_ENV: test

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --ci --coverage --maxWorkers=2

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unit

  integration-tests:
    name: Integration Tests (Testcontainers)
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # CRITICAL: NO postgres service!
      # Testcontainers will handle this

      - name: Run integration tests
        run: npm run test:integration -- --ci
        # Note: DATABASE_URL is set by global-setup.ts via Testcontainers

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: test-results/

      - name: Upload container logs (on failure)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: container-logs
          path: /tmp/testcontainers-*
```

---

### Comparison: Transaction Rollback vs TRUNCATE

| Strategy | Use Case | Pros | Cons |
|----------|----------|------|------|
| **Transaction Rollback** | Unit tests with direct Prisma calls | Fast, clean | ❌ Doesn't work with HTTP/black-box tests |
| **TRUNCATE CASCADE** | Integration tests with supertest | ✅ Works with HTTP, handles FK constraints | Slower than rollback |
| **Fresh Database** | E2E tests, critical isolation | Complete isolation | Very slow |

**Decision Tree:**

```
Are you testing via HTTP (supertest)?
├─ YES → Use TRUNCATE (Rule 3)
└─ NO → Are you testing Prisma directly?
    ├─ YES → Can use Transaction Rollback
    └─ NO → Use TRUNCATE for safety
```

---

### Quick Reference: Implementation Checklist

**Required Dependencies:**
```bash
npm install --save-dev \
  testcontainers \
  @testcontainers/postgresql \
  @types/node
```

**Files to Create:**
- ✅ `test/integration/setup/global-setup.ts` - Starts containers, runs migrations
- ✅ `test/integration/setup/global-teardown.ts` - Stops containers, cleans up
- ✅ `test/integration/setup/setup-after-env.ts` - Injects DATABASE_URL into workers
- ✅ `test/integration/utils/db-cleaner.ts` - TRUNCATE utility
- ✅ `jest.integration.config.ts` - Jest configuration with proper setup

**Files to Update:**
- ✅ `.github/workflows/test.yml` - Remove postgres service
- ✅ `.gitignore` - Add `test/integration/setup/test-env.json`

**Common Pitfalls to Avoid:**
1. ❌ Using `services: postgres` in GitHub Actions (creates env drift)
2. ❌ Trying to access `process.env.DATABASE_URL` directly in global-setup
3. ❌ Using transaction rollback for HTTP-based integration tests
4. ❌ Forgetting to add `setupFilesAfterEnv` in jest.integration.config.ts
5. ❌ Not cleaning up test-env.json in global-teardown

**Verification Steps:**
```bash
# 1. Run integration tests locally
npm run test:integration

# 2. Verify test-env.json is created during test run
ls -la test/integration/setup/test-env.json

# 3. Verify it's cleaned up after tests
# (File should not exist after tests complete)

# 4. Test in CI (push to feature branch)
git push origin feature/integration-tests
```

---

## Contract Testing (Pact) Strategy

For external services (e.g., a hypothetical Payment Gateway), we will write a Consumer Test:

1.  **Define Interaction:** "When I send POST /charge, I expect 200 OK".
2.  **Generate Pact File:** Run the test -> produces `pact/pacts/foodcrm-paymentgateway.json`.
3.  **Stubbing:** Use this Pact file to stub the provider in Integration tests if needed, or simply verify the contract in the pipeline.

**Example Consumer Test:**
```typescript
import { Pact } from '@pact-foundation/pact';
import { PaymentGatewayClient } from '@/services/payment-gateway';

describe('Payment Gateway Contract', () => {
  const provider = new Pact({
    consumer: 'foodcrm-api',
    provider: 'payment-gateway',
    port: 8080,
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  it('should process payment successfully', async () => {
    await provider.addInteraction({
      state: 'customer has valid payment method',
      uponReceiving: 'a request to charge customer',
      withRequest: {
        method: 'POST',
        path: '/charge',
        headers: { 'Content-Type': 'application/json' },
        body: {
          customerId: 'cust_123',
          amount: 1000,
          currency: 'USD',
        },
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          transactionId: Matchers.uuid(),
          status: 'success',
        },
      },
    });

    const client = new PaymentGatewayClient('http://localhost:8080');
    const result = await client.charge('cust_123', 1000, 'USD');

    expect(result.status).toBe('success');
  });
});
```

---

## Advanced Testing Practices

### 7.1 Test Doubles & Isolation

Understanding the different types of test doubles:

| Type | Purpose | When to Use |
|------|---------|-------------|
| **Stub** | Returns predefined responses | External API responses |
| **Mock** | Verifies interactions occurred | Ensuring side effects happen |
| **Spy** | Records calls while delegating to real implementation | Partial mocking |
| **Fake** | Working implementation (simpler than real) | In-memory DB, file system |

**Example:**
```typescript
// Stub - for external dependencies
const emailStub = {
  send: jest.fn().mockResolvedValue({ messageId: '123' }),
};

// Mock - verify behavior
const auditMock = jest.fn();
await service.deleteCustomer(customerId);
expect(auditMock).toHaveBeenCalledWith('CUSTOMER_DELETED', { customerId });

// Spy - partial mocking
const loggerSpy = jest.spyOn(logger, 'error');
await service.processOrder(invalidOrder);
expect(loggerSpy).toHaveBeenCalled();
```

### 7.2 Testing Error Scenarios (Critical)

**80% of production bugs occur in error paths.** Always test:
- Validation errors
- Network timeouts
- Database connection failures
- Concurrent modifications
- Rate limiting
- Invalid state transitions

```typescript
describe('Order Creation Error Scenarios', () => {
  it('should handle duplicate order ID conflict', async () => {
    await orderFactory.create({ id: 'ORD-123' });

    await expect(
      service.createOrder({ id: 'ORD-123', ... })
    ).rejects.toThrow('Order already exists');
  });

  it('should rollback transaction on payment failure', async () => {
    paymentGateway.charge.mockRejectedValue(new Error('Insufficient funds'));

    await expect(service.processOrder(order)).rejects.toThrow();

    // Verify order status wasn't updated
    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(dbOrder.status).toBe('PENDING');
  });

  it('should handle database connection timeout', async () => {
    jest.spyOn(prisma, '$connect').mockImplementation(() =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 100)
      )
    );

    await expect(service.getCustomers()).rejects.toThrow('Connection timeout');
  });
});
```

### 7.3 Testing Idempotency

For critical operations (payments, orders), verify idempotent behavior:

```typescript
it('should return same result when creating order with idempotency key', async () => {
  const idempotencyKey = 'unique-key-123';

  const result1 = await request(app)
    .post('/orders')
    .set('Idempotency-Key', idempotencyKey)
    .send(orderData)
    .expect(201);

  // Retry with same key
  const result2 = await request(app)
    .post('/orders')
    .set('Idempotency-Key', idempotencyKey)
    .send(orderData)
    .expect(200); // Returns existing

  expect(result1.body.id).toBe(result2.body.id);

  // Verify only one order was created
  const orderCount = await prisma.order.count({
    where: { idempotencyKey },
  });
  expect(orderCount).toBe(1);
});
```

### 7.4 Concurrency & Race Condition Testing

```typescript
it('should handle concurrent order updates correctly', async () => {
  const order = await orderFactory.create({ quantity: 10 });

  // Simulate 5 concurrent requests
  const updates = Array.from({ length: 5 }, () =>
    service.updateOrderQuantity(order.id, -1)
  );

  await Promise.all(updates);

  const finalOrder = await prisma.order.findUnique({
    where: { id: order.id }
  });
  expect(finalOrder.quantity).toBe(5); // Should be 10 - 5 = 5
});

it('should prevent double-booking using optimistic locking', async () => {
  const table = await tableFactory.create({
    seats: 1,
    available: true,
    version: 1
  });

  // Two customers try to book simultaneously
  const booking1 = service.bookTable(table.id, 'customer1', table.version);
  const booking2 = service.bookTable(table.id, 'customer2', table.version);

  await expect(Promise.all([booking1, booking2]))
    .rejects.toThrow('Optimistic lock failed');
});
```

### 7.5 Property-Based Testing

Use `fast-check` for generating hundreds of test cases automatically:

```typescript
import * as fc from 'fast-check';

describe('Order Validation (Property-Based)', () => {
  it('should always calculate correct total for any valid order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            price: fc.integer({ min: 1, max: 10000 }),
            quantity: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (items) => {
          const expectedTotal = items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

          const order = { items };
          const calculatedTotal = calculateOrderTotal(order);

          return calculatedTotal === expectedTotal;
        }
      )
    );
  });

  it('should sanitize any user input correctly', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const sanitized = sanitizeInput(input);
        return !sanitized.includes('<script>') &&
               !sanitized.includes('javascript:');
      })
    );
  });
});
```

### 7.6 Snapshot Testing for API Contracts

Use snapshots to detect unintended API changes:

```typescript
it('should maintain API response structure', async () => {
  const customer = await customerFactory.create();

  const response = await request(app)
    .get(`/customers/${customer.id}`)
    .expect(200);

  // Mask dynamic values
  const normalized = {
    ...response.body,
    id: '<uuid>',
    createdAt: '<timestamp>',
  };

  expect(normalized).toMatchSnapshot();
});
```

### 7.7 Time-Dependent Testing

Mock time for deterministic tests:

```typescript
describe('Subscription Expiry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should mark subscription as expired after 30 days', async () => {
    const subscription = await subscriptionFactory.create({
      startDate: new Date('2024-01-01'),
      durationDays: 30,
    });

    // Fast-forward 31 days
    jest.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);

    await service.checkSubscriptions();

    const updated = await prisma.subscription.findUnique({
      where: { id: subscription.id },
    });
    expect(updated.status).toBe('EXPIRED');
  });
});
```

### 7.8 Database Migration Testing

Test migrations both up and down:

```typescript
describe('Database Migrations', () => {
  it('should migrate up and down without data loss', async () => {
    // Create test data in old schema
    const customer = await createCustomerOldSchema();

    // Run migration
    await execSync('npx prisma migrate deploy');

    // Verify data integrity in new schema
    const migratedCustomer = await prisma.customer.findUnique({
      where: { id: customer.id },
    });
    expect(migratedCustomer.email).toBe(customer.email);

    // Test rollback
    await execSync('npx prisma migrate resolve --rolled-back');
  });
});
```

---

## Quality Metrics & Coverage

### 8.1 Coverage Targets

Configure meaningful coverage in `.nycrc.json`:

```json
{
  "all": true,
  "include": ["src/**/*.ts"],
  "exclude": [
    "**/*.spec.ts",
    "**/*.test.ts",
    "**/test/**",
    "**/__mocks__/**",
    "**/node_modules/**"
  ],
  "branches": 80,
  "lines": 80,
  "functions": 80,
  "statements": 80,
  "check-coverage": true,
  "report-dir": "./coverage",
  "reporter": ["html", "lcov", "text", "text-summary"]
}
```

**Important:** Coverage is a **minimum bar**, not a goal. Focus on:
- Testing critical paths (payment, auth, data integrity)
- Error scenarios (often uncovered)
- Edge cases and boundary conditions

### 8.2 Mutation Testing

Use Stryker to verify test quality:

```javascript
// stryker.conf.json
{
  "mutator": "typescript",
  "packageManager": "npm",
  "reporters": ["html", "clear-text", "progress"],
  "testRunner": "jest",
  "coverageAnalysis": "perTest",
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  },
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.spec.ts"
  ]
}
```

Run mutation testing:
```bash
npm run test:mutation
```

**What it does:** Changes your code (e.g., `>` to `>=`) and verifies tests catch the mutation.

### 8.3 Test Quality Checklist

Before marking a feature complete:
- [ ] Unit tests cover all public methods
- [ ] Integration tests cover happy path
- [ ] Error scenarios are tested (401, 403, 404, 500)
- [ ] Boundary conditions tested (null, empty, max values)
- [ ] Concurrent access tested (where applicable)
- [ ] Database constraints verified
- [ ] Idempotency verified (for critical operations)
- [ ] Contract tests exist (for external APIs)
- [ ] Performance baseline established
- [ ] Mutation score > 60%

---

## Performance & Resilience Testing

### 9.1 Load Testing with Artillery

Create `test/performance/scenarios/api-load.yml`:

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Spike"
  defaults:
    headers:
      Authorization: "Bearer {{ $processEnvironment.TEST_TOKEN }}"

scenarios:
  - name: "Customer CRUD Operations"
    flow:
      - post:
          url: "/customers"
          json:
            name: "{{ $randomString() }}"
            email: "{{ $randomString() }}@example.com"
          capture:
            - json: "$.id"
              as: "customerId"
      - get:
          url: "/customers/{{ customerId }}"
          expect:
            - statusCode: 200
      - put:
          url: "/customers/{{ customerId }}"
          json:
            name: "Updated Name"
      - delete:
          url: "/customers/{{ customerId }}"
          expect:
            - statusCode: 204

  - name: "Order Creation Flow"
    flow:
      - post:
          url: "/orders"
          json:
            customerId: "{{ $randomString() }}"
            items:
              - productId: "{{ $randomString() }}"
                quantity: "{{ $randomNumber(1, 10) }}"
```

Run performance tests:
```bash
artillery run test/performance/scenarios/api-load.yml
```

**Performance Baselines** (establish in `test/performance/baselines/`):
```json
{
  "endpoints": {
    "GET /customers": {
      "p50": "50ms",
      "p95": "150ms",
      "p99": "300ms"
    },
    "POST /orders": {
      "p50": "200ms",
      "p95": "500ms",
      "p99": "1000ms"
    }
  },
  "throughput": {
    "requestsPerSecond": 100,
    "concurrentUsers": 50
  }
}
```

### 9.2 Chaos Engineering (Resilience Testing)

Test system behavior under failure conditions:

```typescript
describe('Resilience Tests', () => {
  it('should retry failed external API calls', async () => {
    let attempts = 0;
    paymentGateway.charge.mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Network error');
      }
      return { status: 'success' };
    });

    const result = await service.processPayment(order);

    expect(attempts).toBe(3);
    expect(result.status).toBe('success');
  });

  it('should degrade gracefully when Redis is unavailable', async () => {
    jest.spyOn(redisClient, 'get').mockRejectedValue(new Error('Redis down'));

    // Should fall back to database
    const customer = await service.getCustomer(customerId);

    expect(customer).toBeDefined();
    expect(logger.warn).toHaveBeenCalledWith('Redis unavailable, using DB');
  });

  it('should implement circuit breaker for external service', async () => {
    // Simulate 10 consecutive failures
    for (let i = 0; i < 10; i++) {
      externalService.call.mockRejectedValue(new Error('Service down'));
      await service.callExternal().catch(() => {});
    }

    // Circuit should be open now
    await expect(service.callExternal()).rejects.toThrow('Circuit breaker open');

    // Verify no actual call was made
    expect(externalService.call).toHaveBeenCalledTimes(10); // Not 11
  });
});
```

### 9.3 Resource Leak Detection

```typescript
describe('Memory Leak Detection', () => {
  it('should not leak database connections', async () => {
    const initialConnections = await prisma.$queryRaw`
      SELECT count(*) FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    // Perform 1000 operations
    for (let i = 0; i < 1000; i++) {
      await service.getCustomer(i);
    }

    const finalConnections = await prisma.$queryRaw`
      SELECT count(*) FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    expect(finalConnections).toEqual(initialConnections);
  });
});
```

---

## Pipeline Integration (CI/CD)

### 10.1 NPM Scripts Configuration

Update `package.json`:
```json
{
  "scripts": {
    "test": "npm run test:unit",
    "test:unit": "jest --config jest.unit.config.ts --maxWorkers=50%",
    "test:integration": "jest --config jest.integration.config.ts --runInBand --forceExit",
    "test:contract": "jest --config jest.contract.config.ts",
    "test:e2e": "jest --config jest.e2e.config.ts --runInBand",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:contract",
    "test:watch": "jest --watch --config jest.unit.config.ts",
    "test:coverage": "jest --coverage --config jest.unit.config.ts",
    "test:mutation": "stryker run",
    "test:performance": "artillery run test/performance/scenarios/api-load.yml",
    "test:performance:report": "artillery run --output report.json test/performance/scenarios/api-load.yml && artillery report report.json",
    "test:ci": "npm run test:unit -- --ci --coverage --maxWorkers=2 && npm run test:integration -- --ci",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

### 10.2 GitHub Actions / GitLab CI Pipeline

**Example `.github/workflows/test.yml`:**

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_ENV: test
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --ci --coverage --maxWorkers=2

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unit

      - name: Check coverage thresholds
        run: npx nyc check-coverage --lines 80 --functions 80 --branches 80

  integration-tests:
    name: Integration Tests (Testcontainers)
    runs-on: ubuntu-latest
    timeout-minutes: 20

    # CRITICAL: NO services block!
    # Testcontainers manages PostgreSQL/Redis via global-setup.ts

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # NOTE: No manual migration step needed
      # global-setup.ts runs migrations automatically

      - name: Run integration tests
        run: npm run test:integration -- --ci
        # DATABASE_URL is injected by setup-after-env.ts
        # which reads from test-env.json created by global-setup.ts

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: test-results/

      - name: Upload container logs (on failure)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: container-logs
          path: /tmp/testcontainers-*

  contract-tests:
    name: Contract Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run contract tests
        run: npm run test:contract -- --ci

      - name: Publish Pact contracts
        if: github.ref == 'refs/heads/main'
        run: npx pact-broker publish ./pacts --consumer-app-version=${{ github.sha }} --broker-base-url=${{ secrets.PACT_BROKER_URL }}

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start application
        run: docker-compose -f docker-compose.test.yml up -d

      - name: Wait for application
        run: npx wait-on http://localhost:3000/health --timeout 60000

      - name: Run E2E tests
        run: npm run test:e2e -- --ci

      - name: Teardown
        if: always()
        run: docker-compose -f docker-compose.test.yml down -v

  mutation-tests:
    name: Mutation Tests
    runs-on: ubuntu-latest
    timeout-minutes: 60
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run mutation tests
        run: npm run test:mutation

      - name: Upload mutation report
        uses: actions/upload-artifact@v3
        with:
          name: mutation-report
          path: reports/mutation/

  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start application
        run: docker-compose -f docker-compose.test.yml up -d

      - name: Wait for application
        run: npx wait-on http://localhost:3000/health --timeout 60000

      - name: Run performance tests
        run: npm run test:performance:report

      - name: Compare with baseline
        run: node scripts/compare-performance-baseline.js

      - name: Upload performance report
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: artillery-report.html

      - name: Teardown
        if: always()
        run: docker-compose -f docker-compose.test.yml down -v
```

### 10.3 Test Execution Strategy

**Parallel Execution for Speed:**
- Unit tests: Run in parallel (Jest workers)
- Integration tests: Run sequentially (`--runInBand`) to avoid container conflicts
- Contract tests: Can run in parallel
- E2E tests: Run sequentially

**When to Run Each Test Type:**

| Test Type | On Every Commit | On PR | On Main Push | Scheduled |
|-----------|----------------|-------|--------------|-----------|
| Unit | ✅ | ✅ | ✅ | ✅ |
| Integration | ✅ | ✅ | ✅ | ✅ |
| Contract | ❌ | ✅ | ✅ | ✅ |
| E2E | ❌ | ❌ | ✅ | ✅ (Daily) |
| Mutation | ❌ | ❌ | ✅ | ✅ (Weekly) |
| Performance | ❌ | ❌ | ✅ | ✅ (Daily) |

### 10.4 Test Reporting & Observability

**Jest Configuration for CI:**
```typescript
// jest.config.ts
export default {
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporter',
      {
        pageTitle: 'FoodCRM API Test Report',
        outputPath: 'test-results/index.html',
        includeFailureMsg: true,
        includeConsoleLog: true,
      },
    ],
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/main.ts',
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/critical/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
};
```

### 10.5 Pre-commit Hooks

**Using Husky + lint-staged:**

```json
// package.json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write",
      "jest --bail --findRelatedTests --passWithNoTests"
    ]
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test:unit"
    }
  }
}
```

### 10.6 Docker Compose for Testing

**`docker-compose.test.yml`:**
```yaml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: test
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/testdb
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: testdb
    ports:
      - '5432:5432'
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

  wiremock:
    image: wiremock/wiremock:latest
    ports:
      - '8080:8080'
    volumes:
      - ./test/mocks:/home/wiremock
    command: ['--global-response-templating', '--verbose']
```

---

## Summary & Best Practices

### Key Takeaways

1. **Test Pyramid First**: 70-80% unit, 15-20% integration, 5-10% E2E
2. **Ephemeral Infrastructure**: Fresh containers for every test run
3. **Network Isolation**: WireMock/MSW for external dependencies
4. **Test Independence**: Each test can run alone and in any order
5. **Fast Feedback**: Unit tests <1s, integration <30s
6. **Error Testing**: 80% of bugs are in error paths - test them
7. **Quality Metrics**: Coverage is minimum bar, mutation testing verifies quality
8. **Performance Baselines**: Establish and monitor performance SLAs
9. **CI/CD Integration**: Automated testing on every commit
10. **Living Documentation**: Tests serve as executable specifications

### Anti-Patterns to Avoid

❌ **Shared test database** - Leads to flaky tests and race conditions
❌ **Mocking the database** - Integration tests should use real DB
❌ **Testing implementation details** - Test behavior, not internals
❌ **Ignoring error scenarios** - Error paths are critical
❌ **Manual test data** - Use factories/builders
❌ **Sleeping in tests** - Use proper async patterns
❌ **100% coverage obsession** - Focus on critical paths
❌ **Test interdependence** - Each test must be isolated
❌ **Committing secrets** - Use environment variables
❌ **Skipping CI tests locally** - Run same tests developers run

### Resources & References

**Books:**
- "Growing Object-Oriented Software, Guided by Tests" - Steve Freeman & Nat Pryce
- "Test Driven Development: By Example" - Kent Beck
- "Working Effectively with Legacy Code" - Michael Feathers

**Tools Documentation:**
- [Testcontainers](https://node.testcontainers.org/)
- [Pact](https://docs.pact.io/)
- [Jest](https://jestjs.io/)
- [Artillery](https://www.artillery.io/)
- [Stryker Mutator](https://stryker-mutator.io/)

**Testing Patterns:**
- [Martin Fowler's Testing Articles](https://martinfowler.com/testing/)
- [Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Contract Testing](https://martinfowler.com/bliki/ContractTest.html)

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Critical: Implement Architectural Rules First**
- [ ] Install Testcontainers dependencies
- [ ] Create `global-setup.ts` with PostgreSQL container (Rule 1)
- [ ] Create `global-teardown.ts` for cleanup
- [ ] Create `setup-after-env.ts` for worker DATABASE_URL injection (Rule 2)
- [ ] Create `jest.integration.config.ts` with proper configuration
- [ ] Create `db-cleaner.ts` utility with TRUNCATE strategy (Rule 3)
- [ ] Update GitHub Actions to remove postgres service (Rule 4)
- [ ] Add `test-env.json` to `.gitignore`
- [ ] Implement first "Hello World" integration test
- [ ] Verify tests pass both locally and in CI

**Deliverable:** Integration test infrastructure that works identically in local and CI environments

### Phase 2: Core Testing (Week 3-4)
- [ ] Create test data factories for all entities (Customer, Order, Product)
- [ ] Write integration tests for critical flows (auth, CRUD operations)
- [ ] Implement test cleanup in `afterEach` hooks
- [ ] Verify no data leakage between tests
- [ ] Achieve 80% unit test coverage

### Phase 3: Advanced Testing (Week 5-6)
- [ ] Set up Pact contract testing
- [ ] Implement property-based tests
- [ ] Add concurrency/race condition tests
- [ ] Set up mutation testing

### Phase 4: Performance & CI/CD (Week 7-8)
- [ ] Create Artillery performance tests
- [ ] Establish performance baselines
- [ ] Configure complete CI/CD pipeline
- [ ] Set up test reporting and monitoring

### Phase 5: Continuous Improvement (Ongoing)
- [ ] Review and refactor tests monthly
- [ ] Update performance baselines
- [ ] Improve mutation scores
- [ ] Add new test patterns as needed

---

**Document Version:** 2.0
**Last Updated:** 2025-12-16
**Status:** Production Ready
**Maintainers:** Engineering Team

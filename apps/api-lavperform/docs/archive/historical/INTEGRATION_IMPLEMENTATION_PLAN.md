> **ARCHIVED**: This implementation plan has been completed. See [docs/guides/testing-guide.md](../../guides/testing-guide.md) for current testing documentation. See [docs/README.md](../../README.md) for navigation.

# SOTA Integration Testing Implementation Plan

**Goal:** Implement a robust integration testing infrastructure for `foodcrm-api` using Testcontainers (PostgreSQL + Redis) and Jest, ensuring CI/CD parity and isolation.

**Project Context:**
- NestJS application with Prisma ORM (PostgreSQL)
- Redis for Bull queues and caching
- Multi-tenant architecture (Company-based)
- JWT authentication via Passport
- External integrations (WhatsApp, Payment gateways, Digital menus)

**Related Documentation:** See [SOTA_TEST_STRATEGY.md](./SOTA_TEST_STRATEGY.md) for comprehensive testing philosophy and advanced patterns.

## Architectural Constraints (Non-Negotiable)

1.  **Infrastructure as Code (Testcontainers):**
    *   Must use `testcontainers` (Singleton Pattern).
    *   The containers must start ONCE per test suite (in `global-setup.ts`).
    *   Based on dependencies, we MUST spin up **PostgreSQL** AND **Redis**.
    *   Prisma Migrations must run programmatically immediately after the Postgres container starts.

2.  **Jest Worker Isolation Bridge:**
    *   Must implement a file-based bridge: `global-setup.ts` writes the dynamic connection strings (DB URL and Redis Host/Port) to a `test-env.json` file.
    *   The `jest.integration.config.ts` must read this file to inject `process.env.DATABASE_URL` and `process.env.REDIS_HOST`/`PORT` for the workers.

3.  **CI/CD Parity (No "Double Bind"):**
    *   The GitHub Actions/CI YAML must **NOT** contain `services: postgres` or `services: redis`.
    *   The CI must rely entirely on the Node.js `global-setup` script to spin up the infrastructure.

4.  **Cleanup Strategy:**
    *   Use **TRUNCATE** (via `afterEach` hook) for Postgres.
    *   Use `FLUSHALL` or similar for Redis cleanup between tests.
    *   Do NOT use Transaction Rollbacks (tests are Black Box via Supertest).

## Implementation Steps

### 1. Project Structure (New Files)
We will create the following directory structure inside `test/integration/`:

```text
test/integration/
├── setup/
│   ├── global-setup.ts       # Orchestrator: Starts PG + Redis
│   ├── global-teardown.ts    # Cleaner: Stops containers
│   ├── test-env.json         # Bridge: Stores DB URLs (GitIgnored)
│   └── setup-after-env.ts    # Injector: Sets process.env per worker
├── utils/
│   └── db-cleaner.ts         # Logic: TRUNCATE tables
├── jest-integration.config.ts # Configuration
└── health.integration.spec.ts # "Hello World" verification
```

### 2. Dependencies
We will install:
- `testcontainers`
- `@testcontainers/postgresql`
- `@testcontainers/redis`
- `@types/jest` (dev)

**Install Command:**
```bash
npm install --save-dev testcontainers @testcontainers/postgresql @testcontainers/redis
```

### 3. Source Code Implementation

#### A. Global Setup (`test/integration/setup/global-setup.ts`)
Responsible for starting Postgres and Redis containers once per suite. It runs Prisma migrations and writes connection strings to `test-env.json`.

```typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

let postgresContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;

export default async function globalSetup() {
  console.log('🐳 Starting Test Containers...');

  // Start Containers in Parallel
  const [pg, redis] = await Promise.all([
    new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('testdb')
      .withUsername('postgres')
      .withPassword('postgres')
      .withExposedPorts(5432)
      .start(),
    new RedisContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start()
  ]);

  postgresContainer = pg;
  redisContainer = redis;

  const databaseUrl = postgresContainer.getConnectionUri();
  const redisHost = redisContainer.getHost();
  const redisPort = redisContainer.getMappedPort(6379);

  console.log(`✅ PostgreSQL started on ${databaseUrl}`);
  console.log(`✅ Redis started on ${redisHost}:${redisPort}`);

  // Write bridge file
  const testEnvPath = path.join(__dirname, 'test-env.json');
  fs.writeFileSync(
    testEnvPath,
    JSON.stringify({
      DATABASE_URL: databaseUrl,
      REDIS_HOST: redisHost,
      REDIS_PORT: redisPort,
      JWT_SECRET: 'test-secret',
    }),
    'utf-8'
  );

  // Run Migrations
  console.log('🔄 Running Prisma migrations...');
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });
    console.log('✅ Migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await postgresContainer.stop();
    await redisContainer.stop();
    throw error;
  }

  // Store globally for teardown
  (global as any).__POSTGRES__ = postgresContainer;
  (global as any).__REDIS__ = redisContainer;
}
```

#### B. Global Teardown (`test/integration/setup/global-teardown.ts`)
Responsible for stopping containers and cleaning up the `test-env.json` file.

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedRedisContainer } from '@testcontainers/redis';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  const pg = (global as any).__POSTGRES__ as StartedPostgreSqlContainer;
  const redis = (global as any).__REDIS__ as StartedRedisContainer;

  if (pg) await pg.stop();
  if (redis) await redis.stop();

  const testEnvPath = path.join(__dirname, 'test-env.json');
  if (fs.existsSync(testEnvPath)) {
    fs.unlinkSync(testEnvPath);
  }
  console.log('✅ Environment Cleaned');
}
```

#### C. Jest Config (`test/integration/jest-integration.config.ts`)
Configures Jest to use the global setup/teardown and injects environment variables into workers using `test-env.json`.

```typescript
import type { Config } from 'jest';
import * as fs from 'fs';
import * as path from 'path';

// Pre-load env for configuration scope
const testEnvPath = path.join(__dirname, 'setup/test-env.json');
if (fs.existsSync(testEnvPath)) {
  const env = JSON.parse(fs.readFileSync(testEnvPath, 'utf-8'));
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.REDIS_HOST = env.REDIS_HOST;
  process.env.REDIS_PORT = env.REDIS_PORT;
  process.env.JWT_SECRET = env.JWT_SECRET;
}

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../../', // Go up to project root
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  environment: 'node',
  globalSetup: '<rootDir>/test/integration/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/setup/global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup/setup-after-env.ts'], // See below
  maxWorkers: 1, // Sequential
  testTimeout: 60000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  }
};
export default config;
```

#### D. Worker Injection (`test/integration/setup/setup-after-env.ts`)
Injects variables into the actual test worker process.

```typescript
import * as fs from 'fs';
import * as path from 'path';

const testEnvPath = path.join(__dirname, 'test-env.json');
if (fs.existsSync(testEnvPath)) {
  const env = JSON.parse(fs.readFileSync(testEnvPath, 'utf-8'));
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.REDIS_HOST = env.REDIS_HOST;
  process.env.REDIS_PORT = env.REDIS_PORT;
}
```

#### E. DB Cleaner (`test/integration/utils/db-cleaner.ts`)
Implements robust `TRUNCATE` logic.

```typescript
import { PrismaClient } from '@prisma/client';

export class DatabaseCleaner {
  constructor(private prisma: PrismaClient) {}

  async cleanAll(): Promise<void> {
    const tablenames = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations'
    `;

    try {
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
      for (const { tablename } of tablenames) {
        if (tablename !== '_prisma_migrations') {
           await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
        }
      }
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
    } catch (error) {
       await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
       throw error;
    }
  }

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

#### F. CI/CD Pipeline (`.github/workflows/integration-tests.yml`)

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Run Integration Tests
        run: npx jest --config test/integration/jest-integration.config.ts --runInBand
```

#### G. NestJS Test Application Bootstrap (`test/integration/utils/test-app.ts`)
Provides a helper to bootstrap the NestJS application for integration tests with proper configuration.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';

export class TestApp {
  private app: INestApplication;
  private moduleFixture: TestingModule;

  async setup(): Promise<INestApplication> {
    // Override environment for testing
    process.env.ENVIRONMENT = 'test';
    process.env.NODE_ENV = 'test';

    this.moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Override providers if needed (e.g., external services)
      .compile();

    this.app = this.moduleFixture.createNestApplication();

    // Apply same middleware/pipes as production
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    await this.app.init();
    return this.app;
  }

  async teardown(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }

  getApp(): INestApplication {
    return this.app;
  }

  getModule(): TestingModule {
    return this.moduleFixture;
  }
}
```

#### H. Authentication Helper (`test/integration/utils/auth-helper.ts`)
Provides JWT token generation for authenticated endpoints.

```typescript
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export class AuthHelper {
  private jwtService: JwtService;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-secret-key',
      signOptions: { expiresIn: '1h' },
    });
  }

  /**
   * Creates a test user with company and returns access token
   */
  async createAuthenticatedUser(overrides: {
    email?: string;
    name?: string;
    companyName?: string;
  } = {}) {
    const hashedPassword = await bcrypt.hash('Test123!', 10);

    // Create company
    const company = await this.prisma.company.create({
      data: {
        name: overrides.companyName || 'Test Company',
        cnpj: this.generateCNPJ(),
        email: 'company@test.com',
        state: 'ACTIVE',
      },
    });

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: overrides.email || 'test@example.com',
        name: overrides.name || 'Test User',
        phone: '+5511999999999',
        password: hashedPassword,
        userCompanies: {
          create: {
            companyId: company.id,
          },
        },
      },
    });

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      companyId: company.id,
    });

    return { user, company, token };
  }

  /**
   * Generate valid CNPJ for testing
   */
  private generateCNPJ(): string {
    const random = () => Math.floor(Math.random() * 10);
    return `${random()}${random()}.${random()}${random()}${random()}.${random()}${random()}${random()}/${random()}${random()}${random()}${random()}-${random()}${random()}`;
  }
}
```

#### I. Test Data Factories (`test/integration/fixtures/`)
Create factories for domain entities using the builder pattern.

**File:** `test/integration/fixtures/customer.factory.ts`
```typescript
import { faker } from '@faker-js/faker';
import { PrismaClient, Customer } from '@prisma/client';

export class CustomerFactory {
  constructor(private prisma: PrismaClient) {}

  async create(
    companyId: string,
    overrides: Partial<Customer> = {}
  ): Promise<Customer> {
    return this.prisma.customer.create({
      data: {
        name: overrides.name || faker.person.fullName(),
        phone: overrides.phone || faker.phone.number('+55119########'),
        email: overrides.email || faker.internet.email(),
        birthDate: overrides.birthDate || faker.date.past({ years: 30 }),
        whatsappOptin: overrides.whatsappOptin ?? true,
        companyId,
        ...overrides,
      },
    });
  }

  async createMany(
    companyId: string,
    count: number,
    overrides: Partial<Customer> = {}
  ): Promise<Customer[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.create(companyId, overrides))
    );
  }

  async createWithOrders(companyId: string, orderCount: number = 3) {
    const customer = await this.create(companyId);
    // Create associated orders
    // Implementation depends on OrderFactory
    return customer;
  }
}
```

**File:** `test/integration/fixtures/index.ts`
```typescript
import { PrismaClient } from '@prisma/client';
import { CustomerFactory } from './customer.factory';

export class TestDataFactory {
  public customers: CustomerFactory;
  // Add more factories as needed

  constructor(private prisma: PrismaClient) {
    this.customers = new CustomerFactory(prisma);
  }

  /**
   * Quick setup for common test scenarios
   */
  async setupBasicCompanyWithCustomers(customerCount: number = 5) {
    // This would use AuthHelper to create company + customers
    // Return all created entities for test use
  }
}
```

#### J. Redis Cleaner (`test/integration/utils/redis-cleaner.ts`)
Handles Redis cleanup between tests.

```typescript
import Redis from 'ioredis';

export class RedisCleaner {
  constructor(private redis: Redis) {}

  async cleanAll(): Promise<void> {
    await this.redis.flushall();
    console.log('🧹 Redis cleaned');
  }

  async cleanPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

#### K. Package.json Scripts
Add the following scripts to `package.json`:

```json
{
  "scripts": {
    "test:integration": "jest --config test/integration/jest-integration.config.ts --runInBand --forceExit",
    "test:integration:watch": "jest --config test/integration/jest-integration.config.ts --watch",
    "test:integration:debug": "node --inspect-brk node_modules/.bin/jest --config test/integration/jest-integration.config.ts --runInBand",
    "test:integration:verbose": "jest --config test/integration/jest-integration.config.ts --runInBand --verbose --forceExit"
  }
}
```

#### L. GitIgnore Updates
Add the following to `.gitignore`:

```
# Integration test artifacts
test/integration/setup/test-env.json
test-results/
.testcontainers/
```

#### M. Environment Variables for Tests
Create a `.env.test` file or ensure these variables are set:

```bash
# Database (set dynamically by global-setup)
DATABASE_URL=

# Redis (set dynamically by global-setup)
REDIS_HOST=
REDIS_PORT=

# Application
NODE_ENV=test
ENVIRONMENT=test
JWT_SECRET=test-secret-key-change-in-production

# Disable external services in tests
SENTRY_DSN=
BULL_BOARD_PASSWORD=test-password

# External API mocks (point to WireMock if needed)
WHATSAPP_API_URL=http://localhost:8080/whatsapp
PAYMENT_API_URL=http://localhost:8080/payments
```

#### N. Example Integration Test
Create the first real integration test to verify the setup.

**File:** `test/integration/health.integration.spec.ts`

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from './utils/test-app';
import { DatabaseCleaner } from './utils/db-cleaner';
import { RedisCleaner } from './utils/redis-cleaner';
import Redis from 'ioredis';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('Health Check (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let redis: Redis;
  let dbCleaner: DatabaseCleaner;
  let redisCleaner: RedisCleaner;

  beforeAll(async () => {
    // Initialize app
    testApp = new TestApp();
    app = await testApp.setup();

    // Initialize clients
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    // Initialize cleaners
    dbCleaner = new DatabaseCleaner(prisma);
    redisCleaner = new RedisCleaner(redis);
  });

  afterAll(async () => {
    await redis.quit();
    await prisma.$disconnect();
    await testApp.teardown();
  });

  afterEach(async () => {
    await dbCleaner.cleanAll();
    await redisCleaner.cleanAll();
  });

  it('should return 200 for GET /', async () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200);
  });

  it('should connect to database successfully', async () => {
    // Verify database connection by creating a record
    const company = await prisma.company.create({
      data: {
        name: 'Test Company',
        cnpj: '12.345.678/0001-90',
        email: 'test@example.com',
        state: 'ACTIVE',
      },
    });

    expect(company.id).toBeDefined();

    // Verify in database
    const found = await prisma.company.findUnique({
      where: { id: company.id },
    });

    expect(found).toBeDefined();
    expect(found?.name).toBe('Test Company');
  });

  it('should connect to Redis successfully', async () => {
    const key = 'test:key';
    const value = 'test-value';

    await redis.set(key, value);
    const retrieved = await redis.get(key);

    expect(retrieved).toBe(value);
  });
});
```

**File:** `test/integration/auth/auth-login.integration.spec.ts`

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('Auth - Login (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;

  beforeAll(async () => {
    testApp = new TestApp();
    app = await testApp.setup();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    dbCleaner = new DatabaseCleaner(prisma);
    authHelper = new AuthHelper(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await testApp.teardown();
  });

  afterEach(async () => {
    await dbCleaner.cleanAll();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      // Setup: Create user with known password
      const password = 'Test123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          cnpj: '12.345.678/0001-90',
          email: 'company@test.com',
          state: 'ACTIVE',
        },
      });

      const user = await prisma.user.create({
        data: {
          email: 'user@test.com',
          name: 'Test User',
          phone: '+5511999999999',
          password: hashedPassword,
          userCompanies: {
            create: {
              companyId: company.id,
            },
          },
        },
      });

      // Act: Login
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'user@test.com',
          password: password,
        })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('user@test.com');
    });

    it('should return 401 with invalid credentials', async () => {
      const { user } = await authHelper.createAuthenticatedUser();

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 with missing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: 'Test123!',
        })
        .expect(400);
    });
  });
});
```

## Verification Plan

### Pre-Flight Checklist
Before running tests, ensure:
- [ ] Docker is running
- [ ] Node.js dependencies installed (`npm install`)
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] All migration files exist in `prisma/migrations/`

### Automated Tests
Run the new test suite:
```bash
# Run all integration tests
npm run test:integration

# Run with verbose output
npm run test:integration:verbose

# Run in watch mode (during development)
npm run test:integration:watch

# Debug a specific test
npm run test:integration:debug -- health.integration.spec.ts
```

### Manual Verification Steps

#### Step 1: Verify Container Startup
```bash
npm run test:integration
```

Expected console output:
```
🐳 Starting Test Containers...
✅ PostgreSQL started on postgresql://postgres:postgres@localhost:xxxxx/testdb
✅ Redis started on localhost:xxxxx
🔄 Running Prisma migrations...
✅ Migrations completed
```

#### Step 2: Verify Test Execution
Look for:
- `PASS test/integration/health.integration.spec.ts`
- All tests passing
- No timeout errors

#### Step 3: Verify Cleanup
After tests complete:
```bash
# Check for lingering containers (should be none)
docker ps

# Verify test-env.json was cleaned up (should not exist)
ls test/integration/setup/test-env.json
```

#### Step 4: Verify Database Isolation
Run the same test twice:
```bash
npm run test:integration -- health.integration.spec.ts
npm run test:integration -- health.integration.spec.ts
```

Both runs should pass identically (proves cleanup works).

## Troubleshooting

### Common Issues

#### Issue 1: "Cannot find module 'test-env.json'"
**Cause:** Global setup didn't run or failed.

**Solution:**
```bash
# Check if Docker is running
docker ps

# Manually run global-setup to see errors
npx ts-node test/integration/setup/global-setup.ts
```

#### Issue 2: "Port already in use"
**Cause:** Previous test run didn't clean up containers.

**Solution:**
```bash
# Stop all containers
docker stop $(docker ps -aq)

# Remove containers
docker rm $(docker ps -aq)

# Try again
npm run test:integration
```

#### Issue 3: "Timeout of 30000ms exceeded"
**Cause:** Container taking too long to start (slow machine/network).

**Solution:**
Increase timeout in `jest-integration.config.ts`:
```typescript
testTimeout: 60000, // 60 seconds
```

#### Issue 4: "Migration failed: Connection refused"
**Cause:** Database container not ready when migrations run.

**Solution:**
Add wait logic in `global-setup.ts`:
```typescript
// Wait for PostgreSQL to be ready
await postgresContainer.waitForHealthCheck();
// Or add manual retry logic
```

#### Issue 5: Tests pass locally but fail in CI
**Cause:** Environment differences or missing CI configuration.

**Solution:**
1. Verify CI has Docker available
2. Check CI logs for container startup errors
3. Ensure no hardcoded ports (use dynamic ports from containers)
4. Verify DATABASE_URL is correctly passed to workers

### Debug Mode

Run with Node debugger:
```bash
npm run test:integration:debug
```

Then attach your IDE debugger to the Node process.

### Verbose Logging

Enable all logs:
```bash
DEBUG=testcontainers* npm run test:integration
```

## Migration Strategy from Existing Tests

### Current State
The project has:
- `test/app.e2e-spec.ts` - Basic E2E test
- `test/jest-e2e.json` - E2E Jest configuration
- `src/metrics/metrics.service.spec.ts` - Unit test example

### Migration Plan

#### Phase 1: Coexistence (Week 1)
Keep existing tests while building integration infrastructure:
```json
{
  "scripts": {
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:integration": "jest --config test/integration/jest-integration.config.ts --runInBand --forceExit"
  }
}
```

#### Phase 2: Gradual Migration (Week 2-3)
1. Create integration tests for critical flows (auth, customers, orders)
2. Compare coverage with E2E tests
3. Once integration tests achieve parity, deprecate E2E tests

#### Phase 3: Cleanup (Week 4)
1. Remove old E2E tests
2. Update CI pipeline to use integration tests
3. Archive `test/jest-e2e.json`

### Naming Convention
To distinguish between test types:
- Unit tests: `*.spec.ts` (e.g., `user.service.spec.ts`)
- Integration tests: `*.integration.spec.ts` (e.g., `auth-login.integration.spec.ts`)
- E2E tests (legacy): `*.e2e-spec.ts`

## Best Practices for FoodCRM-API

### 1. Multi-Tenancy Testing
All tests MUST respect company isolation:

```typescript
describe('Customer CRUD (Integration)', () => {
  let company1: Company;
  let company2: Company;
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    // Create two separate companies
    const auth1 = await authHelper.createAuthenticatedUser({
      companyName: 'Company 1',
    });
    const auth2 = await authHelper.createAuthenticatedUser({
      companyName: 'Company 2',
    });

    company1 = auth1.company;
    company2 = auth2.company;
    token1 = auth1.token;
    token2 = auth2.token;
  });

  it('should not allow cross-company data access', async () => {
    // Create customer for company1
    const customer = await prisma.customer.create({
      data: {
        name: 'Customer 1',
        phone: '+5511999999999',
        companyId: company1.id,
      },
    });

    // Try to access from company2 (should fail)
    const response = await request(app.getHttpServer())
      .get(`/customers/${customer.id}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(403); // or 404 depending on implementation
  });
});
```

### 2. Bull Queue Testing
For endpoints that enqueue jobs:

```typescript
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

describe('Campaign Creation (Integration)', () => {
  let messageQueue: Queue;

  beforeAll(async () => {
    messageQueue = testApp.getModule().get(getQueueToken('message-processing'));

    // Clean queue before tests
    await messageQueue.empty();
  });

  afterEach(async () => {
    await messageQueue.empty();
  });

  it('should enqueue messages for campaign', async () => {
    const { company, token } = await authHelper.createAuthenticatedUser();

    // Create customers
    await customerFactory.createMany(company.id, 5);

    // Create campaign
    const response = await request(app.getHttpServer())
      .post('/campaigns')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Campaign',
        messageText: 'Hello!',
        scheduledDate: new Date(),
        segmentation: 'all',
      })
      .expect(201);

    // Verify jobs were enqueued
    const jobs = await messageQueue.getJobs(['waiting', 'delayed']);
    expect(jobs.length).toBe(5);
  });

  it('should process campaign messages', async () => {
    // This requires processing the queue
    // Consider using a separate worker test or mock the processor
  });
});
```

### 3. External Service Mocking
For WhatsApp, Payment APIs, etc.:

```typescript
import nock from 'nock';

describe('WhatsApp Integration (Integration)', () => {
  beforeEach(() => {
    // Mock WhatsApp API
    nock('http://localhost:8080')
      .post('/whatsapp/send')
      .reply(200, {
        messageId: 'msg_123',
        status: 'sent',
      });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should send WhatsApp message', async () => {
    const { company, token } = await authHelper.createAuthenticatedUser();

    const response = await request(app.getHttpServer())
      .post('/messages/send')
      .set('Authorization', `Bearer ${token}`)
      .send({
        phone: '+5511999999999',
        message: 'Test message',
      })
      .expect(200);

    expect(response.body).toHaveProperty('messageId');
  });
});
```

Alternative: Use WireMock (more robust for complex scenarios):
```typescript
// See SOTA_TEST_STRATEGY.md for WireMock setup
```

### 4. Prisma Client Singleton
Avoid creating multiple Prisma clients:

```typescript
// test/integration/utils/prisma-client.ts
import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prismaClient;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}
```

### 5. Test Data Isolation
Use unique identifiers to avoid collisions:

```typescript
import { randomUUID } from 'crypto';

export class TestDataBuilder {
  static uniqueEmail(): string {
    return `test-${randomUUID()}@example.com`;
  }

  static uniqueCNPJ(): string {
    const rand = () => Math.floor(Math.random() * 100000000);
    return `${rand().toString().padStart(8, '0')}0001${randomUUID().slice(0, 2)}`;
  }

  static uniquePhone(): string {
    const rand = () => Math.floor(Math.random() * 100000000);
    return `+5511${rand().toString().padStart(9, '0')}`;
  }
}
```

## Implementation Roadmap

### Week 1: Foundation Setup
**Deliverables:**
- [ ] Install dependencies (`testcontainers`, `@faker-js/faker`)
- [ ] Create directory structure (`test/integration/`)
- [ ] Implement `global-setup.ts` with PostgreSQL + Redis
- [ ] Implement `global-teardown.ts`
- [ ] Implement `setup-after-env.ts`
- [ ] Configure `jest-integration.config.ts`
- [ ] Update `.gitignore`
- [ ] Create `health.integration.spec.ts` and verify it passes

**Success Criteria:**
- Health test passes locally
- Containers start and stop cleanly
- No lingering Docker containers after test run

### Week 2: Core Utilities
**Deliverables:**
- [ ] Implement `DatabaseCleaner`
- [ ] Implement `RedisCleaner`
- [ ] Implement `TestApp` helper
- [ ] Implement `AuthHelper`
- [ ] Create `CustomerFactory`
- [ ] Create `CompanyFactory`
- [ ] Add npm scripts to `package.json`

**Success Criteria:**
- Can create authenticated test users
- Can create test data with factories
- Database cleanup works (run same test twice, both pass)

### Week 3: Critical Flow Tests
**Deliverables:**
- [ ] Auth integration tests (login, refresh, logout)
- [ ] Customer CRUD integration tests
- [ ] Company management tests
- [ ] Multi-tenancy validation tests
- [ ] Campaign creation tests

**Success Criteria:**
- 5+ integration test suites passing
- Tests verify business logic, not just HTTP status codes
- Multi-tenant isolation verified

### Week 4: CI/CD & Advanced
**Deliverables:**
- [ ] Update GitHub Actions workflow (remove postgres service)
- [ ] Add integration tests to CI pipeline
- [ ] Implement queue testing utilities
- [ ] Add external service mocking examples
- [ ] Document all test patterns

**Success Criteria:**
- Integration tests pass in CI
- CI environment mirrors local perfectly
- Test execution time < 5 minutes

### Week 5+: Continuous Expansion
**Ongoing:**
- [ ] Add integration tests for each new feature
- [ ] Maintain test data factories
- [ ] Review and refactor tests monthly
- [ ] Monitor test execution time
- [ ] Update documentation as patterns evolve

## Additional Dependencies

Beyond the core dependencies, install these for enhanced testing:

```bash
npm install --save-dev \
  @faker-js/faker \
  nock
```

**Optional (for advanced scenarios):**
```bash
npm install --save-dev \
  jest-extended \
  jest-html-reporter \
  artillery \
  @pact-foundation/pact
```

## Performance Considerations

### Test Execution Time
Target benchmarks:
- Individual test: < 5 seconds
- Full integration suite: < 5 minutes
- CI pipeline (all tests): < 10 minutes

### Optimization Strategies

1. **Parallel Test Files** (with caution):
```typescript
// jest-integration.config.ts
maxWorkers: 1, // Start with sequential
// Later: maxWorkers: 2, // Increase if needed
```

2. **Shared Setup for Related Tests**:
```typescript
describe('Customer API (Integration)', () => {
  let sharedCompany: Company;
  let sharedToken: string;

  // Create once for all tests in this suite
  beforeAll(async () => {
    const auth = await authHelper.createAuthenticatedUser();
    sharedCompany = auth.company;
    sharedToken = auth.token;
  });

  // Only clean customer data, keep company/user
  afterEach(async () => {
    await dbCleaner.cleanTables(['Customer', 'Order']);
  });
});
```

3. **Database Cleanup Optimization**:
```typescript
// Only truncate tables that were modified
afterEach(async () => {
  await dbCleaner.cleanTables([
    'Customer',
    'Order',
    'Message',
    // Don't clean User, Company if they weren't modified
  ]);
});
```

## Security Considerations

### Test Data Safety
- ❌ NEVER use real customer data in tests
- ✅ ALWAYS use faker-generated data
- ✅ Use `.env.test` for test credentials
- ✅ Ensure test containers are isolated from production

### Secrets Management
```typescript
// ❌ Bad
const JWT_SECRET = 'hardcoded-secret';

// ✅ Good
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-only-for-local';
```

### Test Environment Markers
```typescript
// Prevent accidental production execution
if (process.env.NODE_ENV === 'production') {
  throw new Error('Integration tests cannot run in production!');
}
```

## Summary

This implementation plan provides a comprehensive, production-ready integration testing infrastructure for `foodcrm-api` that:

✅ **Ensures CI/CD parity** - No "works on my machine" issues
✅ **Provides fast feedback** - Tests run in < 5 minutes
✅ **Guarantees isolation** - Each test is independent and clean
✅ **Supports multi-tenancy** - Company-based data segregation tested
✅ **Handles real infrastructure** - PostgreSQL, Redis via Testcontainers
✅ **Enables TDD** - Write tests before code
✅ **Scales with the team** - Clear patterns and utilities

**Next Step:** Start with Week 1 implementation and create your first passing integration test!

---

**Document Version:** 2.0
**Last Updated:** 2025-12-16
**Maintainers:** Engineering Team
**Related:** [SOTA_TEST_STRATEGY.md](./SOTA_TEST_STRATEGY.md)

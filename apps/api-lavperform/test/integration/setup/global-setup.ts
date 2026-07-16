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
      ASAAS_BASE_URL: 'https://sandbox.asaas.com',
      ASAAS_API_KEY: 'test-api-key',
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

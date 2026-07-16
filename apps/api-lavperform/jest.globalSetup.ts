import { StartedPostgreSqlContainer, PostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedRedisContainer, RedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';

declare global {
  // eslint-disable-next-line no-var
  var __POSTGRES_CONTAINER__: StartedPostgreSqlContainer;
  // eslint-disable-next-line no-var
  var __REDIS_CONTAINER__: StartedRedisContainer;
}

export default async function globalSetup() {
  console.log('🐳 Starting Testcontainers...');

  try {
    // Start PostgreSQL container
    console.log('  📦 Starting PostgreSQL container...');
    const postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('testdb')
      .withUsername('testuser')
      .withPassword('testpass')
      .start();

    // Start Redis container
    console.log('  📦 Starting Redis container...');
    const redisContainer = await new RedisContainer('redis:7-alpine').start();

    // Store containers globally for teardown
    globalThis.__POSTGRES_CONTAINER__ = postgresContainer;
    globalThis.__REDIS_CONTAINER__ = redisContainer;

    // Set environment variables
    const databaseUrl = postgresContainer.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;
    process.env.REDIS_HOST = redisContainer.getHost();
    process.env.REDIS_PORT = String(redisContainer.getPort());

    console.log('  🔗 Database URL:', databaseUrl);
    console.log('  🔗 Redis Host:', redisContainer.getHost());
    console.log('  🔗 Redis Port:', redisContainer.getPort());

    // Run Prisma migrations
    console.log('  🔄 Running database migrations...');
    try {
      execSync('npx prisma migrate deploy', {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
        },
        stdio: 'inherit',
      });
    } catch (error) {
      console.error('  ❌ Failed to run migrations:', error);
      throw error;
    }

    console.log('✅ Testcontainers started successfully');
  } catch (error) {
    console.error('❌ Failed to start Testcontainers:', error);
    throw error;
  }
}

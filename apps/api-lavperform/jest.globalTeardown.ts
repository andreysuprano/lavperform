import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { StartedRedisContainer } from '@testcontainers/redis';

declare global {
  // eslint-disable-next-line no-var
  var __POSTGRES_CONTAINER__: StartedPostgreSqlContainer;
  // eslint-disable-next-line no-var
  var __REDIS_CONTAINER__: StartedRedisContainer;
}

export default async function globalTeardown() {
  console.log('🧹 Stopping Testcontainers...');

  try {
    if (globalThis.__POSTGRES_CONTAINER__) {
      console.log('  🛑 Stopping PostgreSQL container...');
      await globalThis.__POSTGRES_CONTAINER__.stop();
    }

    if (globalThis.__REDIS_CONTAINER__) {
      console.log('  🛑 Stopping Redis container...');
      await globalThis.__REDIS_CONTAINER__.stop();
    }

    console.log('✅ Testcontainers stopped successfully');
  } catch (error) {
    console.error('❌ Failed to stop Testcontainers:', error);
    throw error;
  }
}

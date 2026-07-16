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

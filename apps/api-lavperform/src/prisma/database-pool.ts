import { Logger } from '@nestjs/common';
import { Pool, PoolConfig } from 'pg';

const logger = new Logger('PgPool');

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function createDatabasePoolConfig(
  connectionString?: string,
): PoolConfig {
  return {
    connectionString: connectionString ?? process.env.DATABASE_URL,
    max: readPositiveInt(process.env.DATABASE_POOL_MAX, 20),
    idleTimeoutMillis: readPositiveInt(
      process.env.DATABASE_POOL_IDLE_TIMEOUT_MS,
      30_000,
    ),
    connectionTimeoutMillis: readPositiveInt(
      process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS,
      10_000,
    ),
    keepAlive: true,
    keepAliveInitialDelayMillis: readPositiveInt(
      process.env.DATABASE_POOL_KEEPALIVE_INITIAL_DELAY_MS,
      10_000,
    ),
    maxLifetimeSeconds: readPositiveInt(
      process.env.DATABASE_POOL_MAX_LIFETIME_SECONDS,
      30 * 60,
    ),
    allowExitOnIdle: false,
  };
}

export function createDatabasePool(connectionString?: string): Pool {
  const pool = new Pool(createDatabasePoolConfig(connectionString));

  pool.on('error', (err) => {
    logger.error(`Erro em conexão ociosa do pool: ${err.message}`, err.stack);
  });

  return pool;
}

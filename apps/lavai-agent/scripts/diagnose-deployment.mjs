/**
 * Diagnóstico rápido do lavai-agent em produção/dev.
 *
 * Uso:
 *   cd apps/lavai-agent
 *   node scripts/diagnose-deployment.mjs
 *
 * Opcional:
 *   LAVAI_PUBLIC_URL=https://development-lav-ai.eefvku.easypanel.host
 */

import 'dotenv/config';
import { Client } from 'pg';
import IORedis from 'ioredis';

const publicUrl = (
  process.env.LAVAI_PUBLIC_URL ??
  process.env.LAVAI_AGENT_BASE_URL ??
  process.env.OVER_AGENT_BASE_URL ??
  ''
).replace(/\/$/, '');

function ok(label, detail = '') {
  console.log(`✓ ${label}${detail ? `: ${detail}` : ''}`);
}

function fail(label, detail = '') {
  console.log(`✗ ${label}${detail ? `: ${detail}` : ''}`);
}

async function checkDatabase() {
  if (!process.env.DATABASE_URL) {
    fail('DATABASE_URL', 'não definido');
    return false;
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const companies = await client.query('SELECT COUNT(*)::int AS n FROM companies');
    const failed = await client.query(
      'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL',
    );
    await client.end();

    ok('PostgreSQL', `${companies.rows[0].n} companies`);
    if (failed.rows.length > 0) {
      fail(
        'Migrations pendentes/falhas',
        failed.rows.map((r) => r.migration_name).join(', '),
      );
      return false;
    }
    ok('Migrations', 'sem registros falhos');
    return true;
  } catch (error) {
    fail('PostgreSQL', error.message);
    return false;
  }
}

async function checkRedis() {
  if (!process.env.REDIS_URL) {
    fail('REDIS_URL', 'não definido');
    return false;
  }

  const redis = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    const pong = await redis.ping();
    await redis.quit();
    ok('Redis', pong);
    return true;
  } catch (error) {
    fail('Redis', error.message);
    try {
      await redis.quit();
    } catch {
      // ignore
    }
    return false;
  }
}

async function checkPublicHttp() {
  if (!publicUrl) {
    fail('URL pública', 'defina LAVAI_PUBLIC_URL ou OVER_AGENT_BASE_URL');
    return false;
  }

  for (const path of ['/docs', '/companies']) {
    try {
      const response = await fetch(`${publicUrl}${path}`, { redirect: 'follow' });
      if (response.status >= 500) {
        fail(`HTTP ${path}`, `status ${response.status} — serviço provavelmente fora do ar no Easypanel`);
        return false;
      }
      ok(`HTTP ${path}`, `status ${response.status}`);
    } catch (error) {
      fail(`HTTP ${path}`, error.message);
      return false;
    }
  }

  return true;
}

console.log('Diagnóstico LavAI Agent\n');
console.log(`URL pública: ${publicUrl || '(não configurada)'}\n`);

const dbOk = await checkDatabase();
const redisOk = await checkRedis();
const httpOk = await checkPublicHttp();

console.log('\n' + '='.repeat(60));
if (!httpOk) {
  console.log('CAUSA PROVÁVEL DO 500 NA INTERFACE:');
  console.log('  app → api-lavperform → lavai-agent (502/sem resposta)');
  console.log('  O BFF converte isso em HTTP 500 para o frontend.');
  console.log('\nAÇÃO: abra os logs do serviço lav-ai no Easypanel e redeploy.');
  if (!redisOk) console.log('  Também corrija REDIS_URL — Redis inacessível derruba o container.');
  if (!dbOk) console.log('  Também corrija DATABASE_URL / migrations do Prisma.');
} else {
  console.log('Serviço acessível externamente.');
}
console.log('='.repeat(60));

process.exit(httpOk && dbOk && redisOk ? 0 : 1);

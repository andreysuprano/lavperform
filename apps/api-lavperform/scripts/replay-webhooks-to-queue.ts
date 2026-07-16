/**
 * Reenfileira webhooks armazenados em `WebhookReceived` para processamento.
 *
 * Suporta parceiros com fila assíncrona:
 *   - CONSUMER → fila `consumer-webhook-process`
 *
 * Uso:
 *   # Dry-run (padrão): lista o que seria enfileirado
 *   npx ts-node -r tsconfig-paths/register scripts/replay-webhooks-to-queue.ts \
 *     --partner-id <uuid> --from 2026-06-01 --to 2026-06-29
 *
 *   # Aplica o reenfileiramento
 *   npx ts-node -r tsconfig-paths/register scripts/replay-webhooks-to-queue.ts \
 *     --partner-id <uuid> --from 2026-06-01 --to 2026-06-29 --apply
 *
 *   # Alternativa por slug do partner
 *   npx ts-node -r tsconfig-paths/register scripts/replay-webhooks-to-queue.ts \
 *     --partner-slug CONSUMER --from 2026-06-01T00:00:00Z --to 2026-06-29T23:59:59Z --apply
 *
 * Filtros opcionais:
 *   --company <companyId>   Limita a uma empresa
 *   --limit <n>             Processa no máximo N webhooks (ordem por createdAt asc)
 */

import 'dotenv/config';
import type { Queue } from 'bull';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { QUEUE_NAMES } from '../src/common/queue/queue.constants';
import { CONSUMER_WEBHOOK_JOB_NAME } from '../src/integrations/consumer/consumer-webhook-jobs.constants';
import {
  isConsumerPayloadReadyForPersistence,
  normalizeConsumerWebhookPayload,
} from '../src/integrations/consumer/utils/consumer-webhook-payload-normalize';

// bull exporta o construtor como module.exports (sem default em CJS/ts-node)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BullQueue = require('bull') as typeof import('bull');

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL não está configurado; configure no seu arquivo .env.',
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface CliOptions {
  apply: boolean;
  partnerId?: string;
  partnerSlug?: string;
  from: Date;
  to: Date;
  companyId?: string;
  limit?: number;
}

interface ReplayStats {
  total: number;
  enqueued: number;
  alreadyReceived: number;
  skippedEvent: number;
  skippedNotReady: number;
  skippedMapFailed: number;
  skippedUnsupportedPartner: number;
  errors: number;
}

function getRedisConfig(): { host: string; port: number; password?: string } {
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    ...(process.env.REDIS_PASSWORD
      ? { password: process.env.REDIS_PASSWORD }
      : {}),
  };
}

async function assertRedisAvailable(): Promise<void> {
  const config = getRedisConfig();
  const redis = new Redis({
    ...config,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    await redis.ping();
  } catch {
    throw new Error(
      `Não foi possível conectar ao Redis em ${config.host}:${config.port}. ` +
        'Verifique se o Redis está rodando e se REDIS_HOST/REDIS_PORT/REDIS_PASSWORD estão corretos no .env.',
    );
  } finally {
    await redis.quit();
  }
}

function createQueue(name: string): Queue {
  return new BullQueue(name, { redis: getRedisConfig() });
}

function printHelp(): void {
  console.log(`
Uso:
  ts-node -r tsconfig-paths/register scripts/replay-webhooks-to-queue.ts [opções]

Opções:
  --partner-id <uuid>       ID do partner (obrigatório se --partner-slug não informado)
  --partner-slug <slug>     Slug do partner (ex.: CONSUMER)
  --from <ISO ou YYYY-MM-DD>  Início do intervalo de createdAt (inclusivo)
  --to <ISO ou YYYY-MM-DD>    Fim do intervalo de createdAt (inclusivo)
  --company <uuid>          Filtra por empresa
  --limit <n>               Limita quantidade de webhooks processados
  --apply                   Enfileira de fato (sem isso, apenas dry-run)
  --help, -h                Exibe esta ajuda
`);
}

function parseDate(value: string, label: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Data inválida em --${label}: "${value}"`);
  }
  return parsed;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: Partial<CliOptions> = { apply: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--apply':
        opts.apply = true;
        break;
      case '--partner-id':
        opts.partnerId = argv[++i];
        break;
      case '--partner-slug':
        opts.partnerSlug = argv[++i];
        break;
      case '--from':
        opts.from = parseDate(argv[++i], 'from');
        break;
      case '--to':
        opts.to = parseDate(argv[++i], 'to');
        break;
      case '--company':
        opts.companyId = argv[++i];
        break;
      case '--limit': {
        const n = parseInt(argv[++i], 10);
        if (!Number.isFinite(n) || n <= 0) {
          throw new Error('--limit deve ser um número positivo');
        }
        opts.limit = n;
        break;
      }
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  if (!opts.partnerId && !opts.partnerSlug) {
    throw new Error('Informe --partner-id ou --partner-slug');
  }
  if (!opts.from || !opts.to) {
    throw new Error('Informe --from e --to');
  }
  if (opts.from > opts.to) {
    throw new Error('--from deve ser anterior ou igual a --to');
  }

  return opts as CliOptions;
}

function parseWebhookData(data: string): Record<string, unknown> {
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    throw new Error('Payload JSON inválido em WebhookReceived.data');
  }
}

async function replayConsumerWebhook(
  webhook: { id: string; companyId: string; data: string },
  partnerId: string,
  consumerQueue: Queue | null,
  apply: boolean,
  stats: ReplayStats,
): Promise<void> {
  const body = parseWebhookData(webhook.data);
  const payload = normalizeConsumerWebhookPayload(body);

  if (!isConsumerPayloadReadyForPersistence(payload)) {
    stats.skippedNotReady++;
    console.log(
      `  [skip not ready] ${webhook.id} pedido ainda não finalizado ou dados insuficientes`,
    );
    return;
  }

  if (!apply) {
    stats.enqueued++;
    console.log(
      `  [dry-run enqueue] ${webhook.id} pedido=${payload.pedido?.codigo ?? '?'} empresa=${webhook.companyId}`,
    );
    return;
  }

  const job = await consumerQueue!.add(
    CONSUMER_WEBHOOK_JOB_NAME,
    {
      companyId: webhook.companyId,
      consumerPartnerId: partnerId,
      payload,
    },
    {
      attempts: 5,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  stats.enqueued++;
  console.log(
    `  [enqueued] ${webhook.id} pedido=${payload.pedido?.codigo ?? '?'} jobId=${job.id}`,
  );
}

async function bootstrap(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const stats: ReplayStats = {
    total: 0,
    enqueued: 0,
    alreadyReceived: 0,
    skippedEvent: 0,
    skippedNotReady: 0,
    skippedMapFailed: 0,
    skippedUnsupportedPartner: 0,
    errors: 0,
  };

  console.log('='.repeat(60));
  console.log('  Replay de webhooks para fila de processamento');
  console.log(`  Modo: ${opts.apply ? 'APPLY (enfileirando)' : 'DRY-RUN (simulação)'}`);
  console.log('='.repeat(60));
  console.log('');

  let consumerQueue: Queue | null = null;

  try {
    if (opts.apply) {
      const redisConfig = getRedisConfig();
      console.log(`Redis: ${redisConfig.host}:${redisConfig.port}`);
      await assertRedisAvailable();
      console.log('Conexão com Redis OK');
      console.log('');
    }

    const partner = opts.partnerId
      ? await prisma.partner.findUnique({
          where: { id: opts.partnerId },
          select: { id: true, name: true, partnerSlug: true },
        })
      : await prisma.partner.findUnique({
          where: { partnerSlug: opts.partnerSlug! },
          select: { id: true, name: true, partnerSlug: true },
        });

    if (!partner) {
      throw new Error(
        opts.partnerId
          ? `Partner não encontrado: ${opts.partnerId}`
          : `Partner não encontrado com slug: ${opts.partnerSlug}`,
      );
    }

    const slug = partner.partnerSlug?.toUpperCase() ?? '';
    const supportedSlugs = ['CONSUMER'];

    if (!supportedSlugs.includes(slug)) {
      throw new Error(
        `Partner "${partner.name}" (${slug}) não possui fila de reprocessamento. ` +
          `Suportados: ${supportedSlugs.join(', ')}`,
      );
    }

    if (opts.apply) {
      if (slug === 'CONSUMER') {
        consumerQueue = createQueue(QUEUE_NAMES.CONSUMER_WEBHOOK_PROCESS);
      }
    }

    console.log(`Partner: ${partner.name} (${slug}) id=${partner.id}`);
    console.log(`Intervalo createdAt: ${opts.from.toISOString()} → ${opts.to.toISOString()}`);
    if (opts.companyId) console.log(`Empresa: ${opts.companyId}`);
    if (opts.limit) console.log(`Limite: ${opts.limit}`);
    console.log('');

    const webhooks = await prisma.webhookReceived.findMany({
      where: {
        partnerId: partner.id,
        createdAt: { gte: opts.from, lte: opts.to },
        ...(opts.companyId ? { companyId: opts.companyId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      ...(opts.limit ? { take: opts.limit } : {}),
      select: {
        id: true,
        companyId: true,
        data: true,
        createdAt: true,
      },
    });

    stats.total = webhooks.length;
    console.log(`Webhooks encontrados: ${webhooks.length}`);
    console.log('');

    if (webhooks.length === 0) {
      console.log('Nenhum webhook para reprocessar.');
      return;
    }

    for (const webhook of webhooks) {
      try {
        console.log(
          `Processando ${webhook.id} (empresa=${webhook.companyId}, createdAt=${webhook.createdAt.toISOString()})`,
        );

        if (slug === 'CONSUMER') {
          await replayConsumerWebhook(
            webhook,
            partner.id,
            consumerQueue,
            opts.apply,
            stats,
          );
        } else {
          stats.skippedUnsupportedPartner++;
        }
      } catch (error) {
        stats.errors++;
        console.error(
          `  [erro] ${webhook.id}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('  RESUMO');
    console.log('='.repeat(60));
    console.log(`Total analisados:     ${stats.total}`);
    console.log(
      `Enfileirados:         ${stats.enqueued}${opts.apply ? '' : ' (simulados)'}`,
    );
    console.log(`Já recebidos:         ${stats.alreadyReceived}`);
    console.log(`Ignorados (evento):   ${stats.skippedEvent}`);
    console.log(`Ignorados (payload):  ${stats.skippedNotReady + stats.skippedMapFailed}`);
    console.log(`Erros:                ${stats.errors}`);
    console.log('='.repeat(60));

    if (!opts.apply && stats.enqueued > 0) {
      console.log('');
      console.log('Execute novamente com --apply para enfileirar de fato.');
    }
  } finally {
    await consumerQueue?.close();
    await prisma.$disconnect();
    await pool.end();
  }
}

bootstrap().catch((error) => {
  console.error('Falha no script:', error instanceof Error ? error.message : error);
  process.exit(1);
});

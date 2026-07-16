import 'dotenv/config';
import axios, { AxiosInstance } from 'axios';
import { IngestOrderDto } from '../public-api/orders/application/dto/ingest-order.dto';
import {
  isLaundryKitOperationEligible,
  LaundryKitOperation,
  LaundryKitOperationsResponse,
  mapLaundryKitOperationToIngestDto,
} from './laundrykit/laundrykit-operation.mapper';
import { fetchLaundrykitClientCatalog } from './laundrykit/laundrykit-client-catalog';
import { postLaundrykitRoute } from './laundrykit/laundrykit-api.client';

/**
 * Importa histórico de operações LaundryKit para a API pública FoodCRM.
 *
 * Estratégia:
 *  1. Busca todos os clientes da loja (LKO_STORE_CLIENTS_LIST)
 *  2. Itera dia a dia no período informado
 *  3. Consulta LKO_OPERATIONS com TIMESTAMP_START/TIMESTAMP_LAST do dia
 *  4. Enriquece cliente da operação via catálogo (telefone, CPF, e-mail)
 *  5. Envia uma a uma para POST /v1/orders (fila da API aberta)
 *
 * Uso:
 *   npm run script:import-laundrykit-history -- \
 *     --start-date=2026-06-01 \
 *     --end-date=2026-06-30 \
 *     --access-token=<token-bearer> \
 *     --store-id=STORE_ID_189 \
 *     --api-key=<chave-da-loja>
 *
 * Nota: passe só o JWT em --access-token (sem prefixo "Bearer").
 */

const DEFAULT_FOODCRM_BASE_URL = 'https://integracao.foodcrm.com.br';
const DEFAULT_LAUNDRYKIT_URL =
  'https://laundrykit-front-dash.com/prod/manager/v7/route';

interface CliArgs {
  startDate: string;
  endDate: string;
  accessToken: string;
  storeId: string;
  apiKey: string;
  foodcrmBaseUrl: string;
  laundrykitUrl: string;
  dryRun: boolean;
  delayMs: number;
  fetchDelayMs: number;
  fetchRetries: number;
  resumeFromDate?: string;
}

interface ImportStats {
  daysTotal: number;
  daysProcessed: number;
  daysFailed: number;
  clientsLoaded: number;
  operationsFetched: number;
  operationsEligible: number;
  operationsEnriched: number;
  operationsSent: number;
  operationsQueued: number;
  operationsAlreadyReceived: number;
  operationsSkipped: number;
  errors: number;
  failedDates: string[];
}

function normalizeAccessToken(rawToken: string): string {
  return rawToken.trim().replace(/^Bearer\s+/i, '');
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const map: Record<string, string | boolean> = {};

  for (const arg of args) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...rest] = arg.slice(2).split('=');
    map[rawKey] = rest.length > 0 ? rest.join('=') : true;
  }

  const startDate = (map['start-date'] as string) ?? '';
  const endDate = (map['end-date'] as string) ?? '';
  const accessToken =
    (map['access-token'] as string) ??
    (map['laundrykit-token'] as string) ??
    process.env.LAUNDRYKIT_ACCESS_TOKEN ??
    '';
  const storeId =
    (map['store-id'] as string) ?? process.env.LAUNDRYKIT_STORE_ID ?? '';
  const apiKey = (map['api-key'] as string) ?? process.env.FOODCRM_API_KEY ?? '';
  const foodcrmBaseUrl =
    (map['foodcrm-base-url'] as string) ??
    process.env.FOODCRM_BASE_URL ??
    DEFAULT_FOODCRM_BASE_URL;
  const laundrykitUrl =
    (map['laundrykit-url'] as string) ??
    process.env.LAUNDRYKIT_API_URL ??
    DEFAULT_LAUNDRYKIT_URL;
  const dryRun = map['dry-run'] === true;
  const delayMs = Number(map['delay-ms'] ?? 200);
  const fetchDelayMs = Number(map['fetch-delay-ms'] ?? 500);
  const fetchRetries = Number(map['fetch-retries'] ?? 3);
  const resumeFromDate = (map['resume-from-date'] as string) || undefined;

  if (!startDate || !endDate) {
    throw new Error('Informe --start-date=YYYY-MM-DD e --end-date=YYYY-MM-DD');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error('Datas devem estar no formato YYYY-MM-DD');
  }
  if (startDate > endDate) {
    throw new Error('A data inicial deve ser anterior ou igual à data final');
  }
  if (!accessToken) {
    throw new Error(
      'Informe --access-token=<token> ou a variável LAUNDRYKIT_ACCESS_TOKEN',
    );
  }
  if (!storeId) {
    throw new Error('Informe --store-id=<id> ou a variável LAUNDRYKIT_STORE_ID');
  }
  if (!apiKey) {
    throw new Error('Informe --api-key=<chave> ou a variável FOODCRM_API_KEY');
  }
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error('--delay-ms deve ser um número >= 0');
  }
  if (!Number.isFinite(fetchDelayMs) || fetchDelayMs < 0) {
    throw new Error('--fetch-delay-ms deve ser um número >= 0');
  }
  if (!Number.isFinite(fetchRetries) || fetchRetries < 1 || fetchRetries > 10) {
    throw new Error('--fetch-retries deve ser um número entre 1 e 10');
  }
  if (resumeFromDate && !/^\d{4}-\d{2}-\d{2}$/.test(resumeFromDate)) {
    throw new Error('--resume-from-date deve estar no formato YYYY-MM-DD');
  }

  return {
    startDate,
    endDate,
    accessToken: normalizeAccessToken(accessToken),
    storeId,
    apiKey,
    foodcrmBaseUrl: foodcrmBaseUrl.replace(/\/$/, ''),
    laundrykitUrl,
    dryRun,
    delayMs,
    fetchDelayMs,
    fetchRetries,
    resumeFromDate,
  };
}

/** Meia-noite BRT (UTC-3) → timestamp em ms. */
function dayStartTimestampMs(dateOnly: string): number {
  return new Date(`${dateOnly}T03:00:00.000Z`).getTime();
}

/** Fim do dia BRT (UTC-3) → timestamp em ms. */
function dayEndTimestampMs(dateOnly: string): number {
  const end = new Date(`${dateOnly}T03:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);
  return end.getTime();
}

function listDatesInclusive(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00.000Z`);

  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    dates.push(iso);
    if (iso >= endDate) break;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function createFoodcrmClient(args: CliArgs): AxiosInstance {
  return axios.create({
    baseURL: args.foodcrmBaseUrl,
    timeout: 60_000,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': args.apiKey,
    },
  });
}

function formatAxiosError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return String(error);
  }

  const status = error.response?.status;
  const statusText = error.response?.statusText;
  const body = error.response?.data ?? error.message;
  const statusLabel = status ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}` : 'sem status HTTP';

  return `${statusLabel}: ${JSON.stringify(body)}`;
}

async function fetchOperationsForDay(
  args: CliArgs,
  dateOnly: string,
): Promise<LaundryKitOperation[]> {
  const timestampStart = dayStartTimestampMs(dateOnly);
  const timestampLast = dayEndTimestampMs(dateOnly);

  const response = await postLaundrykitRoute<LaundryKitOperationsResponse>(
    {
      laundrykitUrl: args.laundrykitUrl,
      accessToken: args.accessToken,
      storeId: args.storeId,
      fetchRetries: args.fetchRetries,
    },
    {
      FUNCTION: 'LKO_OPERATIONS',
      DATA: {
        STORE_ID: args.storeId,
        TIMESTAMP_START: timestampStart,
        TIMESTAMP_LAST: timestampLast,
      },
    },
  );

  return response.operations ?? [];
}

async function ingestOrder(
  foodcrmClient: AxiosInstance,
  payload: IngestOrderDto,
  dryRun: boolean,
): Promise<'queued' | 'already_received' | 'skipped' | 'error'> {
  if (!payload.customer.phone && !payload.customer.cpf) {
    return 'skipped';
  }

  if (dryRun) {
    return 'queued';
  }

  try {
    const response = await foodcrmClient.post('/v1/orders', payload);
    if (response.status === 202) return 'queued';
    if (response.status === 200 && response.data?.status === 'already_received') {
      return 'already_received';
    }
    return 'queued';
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? JSON.stringify(error.response?.data ?? error.message)
      : String(error);
    console.error(
      `      ❌ Erro ao enviar operação ${payload.externalOrderId}: ${message}`,
    );
    return 'error';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run(): Promise<void> {
  const args = parseArgs();
  let dates = listDatesInclusive(args.startDate, args.endDate);

  if (args.resumeFromDate) {
    dates = dates.filter((date) => date >= args.resumeFromDate!);
    console.log(`   Retomando a partir de ${args.resumeFromDate}`);
  }

  const foodcrmClient = createFoodcrmClient(args);

  console.log('\n👥 Buscando catálogo de clientes da loja...');
  let clientCatalog;
  try {
    clientCatalog = await fetchLaundrykitClientCatalog({
      laundrykitUrl: args.laundrykitUrl,
      accessToken: args.accessToken,
      storeId: args.storeId,
      fetchRetries: args.fetchRetries,
    });
  } catch (error) {
    throw new Error(
      `Falha ao buscar clientes LaundryKit: ${formatAxiosError(error)}`,
    );
  }

  const stats: ImportStats = {
    daysTotal: dates.length,
    daysProcessed: 0,
    daysFailed: 0,
    clientsLoaded: clientCatalog.size,
    operationsFetched: 0,
    operationsEligible: 0,
    operationsEnriched: 0,
    operationsSent: 0,
    operationsQueued: 0,
    operationsAlreadyReceived: 0,
    operationsSkipped: 0,
    errors: 0,
    failedDates: [],
  };

  console.log('🚀 Importação histórica LaundryKit → FoodCRM');
  console.log(`   Período: ${args.startDate} até ${args.endDate} (${dates.length} dia(s))`);
  console.log(`   Loja LaundryKit: ${args.storeId}`);
  console.log(`   Origem: ${args.laundrykitUrl}`);
  console.log(`   Destino: ${args.foodcrmBaseUrl}/v1/orders`);
  console.log(`   Delay entre envios: ${args.delayMs}ms`);
  console.log(`   Delay entre dias: ${args.fetchDelayMs}ms`);
  console.log(`   Retentativas por dia: ${args.fetchRetries}`);
  console.log(`   Clientes carregados: ${stats.clientsLoaded}`);
  if (args.dryRun) {
    console.log('   Modo dry-run: nenhuma operação será enviada');
  }

  for (const dateOnly of dates) {
    stats.daysProcessed += 1;
    const timestampStart = dayStartTimestampMs(dateOnly);
    const timestampLast = dayEndTimestampMs(dateOnly);

    console.log(
      `\n📅 [${stats.daysProcessed}/${stats.daysTotal}] ${dateOnly} (${timestampStart} → ${timestampLast})`,
    );

    let operations: LaundryKitOperation[];
    try {
      operations = await fetchOperationsForDay(args, dateOnly);
    } catch (error) {
      console.error(`   ❌ Falha ao buscar operações: ${formatAxiosError(error)}`);
      stats.errors += 1;
      stats.daysFailed += 1;
      stats.failedDates.push(dateOnly);
      if (args.fetchDelayMs > 0) {
        await sleep(args.fetchDelayMs);
      }
      continue;
    }

    stats.operationsFetched += operations.length;
    console.log(`   ${operations.length} operação(ões) retornada(s)`);

    const eligible = operations.filter(isLaundryKitOperationEligible);
    stats.operationsSkipped += operations.length - eligible.length;
    stats.operationsEligible += eligible.length;

    if (eligible.length === 0) {
      console.log('   Nenhuma operação elegível (pagamento confirmado)');
      continue;
    }

    let dayQueued = 0;
    let dayAlready = 0;
    let daySkipped = 0;
    let dayErrors = 0;

    for (const [index, operation] of eligible.entries()) {
      const enriched = clientCatalog.resolveCustomer(operation);
      if (enriched.phone) {
        stats.operationsEnriched += 1;
      }

      const payload = mapLaundryKitOperationToIngestDto(operation, clientCatalog);
      const result = await ingestOrder(foodcrmClient, payload, args.dryRun);

      stats.operationsSent += 1;
      if (result === 'queued') {
        stats.operationsQueued += 1;
        dayQueued += 1;
      } else if (result === 'already_received') {
        stats.operationsAlreadyReceived += 1;
        dayAlready += 1;
      } else if (result === 'skipped') {
        stats.operationsSkipped += 1;
        daySkipped += 1;
      } else if (result === 'error') {
        stats.errors += 1;
        dayErrors += 1;
      }

      const progress = `[${index + 1}/${eligible.length}]`;
      if (result === 'queued' || result === 'already_received') {
        console.log(
          `   ${progress} ${operation.OP_ID} → ${result === 'queued' ? 'enfileirado' : 'já recebido'}`,
        );
      }

      if (args.delayMs > 0 && index < eligible.length - 1) {
        await sleep(args.delayMs);
      }
    }

    console.log(
      `   Dia concluído: ${dayQueued} enfileirados, ${dayAlready} já recebidos, ${daySkipped} ignorados, ${dayErrors} erros`,
    );

    if (args.fetchDelayMs > 0 && stats.daysProcessed < stats.daysTotal) {
      await sleep(args.fetchDelayMs);
    }
  }

  console.log('\n============================================================');
  console.log('📈 RESUMO DA IMPORTAÇÃO');
  console.log('============================================================');
  console.log(`Dias no período:            ${stats.daysTotal}`);
  console.log(`Dias processados:           ${stats.daysProcessed}`);
  console.log(`Dias com falha na consulta: ${stats.daysFailed}`);
  console.log(`Clientes carregados:        ${stats.clientsLoaded}`);
  console.log(`Operações buscadas:         ${stats.operationsFetched}`);
  console.log(`Operações elegíveis:        ${stats.operationsEligible}`);
  console.log(`Operações com telefone:     ${stats.operationsEnriched}`);
  console.log(`Operações processadas:      ${stats.operationsSent}`);
  console.log(`Enfileirados (202):         ${stats.operationsQueued}`);
  console.log(`Já recebidos (200):         ${stats.operationsAlreadyReceived}`);
  console.log(`Ignorados:                  ${stats.operationsSkipped}`);
  console.log(`Erros:                      ${stats.errors}`);
  if (stats.failedDates.length > 0) {
    console.log(`Datas com falha:            ${stats.failedDates.slice(0, 10).join(', ')}${stats.failedDates.length > 10 ? '...' : ''}`);
    console.log(`Retome com: --resume-from-date=${stats.failedDates[0]}`);
  }
  console.log('============================================================');

  if (stats.errors > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('Erro fatal:', error instanceof Error ? error.message : error);
  process.exit(1);
});

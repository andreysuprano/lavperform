import type { ImportStats, LaundrykitImportConfig } from '@shared/types'
import { createEmptyStats } from '@shared/types'
import {
  createPublicApiClient,
  formatAxiosError,
  ingestOrder,
} from '../clients/public-api.client'
import { postLaundrykitRoute } from '../clients/laundrykit.client'
import {
  fetchLaundrykitClientCatalog,
  LaundryKitClientCatalog,
} from '../mappers/laundrykit-client-catalog'
import {
  groupLaundryKitOperations,
  isLaundryKitOperationEligible,
  LaundryKitOperation,
  LaundryKitOperationsResponse,
  mapLaundryKitGroupToIngestDto,
} from '../mappers/laundrykit-to-ingest'
import {
  dayEndTimestampMs,
  dayStartTimestampMs,
  listDatesInclusive,
  sleep,
} from '../util/dates'
import type { ImporterContext } from './types'

async function fetchOperationsForDay(
  config: LaundrykitImportConfig,
  dateOnly: string,
  ctx: ImporterContext,
): Promise<LaundryKitOperation[]> {
  const response = await postLaundrykitRoute<LaundryKitOperationsResponse>(
    {
      laundrykitUrl: config.laundrykitUrl,
      accessToken: config.laundrykitAccessToken,
      storeId: config.laundrykitStoreId,
      fetchRetries: config.fetchRetries,
      onRetry: (message) => ctx.log('warn', message),
    },
    {
      FUNCTION: 'LKO_OPERATIONS',
      DATA: {
        STORE_ID: config.laundrykitStoreId,
        TIMESTAMP_START: dayStartTimestampMs(dateOnly),
        TIMESTAMP_LAST: dayEndTimestampMs(dateOnly),
      },
    },
  )

  return response.operations ?? []
}

export async function runLaundrykitImport(
  config: LaundrykitImportConfig,
  ctx: ImporterContext,
): Promise<ImportStats> {
  const stats = createEmptyStats()
  const dates = listDatesInclusive(config.startDate, config.endDate)
  stats.daysTotal = dates.length

  const publicApiClient = createPublicApiClient(config.publicApiUrl, config.apiKey)

  ctx.log('info', 'Buscando catálogo de clientes da loja Laundry Kit...')
  let catalog: LaundryKitClientCatalog
  try {
    catalog = await fetchLaundrykitClientCatalog({
      laundrykitUrl: config.laundrykitUrl,
      accessToken: config.laundrykitAccessToken,
      storeId: config.laundrykitStoreId,
      fetchRetries: config.fetchRetries,
      onRetry: (message) => ctx.log('warn', message),
    })
  } catch (error) {
    throw new Error(
      `Falha ao buscar clientes Laundry Kit: ${formatAxiosError(error)}`,
    )
  }

  stats.clientsLoaded = catalog.size
  ctx.log('success', `${stats.clientsLoaded} cliente(s) carregado(s) do catálogo`)
  ctx.progress({ ...stats })

  for (const dateOnly of dates) {
    if (ctx.isCancelled()) {
      ctx.log('warn', 'Importação cancelada pelo usuário.')
      break
    }

    stats.daysProcessed += 1
    ctx.log('info', `[${stats.daysProcessed}/${stats.daysTotal}] Dia ${dateOnly}`)

    let operations: LaundryKitOperation[]
    try {
      operations = await fetchOperationsForDay(config, dateOnly, ctx)
    } catch (error) {
      ctx.log('error', `Falha ao buscar operações de ${dateOnly}: ${formatAxiosError(error)}`)
      stats.errors += 1
      stats.daysFailed += 1
      ctx.progress({ ...stats })
      if (config.dayDelayMs > 0) await sleep(config.dayDelayMs)
      continue
    }

    stats.ordersFetched += operations.length

    const eligible = operations.filter(isLaundryKitOperationEligible)
    stats.skipped += operations.length - eligible.length
    const groups = groupLaundryKitOperations(eligible)
    stats.ordersEligible += groups.length

    ctx.log(
      'info',
      `${operations.length} operação(ões), ${eligible.length} elegível(is), ${groups.length} venda(s)`,
    )
    ctx.progress({ ...stats })

    for (let index = 0; index < groups.length; index++) {
      if (ctx.isCancelled()) {
        ctx.log('warn', 'Importação cancelada pelo usuário.')
        return stats
      }

      const group = groups[index]
      const payload = mapLaundryKitGroupToIngestDto(group, catalog)
      const outcome = await ingestOrder(publicApiClient, payload, config.dryRun)

      stats.ordersSent += 1
      if (outcome.result === 'queued') {
        stats.queued += 1
      } else if (outcome.result === 'already_received') {
        stats.alreadyReceived += 1
      } else if (outcome.result === 'skipped') {
        stats.skipped += 1
      } else if (outcome.result === 'error') {
        stats.errors += 1
        ctx.log(
          'error',
          `Erro ao enviar ${payload.externalOrderId}: ${outcome.message ?? 'desconhecido'}`,
        )
      }

      ctx.progress({ ...stats })

      if (config.sendDelayMs > 0 && index < groups.length - 1) {
        await sleep(config.sendDelayMs)
      }
    }

    if (config.dayDelayMs > 0 && stats.daysProcessed < stats.daysTotal) {
      await sleep(config.dayDelayMs)
    }
  }

  return stats
}

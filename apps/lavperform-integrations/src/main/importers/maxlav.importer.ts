import type { ImportStats, MaxlavImportConfig } from '@shared/types'
import { createEmptyStats } from '@shared/types'
import {
  clearMaxlavClientCache,
  getMaxlavSalesInRange,
  groupOrdersByBrtDate,
  type MaxlavOrder,
} from '../clients/maxlav.client'
import {
  createPublicApiClient,
  ingestOrder,
} from '../clients/public-api.client'
import { mapMaxlavOrderToIngestDto } from '../mappers/maxlav-to-ingest'
import { listDatesInclusive, sleep } from '../util/dates'
import type { ImporterContext } from './types'

export async function runMaxlavImport(
  config: MaxlavImportConfig,
  ctx: ImporterContext,
): Promise<ImportStats> {
  const stats = createEmptyStats()
  const dates = listDatesInclusive(config.startDate, config.endDate)
  stats.daysTotal = dates.length

  const publicApiClient = createPublicApiClient(config.publicApiUrl, config.apiKey)
  const clientArgs = {
    apiUrl: config.maxlavApiUrl,
    apiToken: config.maxlavApiToken,
    fetchRetries: config.fetchRetries,
    onRetry: (message: string) => ctx.log('warn', message),
    onInfo: (message: string) => ctx.log('info', message),
  }

  ctx.progress({ ...stats })
  clearMaxlavClientCache()

  let ordersByDay: Map<string, MaxlavOrder[]>
  try {
    const allOrders = await getMaxlavSalesInRange(
      clientArgs,
      config.startDate,
      config.endDate,
    )
    ordersByDay = groupOrdersByBrtDate(allOrders)
  } catch (error) {
    ctx.log(
      'error',
      `Falha ao buscar pedidos de ${config.startDate} a ${config.endDate}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
    stats.errors += 1
    stats.daysFailed = dates.length
    ctx.progress({ ...stats })
    return stats
  }

  for (const dateOnly of dates) {
    if (ctx.isCancelled()) {
      ctx.log('warn', 'Importação cancelada pelo usuário.')
      break
    }

    stats.daysProcessed += 1
    ctx.log('info', `[${stats.daysProcessed}/${stats.daysTotal}] Dia ${dateOnly}`)

    const orders = ordersByDay.get(dateOnly) ?? []

    stats.ordersFetched += orders.length
    stats.ordersEligible += orders.length
    ctx.log('info', `${orders.length} pedido(s) retornado(s)`)
    ctx.progress({ ...stats })

    for (let index = 0; index < orders.length; index++) {
      if (ctx.isCancelled()) {
        ctx.log('warn', 'Importação cancelada pelo usuário.')
        return stats
      }

      const order = orders[index]
      const payload = mapMaxlavOrderToIngestDto(order)
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
          `Erro ao enviar ${order.id}: ${outcome.message ?? 'desconhecido'}`,
        )
      }

      ctx.progress({ ...stats })

      if (config.sendDelayMs > 0 && index < orders.length - 1) {
        await sleep(config.sendDelayMs)
      }
    }

    if (config.dayDelayMs > 0 && stats.daysProcessed < stats.daysTotal) {
      await sleep(config.dayDelayMs)
    }
  }

  return stats
}

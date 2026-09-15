import type { ImportStats, SislavImportConfig } from '@shared/types'
import { createEmptyStats } from '@shared/types'
import {
  getSislavDailySales,
  type SislavSale,
} from '../clients/sislav.client'
import {
  createPublicApiClient,
  ingestOrder,
} from '../clients/public-api.client'
import {
  isSislavSaleEligible,
  mapSislavSaleToIngestDto,
} from '../mappers/sislav-to-ingest'
import { listDatesInclusive, sleep } from '../util/dates'
import type { ImporterContext } from './types'

export async function runSislavImport(
  config: SislavImportConfig,
  ctx: ImporterContext,
): Promise<ImportStats> {
  const stats = createEmptyStats()
  const dates = listDatesInclusive(config.startDate, config.endDate)
  stats.daysTotal = dates.length

  const publicApiClient = createPublicApiClient(config.publicApiUrl, config.apiKey)
  const clientArgs = {
    apiUrl: config.sislavApiUrl,
    sessionToken: config.sislavSessionToken,
    organizationId: config.sislavOrganizationId,
    laundryId: config.sislavLaundryId,
    fetchRetries: config.fetchRetries,
    onRetry: (message: string) => ctx.log('warn', message),
  }

  ctx.progress({ ...stats })

  for (const dateOnly of dates) {
    if (ctx.isCancelled()) {
      ctx.log('warn', 'Importação cancelada pelo usuário.')
      break
    }

    stats.daysProcessed += 1
    ctx.log('info', `[${stats.daysProcessed}/${stats.daysTotal}] Dia ${dateOnly}`)

    let sales: SislavSale[]
    try {
      sales = await getSislavDailySales(clientArgs, dateOnly)
    } catch (error) {
      ctx.log(
        'error',
        `Falha ao buscar vendas de ${dateOnly}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      stats.errors += 1
      stats.daysFailed += 1
      ctx.progress({ ...stats })
      if (config.dayDelayMs > 0) await sleep(config.dayDelayMs)
      continue
    }

    stats.ordersFetched += sales.length

    const eligible = sales.filter(isSislavSaleEligible)
    stats.skipped += sales.length - eligible.length
    stats.ordersEligible += eligible.length

    ctx.log(
      'info',
      `${sales.length} venda(s), ${eligible.length} elegível(is)`,
    )
    ctx.progress({ ...stats })

    for (let index = 0; index < eligible.length; index++) {
      if (ctx.isCancelled()) {
        ctx.log('warn', 'Importação cancelada pelo usuário.')
        return stats
      }

      const sale = eligible[index]
      const payload = mapSislavSaleToIngestDto(sale)
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
          `Erro ao enviar ${sale.id}: ${outcome.message ?? 'desconhecido'}`,
        )
      }

      ctx.progress({ ...stats })

      if (config.sendDelayMs > 0 && index < eligible.length - 1) {
        await sleep(config.sendDelayMs)
      }
    }

    if (config.dayDelayMs > 0 && stats.daysProcessed < stats.daysTotal) {
      await sleep(config.dayDelayMs)
    }
  }

  return stats
}

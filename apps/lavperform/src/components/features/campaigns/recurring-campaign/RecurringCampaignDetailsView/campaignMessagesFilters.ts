import type { DateRangeValue } from '@/components'
import type {
  RecurringCampaignMessagesQuery,
  RecurringCampaignMessageStatus,
  RfvClassificationSnake,
} from '@/types'
import { ClientTypes } from '@/utils/constants/clientType'

/**
 * Estado de filtros aplicado à tela de mensagens da campanha automática.
 * - `dateRange` é mantido no formato padrão do DateRangeFilter (preset ou
 *   custom). O preset `days: 1` representa "Hoje"   que é o default e NÃO
 *   envia `startDate`/`endDate` (o backend assume o dia atual).
 */
export interface CampaignMessagesFiltersState {
  dateRange: DateRangeValue
  rfv: RfvClassificationSnake[]
  status: RecurringCampaignMessageStatus[]
}

export const DEFAULT_MESSAGES_RANGE: DateRangeValue = {
  kind: 'preset',
  days: 1,
}

const RFV_VALUES = new Set<RfvClassificationSnake>(
  Object.values(ClientTypes) as RfvClassificationSnake[]
)

const STATUS_VALUES = new Set<RecurringCampaignMessageStatus>([
  'PENDING',
  'SENT',
  'PROCESSING',
  'ERROR',
  'ABORTED',
])

function parseListParam(params: URLSearchParams, key: string): string[] {
  const raw = params.getAll(key)
  const flattened = raw.flatMap((item) => item.split(',').map((s) => s.trim()))
  return flattened.filter(Boolean)
}

function isYMD(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/**
 * Converte uma `URLSearchParams` em um `CampaignMessagesFiltersState`.
 * Regras:
 * - Se `startDate` e `endDate` forem válidos → kind=custom.
 * - Senão, default = preset 1 dia ("Hoje"). O backend assume hoje quando
 *   nenhum dos dois é enviado.
 * - `rfvClassification` e `status` são validados contra o conjunto de
 *   valores conhecidos; valores desconhecidos são descartados silenciosamente.
 */
export function parseMessagesFiltersFromSearch(
  params: URLSearchParams
): CampaignMessagesFiltersState {
  const startDate = params.get('startDate')
  const endDate = params.get('endDate')

  let dateRange: DateRangeValue = DEFAULT_MESSAGES_RANGE
  if (isYMD(startDate) && isYMD(endDate) && startDate <= endDate) {
    dateRange = { kind: 'custom', startDate, endDate }
  }

  const rfv = parseListParam(params, 'rfvClassification').filter((v): v is
    RfvClassificationSnake => RFV_VALUES.has(v as RfvClassificationSnake))

  const status = parseListParam(params, 'status').filter((v): v is
    RecurringCampaignMessageStatus =>
    STATUS_VALUES.has(v as RecurringCampaignMessageStatus))

  return { dateRange, rfv, status }
}

function toYMDLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Converte um `DateRangeValue` em um par `{startDate, endDate}` no formato
 * `YYYY-MM-DD` (horário local) para envio na querystring.
 * - `preset.days === 1` ("Hoje") retorna `undefined` para que o backend
 *   use o default (dia atual em UTC).
 * - Demais presets viram `endDate = hoje` e `startDate = hoje - (days-1)`.
 * - Custom envia as datas exatas escolhidas.
 */
export function dateRangeToMessagesDates(
  value: DateRangeValue
): { startDate: string; endDate: string } | undefined {
  if (value.kind === 'custom') {
    return { startDate: value.startDate, endDate: value.endDate }
  }
  if (value.days === 1) return undefined

  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - (value.days - 1))
  return { startDate: toYMDLocal(start), endDate: toYMDLocal(end) }
}

/**
 * Constrói o objeto de query a ser enviado para `getCampaignMessages`.
 * Arrays vazios são omitidos e o par de datas só vai junto.
 */
export function filtersToMessagesQuery(
  filters: CampaignMessagesFiltersState
): RecurringCampaignMessagesQuery | undefined {
  const dates = dateRangeToMessagesDates(filters.dateRange)
  const query: RecurringCampaignMessagesQuery = {}
  if (dates) {
    query.startDate = dates.startDate
    query.endDate = dates.endDate
  }
  if (filters.rfv.length) query.rfvClassification = filters.rfv
  if (filters.status.length) query.status = filters.status

  return Object.keys(query).length ? query : undefined
}

/**
 * Escreve o estado de filtros em `URLSearchParams` respeitando as regras da
 * rota: `Hoje` + sem RFV + sem status ⇒ URL limpa. Presets 7/14/30 viram
 * `startDate`/`endDate` concretos (o backend só entende esse par).
 */
export function writeMessagesFiltersToSearch(
  prev: URLSearchParams,
  filters: CampaignMessagesFiltersState
): URLSearchParams {
  const sp = new URLSearchParams(prev)
  sp.delete('startDate')
  sp.delete('endDate')
  sp.delete('rfvClassification')
  sp.delete('status')

  const dates = dateRangeToMessagesDates(filters.dateRange)
  if (dates) {
    sp.set('startDate', dates.startDate)
    sp.set('endDate', dates.endDate)
  }
  for (const rfv of filters.rfv) sp.append('rfvClassification', rfv)
  for (const status of filters.status) sp.append('status', status)

  return sp
}

export function isDefaultMessagesFilters(
  filters: CampaignMessagesFiltersState
): boolean {
  return (
    filters.dateRange.kind === 'preset' &&
    filters.dateRange.days === 1 &&
    filters.rfv.length === 0 &&
    filters.status.length === 0
  )
}

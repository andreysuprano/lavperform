import axios from 'axios'

export interface MaxlavMachineInfo {
  machineCode: string
  type: 'washer' | 'dryer' | string
  price: number
  _id?: string
}

export interface MaxlavMachine {
  machineCode: string
  type: 'washer' | 'dryer' | string
  price: number
  store: string
  isActive: boolean
  state: string
  id: string
}

export interface MaxlavStore {
  id: string
  fullName: string
  nickName: string
  cnpj: string
  franchise: string
  isActive: boolean
  address?: string
  cityState?: string
}

export interface MaxlavCustomer {
  id: string
  fullName: string
  email: string | null
  cellphone: string | null
  documentId: string | null
  createdAt: string | null
  lastPurchaseDt: string | null
  isActive?: boolean
}

export interface MaxlavCustomerStore {
  totalPurchases: number
  totalAmount: number
  totalAmountPay: number
  totalVisits: number
  lastPurchaseDt: string | null
}

export interface MaxlavOrder {
  id: string
  createdAt: string
  updatedAt: string
  amount: number
  amountPay: number
  paymentType: string
  cardBrand: string | null
  paymentReceiptCode: string | null
  rechargeType: string
  isActive: boolean
  isVoucherUsed: boolean
  isBalancePurchase: boolean
  customer: MaxlavCustomer
  store: MaxlavStore
  machines: MaxlavMachine[]
  machinesInfo: MaxlavMachineInfo[]
  franchise: string
  customerStore?: MaxlavCustomerStore
  receiptSentByEmail?: string | null
}

export interface MaxlavOrdersResponse {
  results: MaxlavOrder[]
}

export interface MaxlavClientArgs {
  apiUrl: string
  apiToken: string
  fetchRetries: number
  onRetry?: (message: string) => void
  onInfo?: (message: string) => void
}

const INTER_REQUEST_DELAY_MS = 2000

export type MaxlavPeriodPreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'

export type MaxlavOrdersQuery =
  | { page: number; limit?: number; period: MaxlavPeriodPreset }
  | {
      page: number
      limit?: number
      period: 'custom'
      startDate: string
      endDate: string
    }

function addCalendarDays(dateOnly: string, days: number): string {
  const cursor = new Date(`${dateOnly}T12:00:00.000Z`)
  cursor.setUTCDate(cursor.getUTCDate() + days)
  return cursor.toISOString().slice(0, 10)
}

function toMaxlavDayStart(date: string): string {
  return `${date}T03:00:00.000Z`
}

/** Fim do dia civil BRT (23:59:59.999 UTC-3). */
function toMaxlavDayEnd(date: string): string {
  return `${addCalendarDays(date, 1)}T02:59:59.999Z`
}

function brtToday(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function brtDateOf(createdAt: string): string {
  return new Date(new Date(createdAt).getTime() - 3 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

export function isWithinLast7BrtDays(date: string): boolean {
  const today = brtToday()
  const start = addCalendarDays(today, -6)
  return date >= start && date <= today
}

export function isWithinLast30BrtDays(date: string): boolean {
  const today = brtToday()
  const start = addCalendarDays(today, -29)
  return date >= start && date <= today
}

/** Pedido cai no dia civil BRT (meia-noite a meia-noite, UTC-3). */
export function orderCreatedOnBrtDate(
  createdAt: string,
  dateOnly: string,
): boolean {
  return brtDateOf(createdAt) === dateOnly
}

export function groupOrdersByBrtDate<T extends { createdAt: string }>(
  orders: T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const order of orders) {
    const day = brtDateOf(order.createdAt)
    const bucket = grouped.get(day)
    if (bucket) bucket.push(order)
    else grouped.set(day, [order])
  }
  return grouped
}

export function buildMaxlavOrdersParams(
  args: MaxlavOrdersQuery,
): Record<string, string | number | boolean> {
  const limit = args.limit ?? 100
  if (args.period !== 'custom') {
    return {
      page: args.page,
      limit,
      period: args.period,
      mask: true,
      showName: true,
    }
  }

  return {
    page: args.page,
    limit,
    period: 'custom',
    beginDate: toMaxlavDayStart(args.startDate),
    endDate: toMaxlavDayEnd(args.endDate),
    mask: true,
    showName: true,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseRetryAfterMs(retryAfterHeader?: string): number {
  const defaultWait = 60_000
  if (!retryAfterHeader) return defaultWait

  const seconds = Number(retryAfterHeader)
  if (!Number.isNaN(seconds) && seconds > 0) return seconds * 1000

  const date = new Date(retryAfterHeader)
  if (!Number.isNaN(date.getTime())) {
    const wait = date.getTime() - Date.now()
    return wait > 0 ? wait : defaultWait
  }

  return defaultWait
}

export async function getMaxlavOrdersPage(
  args: MaxlavClientArgs,
  params: ReturnType<typeof buildMaxlavOrdersParams>,
): Promise<MaxlavOrder[]> {
  const maxRetries = Math.max(1, args.fetchRetries)
  const page = Number(params.page)

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const response = await axios.get<MaxlavOrdersResponse>(
        `${args.apiUrl.replace(/\/$/, '')}/v1/orders`,
        {
          timeout: 120_000,
          params,
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${args.apiToken}`,
          },
          validateStatus: (status) => status >= 200 && status < 300,
        },
      )
      return response.data?.results ?? []
    } catch (error) {
      const status: number | undefined = axios.isAxiosError(error)
        ? error.response?.status
        : undefined

      if (status === 429 && attempt <= maxRetries) {
        const retryAfterMs = parseRetryAfterMs(
          axios.isAxiosError(error)
            ? (error.response?.headers?.['retry-after'] as string | undefined)
            : undefined,
        )
        args.onRetry?.(
          `HTTP 429 da API MaxLav. Aguardando ${Math.ceil(
            retryAfterMs / 1000,
          )}s antes da tentativa ${attempt + 1}/${maxRetries + 1}...`,
        )
        await sleep(retryAfterMs)
        continue
      }

      if (status === 401) {
        throw new Error(
          'HTTP 401 da API MaxLav: token expirado ou inválido. Verifique o token informado.',
        )
      }

      const message = axios.isAxiosError(error)
        ? `HTTP ${status ?? '?'}: ${JSON.stringify(
            error.response?.data ?? error.message,
          )}`
        : String(error)
      throw new Error(
        `Não foi possível buscar pedidos MaxLav (página ${page}): ${message}`,
      )
    }
  }

  throw new Error(
    'Não foi possível buscar pedidos MaxLav: limite de tentativas esgotado',
  )
}

function withPage(query: MaxlavOrdersQuery, page: number, limit: number): MaxlavOrdersQuery {
  return { ...query, page, limit }
}

async function paginateOrders(
  args: MaxlavClientArgs,
  query: MaxlavOrdersQuery,
): Promise<MaxlavOrder[]> {
  const pageSize = query.limit ?? 100
  const allOrders: MaxlavOrder[] = []
  let page = 1

  while (true) {
    if (page > 1) {
      await sleep(INTER_REQUEST_DELAY_MS)
    }

    const orders = await getMaxlavOrdersPage(
      args,
      buildMaxlavOrdersParams(withPage(query, page, pageSize)),
    )

    if (!orders.length) break

    allOrders.push(...orders)
    if (orders.length < pageSize) break
    page++
  }

  return allOrders
}

let rangeCache: { key: string; orders: MaxlavOrder[] } | null = null

function clientCacheKey(args: MaxlavClientArgs): string {
  return `${args.apiUrl}\0${args.apiToken}`
}

export function clearMaxlavClientCache(): void {
  rangeCache = null
}

function mergeOrders(target: Map<string, MaxlavOrder>, incoming: MaxlavOrder[]) {
  for (const order of incoming) {
    if (order.id) target.set(order.id, order)
  }
}

function orderInBrtRange(
  createdAt: string,
  startDate: string,
  endDate: string,
): boolean {
  const day = brtDateOf(createdAt)
  return day >= startDate && day <= endDate
}

export function listMonthWindows(
  startDate: string,
  endDate: string,
): { startDate: string; endDate: string }[] {
  const windows: { startDate: string; endDate: string }[] = []
  let cursor = `${startDate.slice(0, 7)}-01`

  while (cursor <= endDate) {
    const year = Number(cursor.slice(0, 4))
    const month = Number(cursor.slice(5, 7))
    const nextMonth =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastOfMonth = addCalendarDays(nextMonth, -1)
    windows.push({
      startDate: cursor < startDate ? startDate : cursor,
      endDate: lastOfMonth > endDate ? endDate : lastOfMonth,
    })
    cursor = nextMonth
  }

  return windows
}

/** Busca todos os pedidos do intervalo (custom + presets que se sobrepõem). */
export async function getMaxlavSalesInRange(
  args: MaxlavClientArgs,
  startDate: string,
  endDate: string,
): Promise<MaxlavOrder[]> {
  const key = `${clientCacheKey(args)}\0${startDate}\0${endDate}`
  if (rangeCache?.key === key) {
    return rangeCache.orders
  }

  const merged = new Map<string, MaxlavOrder>()

  if (isWithinLast30BrtDays(endDate) || isWithinLast30BrtDays(startDate)) {
    args.onInfo?.('Buscando pedidos MaxLav com period=last30days...')
    const last30 = await paginateOrders(args, { page: 1, period: 'last30days' })
    args.onInfo?.(`${last30.length} pedido(s) nos últimos 30 dias`)
    mergeOrders(merged, last30)
  }

  if (isWithinLast7BrtDays(endDate) || isWithinLast7BrtDays(startDate)) {
    args.onInfo?.('Buscando pedidos MaxLav com period=last7days...')
    const last7 = await paginateOrders(args, { page: 1, period: 'last7days' })
    args.onInfo?.(`${last7.length} pedido(s) nos últimos 7 dias`)
    mergeOrders(merged, last7)
  }

  args.onInfo?.(
    `Buscando pedidos MaxLav de ${startDate} a ${endDate} (period=custom)...`,
  )
  const custom = await paginateOrders(args, {
    page: 1,
    period: 'custom',
    startDate,
    endDate,
  })
  args.onInfo?.(`${custom.length} pedido(s) no período personalizado`)
  mergeOrders(merged, custom)

  if (custom.length === 0 && startDate < endDate) {
    args.onInfo?.(
      'Período custom vazio; buscando mês a mês no intervalo solicitado...',
    )
    for (const window of listMonthWindows(startDate, endDate)) {
      const monthly = await paginateOrders(args, {
        page: 1,
        period: 'custom',
        startDate: window.startDate,
        endDate: window.endDate,
      })
      if (monthly.length) {
        args.onInfo?.(
          `${monthly.length} pedido(s) em ${window.startDate}–${window.endDate}`,
        )
      }
      mergeOrders(merged, monthly)
    }
  }

  const orders = [...merged.values()].filter((order) =>
    orderInBrtRange(order.createdAt, startDate, endDate),
  )
  rangeCache = { key, orders }
  args.onInfo?.(`${orders.length} pedido(s) únicos no intervalo solicitado`)
  return orders
}

/** Busca os pedidos de um dia civil BRT. */
export async function getMaxlavDailySales(
  args: MaxlavClientArgs,
  date: string,
): Promise<MaxlavOrder[]> {
  const orders = await getMaxlavSalesInRange(args, date, date)
  return orders.filter((order) => orderCreatedOnBrtDate(order.createdAt, date))
}

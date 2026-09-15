import axios from 'axios'

export interface SislavCustomer {
  name: string | null
  cpf: string | null
  phone: string | null
  email: string | null
  id: string
}

export interface SislavAutomation {
  name: string
  sentAt: string
  tries: number
  confirmed: boolean
}

export interface SislavSale {
  date: string
  cycle: string
  machines: number[] | null
  machinesWithTime: unknown
  laundry: string
  isSislavPay: number
  storeId: string
  id: string
  type: string
  sentAutomations?: SislavAutomation[]
  customer: SislavCustomer | null
  payment: number
  paidAmount: number
  postPaidValue: number
  coupon: unknown
  voucher: unknown
  usedBalance: number
  totalAmount: number
  status: string
  visit: number
  payment_number: number
}

export interface SislavSalesResponse {
  sales: SislavSale[]
  total: number
}

export interface SislavClientArgs {
  apiUrl: string
  sessionToken: string
  organizationId: string
  laundryId: string
  fetchRetries: number
  onRetry?: (message: string) => void
}

const INTER_REQUEST_DELAY_MS = 1000
const PAGE_SIZE = 50

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function normalizeSessionToken(rawToken: string): string {
  const trimmed = rawToken.trim()
  const cookieMatch = trimmed.match(
    /(?:^|;\s*)authjs\.session-token=([^;]+)/i,
  )
  if (cookieMatch?.[1]) {
    return cookieMatch[1].trim()
  }
  return trimmed.replace(/^Bearer\s+/i, '')
}

function buildCookie(sessionToken: string): string {
  return `authjs.session-token=${normalizeSessionToken(sessionToken)}`
}

function buildHeaders(args: SislavClientArgs): Record<string, string> {
  const baseUrl = args.apiUrl.replace(/\/$/, '')
  return {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    Cookie: buildCookie(args.sessionToken),
    Referer: `${baseUrl}/sales`,
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    'x-organization-id': args.organizationId.trim(),
  }
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

function formatAxiosError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return String(error)
  }
  const status = error.response?.status
  const statusText = error.response?.statusText
  const body = error.response?.data ?? error.message
  const statusLabel = status
    ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}`
    : 'sem status HTTP'
  return `${statusLabel}: ${
    typeof body === 'string' ? body : JSON.stringify(body)
  }`
}

export async function getSislavSalesPage(
  args: SislavClientArgs,
  date: string,
  page: number,
  itemsPerPage = PAGE_SIZE,
): Promise<SislavSalesResponse> {
  const maxRetries = Math.max(1, args.fetchRetries)
  const baseUrl = args.apiUrl.replace(/\/$/, '')

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const params = new URLSearchParams()
      params.append('dateRange[]', date)
      params.append('dateRange[]', date)
      params.append('laundryId', args.laundryId.trim())
      params.append('page', String(page))
      params.append('itemsPerPage', String(itemsPerPage))
      params.append('sortField', 'date')
      params.append('sortDirection', 'desc')

      const response = await axios.get<SislavSalesResponse>(
        `${baseUrl}/api/sales?${params.toString()}`,
        {
          timeout: 120_000,
          headers: buildHeaders(args),
          validateStatus: (status) => status >= 200 && status < 300,
        },
      )
      return {
        sales: response.data?.sales ?? [],
        total: response.data?.total ?? 0,
      }
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
          `HTTP 429 da API SisLav. Aguardando ${Math.ceil(
            retryAfterMs / 1000,
          )}s antes da tentativa ${attempt + 1}/${maxRetries + 1}...`,
        )
        await sleep(retryAfterMs)
        continue
      }

      if ((status === 401 || status === 403) && attempt <= maxRetries) {
        args.onRetry?.(
          `HTTP ${status} da API SisLav (sessão). Tentativa ${attempt + 1}/${
            maxRetries + 1
          }...`,
        )
        await sleep(1000 * attempt)
        continue
      }

      if (status === 401 || status === 403) {
        throw new Error(
          `HTTP ${status} da API SisLav: sessão expirada ou inválida. Atualize o session token e o organization ID.`,
        )
      }

      throw new Error(
        `Não foi possível buscar vendas SisLav (página ${page}): ${formatAxiosError(
          error,
        )}`,
      )
    }
  }

  throw new Error(
    'Não foi possível buscar vendas SisLav: limite de tentativas esgotado',
  )
}

/** Busca TODAS as vendas de um dia específico, paginando até esvaziar. */
export async function getSislavDailySales(
  args: SislavClientArgs,
  date: string,
): Promise<SislavSale[]> {
  const allSales: SislavSale[] = []
  let page = 1
  let total = Number.POSITIVE_INFINITY

  while (allSales.length < total) {
    if (page > 1) {
      await sleep(INTER_REQUEST_DELAY_MS)
    }

    const response = await getSislavSalesPage(args, date, page, PAGE_SIZE)
    total = response.total
    const sales = response.sales

    if (!sales.length) break

    allSales.push(...sales)

    if (sales.length < PAGE_SIZE) break
    page++
  }

  return allSales
}

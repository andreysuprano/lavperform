export type IntegrationId = 'maxlav' | 'laundrykit' | 'sislav'

export const DEFAULT_PUBLIC_API_URL = 'https://integracao.lavperform.cloud'
export const DEFAULT_MAXLAV_API_URL = 'https://api-dashboard.maxpan.com.br'
export const DEFAULT_LAUNDRYKIT_URL =
  'https://laundrykit-front-dash.com/prod/manager/v7/route'
export const DEFAULT_SISLAV_API_URL = 'https://app.sislav.com.br'

export interface BaseImportConfig {
  integration: IntegrationId
  /** Chave da API aberta LavPerform (header x-api-key). */
  apiKey: string
  /** URL base da API aberta. */
  publicApiUrl: string
  /** Data inicial YYYY-MM-DD (inclusive). */
  startDate: string
  /** Data final YYYY-MM-DD (inclusive). */
  endDate: string
  /** Simula o envio sem chamar a API aberta. */
  dryRun: boolean
  /** Delay entre envios de pedidos (ms). */
  sendDelayMs: number
  /** Delay entre dias processados (ms). */
  dayDelayMs: number
  /** Retentativas por requisição ao parceiro. */
  fetchRetries: number
}

export interface MaxlavImportConfig extends BaseImportConfig {
  integration: 'maxlav'
  /** Token Bearer da API MaxLav. */
  maxlavApiToken: string
  /** URL base da API MaxLav. */
  maxlavApiUrl: string
}

export interface LaundrykitImportConfig extends BaseImportConfig {
  integration: 'laundrykit'
  /** JWT de acesso ao dashboard Laundry Kit. */
  laundrykitAccessToken: string
  /** ID da loja Laundry Kit. */
  laundrykitStoreId: string
  /** URL do endpoint de rota do Laundry Kit. */
  laundrykitUrl: string
}

export interface SislavImportConfig extends BaseImportConfig {
  integration: 'sislav'
  /** Session token Auth.js (`authjs.session-token`) do dashboard SisLav. */
  sislavSessionToken: string
  /** Header `x-organization-id` da organização SisLav. */
  sislavOrganizationId: string
  /** Query `laundryId` da lavanderia SisLav. */
  sislavLaundryId: string
  /** URL base do app SisLav. */
  sislavApiUrl: string
}

export type ImportConfig =
  | MaxlavImportConfig
  | LaundrykitImportConfig
  | SislavImportConfig

export interface ImportStats {
  daysTotal: number
  daysProcessed: number
  daysFailed: number
  clientsLoaded: number
  ordersFetched: number
  ordersEligible: number
  ordersSent: number
  queued: number
  alreadyReceived: number
  skipped: number
  errors: number
}

export function createEmptyStats(): ImportStats {
  return {
    daysTotal: 0,
    daysProcessed: 0,
    daysFailed: 0,
    clientsLoaded: 0,
    ordersFetched: 0,
    ordersEligible: 0,
    ordersSent: 0,
    queued: 0,
    alreadyReceived: 0,
    skipped: 0,
    errors: 0,
  }
}

export type LogLevel = 'info' | 'success' | 'warn' | 'error'

export interface ImportLogEntry {
  timestamp: string
  level: LogLevel
  message: string
}

export type ImportEvent =
  | { type: 'log'; entry: ImportLogEntry }
  | { type: 'progress'; stats: ImportStats }
  | { type: 'finished'; stats: ImportStats; cancelled: boolean; error?: string }

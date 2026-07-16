import type { PaginationMeta } from './common.types'

export type CreditPaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD'

export type CreditTopupStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELED'
  | 'EXPIRED'

export type CreditLedgerType = 'TOPUP' | 'CONSUMPTION'

export enum CreditProductCode {
  WHATSAPP_API_MESSAGE = 'WHATSAPP_API_MESSAGE',
  SMS = 'SMS',
  RCS = 'RCS',
  CUSTOMER_ENRICHMENT = 'CUSTOMER_ENRICHMENT',
}

export const CREDIT_PRODUCT_CODE_LABELS: Record<CreditProductCode, string> = {
  [CreditProductCode.WHATSAPP_API_MESSAGE]: 'Mensagem WhatsApp API Oficial',
  [CreditProductCode.SMS]: 'SMS',
  [CreditProductCode.RCS]: 'RCS',
  [CreditProductCode.CUSTOMER_ENRICHMENT]: 'Enriquecimento de Dados',
}

export interface PaginatedCreditsResponse<T> {
  items: T[]
  meta: PaginationMeta
}

export interface CreditProduct {
  id: string
  companyId: string
  name: string
  code: CreditProductCode
  description?: string
  priceCents: number
  active: boolean
  createdAt: string
  updatedAt?: string
  deletedAt?: string | null
}

export interface CreditProductListParams {
  page?: number
  limit?: number
  search?: string
  active?: boolean
  includeDeleted?: boolean
}

export interface CreateCreditProductPayload {
  name: string
  code: CreditProductCode
  description?: string
  priceCents: number
  active: boolean
}

export type UpdateCreditProductPayload = Partial<
  Omit<CreateCreditProductPayload, 'code'>
>

export interface DefaultProduct {
  id: string
  name: string
  code: CreditProductCode
  description?: string
  priceCents: number
  active: boolean
  createdAt: string
  updatedAt?: string
  deletedAt?: string | null
}

export interface DefaultProductListParams {
  page?: number
  limit?: number
  search?: string
  active?: boolean
  includeDeleted?: boolean
}

export interface CreateDefaultProductPayload {
  name: string
  code: CreditProductCode
  description?: string
  priceCents: number
  active: boolean
}

export type UpdateDefaultProductPayload = Partial<
  Omit<CreateDefaultProductPayload, 'code'>
>

export interface EffectiveProduct {
  id: string
  name: string
  code: CreditProductCode
  description?: string
  priceCents: number
  active: boolean
  source: 'CUSTOM' | 'DEFAULT'
  productId: string | null
  defaultProductId: string | null
}

export interface EffectiveProductListParams {
  page?: number
  limit?: number
  search?: string
  active?: boolean
}

export interface AsaasPaymentData {
  [key: string]: unknown
  invoiceUrl?: string
  bankSlipUrl?: string
  pixQrCode?: string
  pixCopyPaste?: string
  encodedImage?: string
  payload?: string
}

export interface CreditTopup {
  id: string
  companyId: string
  amountCents: number
  paymentMethod: CreditPaymentMethod
  status: CreditTopupStatus
  asaasChargeId?: string
  asaasPayment?: AsaasPaymentData
  createdAt: string
  paidAt?: string | null
  updatedAt?: string
}

export interface CreditTopupListParams {
  page?: number
  limit?: number
  status?: CreditTopupStatus
  paymentMethod?: CreditPaymentMethod
  startDate?: string
  endDate?: string
}

export interface CreateCreditTopupPayload {
  paymentMethod: CreditPaymentMethod
  amountCents: number
}

export interface UpdateCreditTopupStatusPayload {
  status: CreditTopupStatus
  paidAt?: string
}

export interface CreditBalance {
  id: string
  companyId: string
  balanceCents: number
  createdAt: string
  updatedAt: string
}

export interface CreditLedgerEntry {
  id: string
  companyId: string
  type: CreditLedgerType
  amountCents: number
  balanceAfterCents: number
  metadata?: Record<string, unknown>
  topupId?: string
  productId?: string
  product?: CreditProduct
  topup?: CreditTopup
  createdAt: string
}

export interface CreditLedgerListParams {
  page?: number
  limit?: number
  type?: CreditLedgerType
  productId?: string
  startDate?: string
  endDate?: string
}

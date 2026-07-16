import type { PaginatedResponse, PaginationMeta } from "@/features/companies/types"

export type CycleType = "MONTHLY" | "YEARLY" | "SEMIANNUALLY" | "QUARTERLY"

export type CreditTopupStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELED"
  | "EXPIRED"

export type CreditPaymentMethod = "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "PLATFORM"

export type SubscriptionAsaasStatus = "ACTIVE" | "INACTIVE"

export type BillingType =
  | "BOLETO"
  | "PIX"
  | "CREDIT_CARD"
  | "UNDEFINED"
  | "DEBIT_CARD"

export interface Plan {
  id: string
  name: string
  description: string
  price: number
  cycle: CycleType
  recommended: boolean
  maxPayments: number
  endDate?: string | null
  active: boolean
  allowBoleto?: boolean
  allowPix?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CompanySubscriptionInternal {
  id: string
  companyId: string
  subscriptionId: string | null
  planId: string
  createdAt?: string
  updatedAt?: string
}

export interface AsaasSubscription {
  id: string
  status?: string
  value?: number
  cycle?: string
  billingType?: string
  nextDueDate?: string
  customer?: string
  description?: string
  [key: string]: unknown
}

export interface SubscriptionOverview {
  internal: CompanySubscriptionInternal
  asaas: AsaasSubscription | null
  plan: Plan | null
}

export interface AsaasPayment {
  id: string
  status?: string
  value?: number
  dueDate?: string
  billingType?: string
  description?: string
  invoiceUrl?: string
  bankSlipUrl?: string
  dateCreated?: string
  paymentDate?: string
  [key: string]: unknown
}

export interface AsaasPaymentsListResponse {
  data?: AsaasPayment[]
  totalCount?: number
  hasMore?: boolean
  [key: string]: unknown
}

export interface PaymentDetailResponse {
  payment: AsaasPayment
  barcode?: unknown
  pixQrCode?: unknown
}

export interface CreditBalance {
  companyId: string
  balanceCents: number
}

export interface CreditTopup {
  id: string
  companyId: string
  paymentMethod: CreditPaymentMethod
  status: CreditTopupStatus
  amountCents: number
  asaasChargeId: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
  asaasPayment?: AsaasPayment
}

export interface CreditProduct {
  id: string
  companyId?: string | null
  name: string
  code: string
  description?: string | null
  priceCents: number
  active: boolean
  deletedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface DefaultCreditProduct extends CreditProduct {
  companyId?: null
}

export interface CreditLedgerEntry {
  id: string
  companyId: string
  type: "TOPUP" | "CONSUMPTION"
  amountCents: number
  balanceAfterCents: number
  description?: string | null
  metadata?: Record<string, unknown> | null
  topup?: Pick<CreditTopup, "id" | "paymentMethod"> | null
  createdAt: string
}

export interface CreditTopupListParams {
  page?: number
  limit?: number
  status?: CreditTopupStatus
  paymentMethod?: CreditPaymentMethod
  startDate?: string
  endDate?: string
}

export interface CreditLedgerListParams {
  page?: number
  limit?: number
  type?: "TOPUP" | "CONSUMPTION"
  startDate?: string
  endDate?: string
}

export interface CreditProductListParams {
  page?: number
  limit?: number
  search?: string
  active?: boolean
  includeDeleted?: boolean
}

export interface PlanListParams {
  search?: string
  active?: boolean
  includeInactive?: boolean
}

export interface DefaultProductListParams {
  page?: number
  limit?: number
  search?: string
  active?: boolean
  includeDeleted?: boolean
}

export type { PaginatedResponse, PaginationMeta }

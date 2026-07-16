import { apiClient } from "@/services/api-client"
import type {
  PaginatedResponse,
  PaginationMeta,
} from "@/features/companies/types"

import type {
  AsaasPayment,
  AsaasPaymentsListResponse,
  CreditBalance,
  CreditLedgerEntry,
  CreditLedgerListParams,
  CreditProduct,
  CreditProductListParams,
  CreditTopup,
  CreditTopupListParams,
  PaymentDetailResponse,
  SubscriptionOverview,
} from "./types"
import type {
  ChangePlanInput,
  CreatePaymentInput,
  CreateTopupInput,
  GrantCreditsInput,
  ReceiveInCashInput,
  RefundPaymentInput,
  SubscriptionStatusInput,
  UpdateTopupStatusInput,
} from "./schemas"

function billingPath(companyId: string, suffix: string): string {
  return `/admin/companies/${companyId}/billing${suffix}`
}

function buildQueryString(params: object): string {
  const record = params as Record<string, string | number | boolean | undefined>
  const search = new URLSearchParams()
  Object.entries(record).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    search.set(key, String(value))
  })
  const qs = search.toString()
  return qs.length > 0 ? `?${qs}` : ""
}

type CreditsPaginatedApiResponse<T> = {
  items?: T[]
  data?: T[]
  meta?: Partial<PaginationMeta> & {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
  }
}

function normalizeCreditsPaginated<T>(
  response: CreditsPaginatedApiResponse<T>
): PaginatedResponse<T> {
  const items = response.items ?? response.data ?? []
  const page = response.meta?.page ?? 1
  const limit = response.meta?.limit ?? (items.length || 10)
  const total = response.meta?.total ?? items.length
  const totalPages =
    response.meta?.totalPages ?? Math.max(1, Math.ceil(total / (limit || 10)))

  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: response.meta?.hasNextPage ?? page < totalPages,
      hasPreviousPage: response.meta?.hasPreviousPage ?? page > 1,
    },
  }
}

export function getSubscription(
  companyId: string
): Promise<SubscriptionOverview> {
  return apiClient<SubscriptionOverview>(
    billingPath(companyId, "/subscription")
  )
}

export function listSubscriptionPayments(
  companyId: string
): Promise<AsaasPaymentsListResponse> {
  return apiClient<AsaasPaymentsListResponse>(
    billingPath(companyId, "/subscription/payments")
  )
}

export function getSubscriptionPayment(
  companyId: string,
  paymentId: string
): Promise<PaymentDetailResponse> {
  return apiClient<PaymentDetailResponse>(
    billingPath(companyId, `/subscription/payments/${paymentId}`)
  )
}

export function changePlan(
  companyId: string,
  body: ChangePlanInput
): Promise<SubscriptionOverview> {
  return apiClient<SubscriptionOverview>(
    billingPath(companyId, "/subscription"),
    { method: "PATCH", body: JSON.stringify(body) }
  )
}

export function updateSubscriptionStatus(
  companyId: string,
  body: SubscriptionStatusInput
): Promise<SubscriptionOverview> {
  return apiClient<SubscriptionOverview>(
    billingPath(companyId, "/subscription/status"),
    { method: "PATCH", body: JSON.stringify(body) }
  )
}

export function provisionSubscription(
  companyId: string,
  body?: { planId?: string }
): Promise<SubscriptionOverview> {
  return apiClient<SubscriptionOverview>(
    billingPath(companyId, "/subscription/provision"),
    {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }
  )
}

export function deleteSubscription(
  companyId: string
): Promise<SubscriptionOverview> {
  return apiClient<SubscriptionOverview>(
    billingPath(companyId, "/subscription"),
    { method: "DELETE" }
  )
}

export function createStandalonePayment(
  companyId: string,
  body: CreatePaymentInput
): Promise<AsaasPayment> {
  return apiClient<AsaasPayment>(
    billingPath(companyId, "/subscription/payments"),
    { method: "POST", body: JSON.stringify(body) }
  )
}

export function receivePaymentInCash(
  companyId: string,
  paymentId: string,
  body: ReceiveInCashInput
): Promise<AsaasPayment> {
  return apiClient<AsaasPayment>(
    billingPath(companyId, `/subscription/payments/${paymentId}/receive-in-cash`),
    { method: "POST", body: JSON.stringify(body) }
  )
}

export function deletePayment(
  companyId: string,
  paymentId: string
): Promise<unknown> {
  return apiClient(
    billingPath(companyId, `/subscription/payments/${paymentId}`),
    { method: "DELETE" }
  )
}

export function refundPayment(
  companyId: string,
  paymentId: string,
  body: RefundPaymentInput
): Promise<unknown> {
  return apiClient(
    billingPath(companyId, `/subscription/payments/${paymentId}/refund`),
    { method: "POST", body: JSON.stringify(body) }
  )
}

export function getCreditBalance(companyId: string): Promise<CreditBalance> {
  return apiClient<CreditBalance>(
    billingPath(companyId, "/credits/balance")
  )
}

export function listCreditTopups(
  companyId: string,
  params: CreditTopupListParams = {}
): Promise<PaginatedResponse<CreditTopup>> {
  return apiClient<CreditsPaginatedApiResponse<CreditTopup>>(
    billingPath(companyId, `/credits/topups${buildQueryString(params)}`)
  ).then(normalizeCreditsPaginated)
}

export function createCreditTopup(
  companyId: string,
  body: CreateTopupInput
): Promise<CreditTopup> {
  return apiClient<CreditTopup>(
    billingPath(companyId, "/credits/topups"),
    { method: "POST", body: JSON.stringify(body) }
  )
}

export function grantPlatformCredits(
  companyId: string,
  body: GrantCreditsInput
): Promise<CreditTopup> {
  return apiClient<CreditTopup>(
    billingPath(companyId, "/credits/grants"),
    { method: "POST", body: JSON.stringify(body) }
  )
}

export function recoverCreditTopup(
  companyId: string,
  asaasChargeId: string
): Promise<CreditTopup> {
  return apiClient<CreditTopup>(
    billingPath(companyId, "/credits/topups/recover"),
    {
      method: "POST",
      body: JSON.stringify({ asaasChargeId }),
    }
  )
}

export function updateTopupStatus(
  companyId: string,
  topupId: string,
  body: UpdateTopupStatusInput
): Promise<CreditTopup> {
  return apiClient<CreditTopup>(
    billingPath(companyId, `/credits/topups/${topupId}/status`),
    { method: "PATCH", body: JSON.stringify(body) }
  )
}

export function receiveTopupInCash(
  companyId: string,
  topupId: string,
  body: ReceiveInCashInput
): Promise<CreditTopup> {
  return apiClient<CreditTopup>(
    billingPath(companyId, `/credits/topups/${topupId}/receive-in-cash`),
    { method: "POST", body: JSON.stringify(body) }
  )
}

export function syncTopupFromAsaas(
  companyId: string,
  topupId: string
): Promise<CreditTopup> {
  return apiClient<CreditTopup>(
    billingPath(companyId, `/credits/topups/${topupId}/sync-asaas`),
    { method: "POST" }
  )
}

export function deleteTopupAsaasCharge(
  companyId: string,
  topupId: string
): Promise<CreditTopup> {
  return apiClient<CreditTopup>(
    billingPath(companyId, `/credits/topups/${topupId}/asaas-charge`),
    { method: "DELETE" }
  )
}

export function listCreditProducts(
  companyId: string,
  params: CreditProductListParams = {}
): Promise<PaginatedResponse<CreditProduct>> {
  return apiClient<CreditsPaginatedApiResponse<CreditProduct>>(
    billingPath(companyId, `/credits/products${buildQueryString(params)}`)
  ).then(normalizeCreditsPaginated)
}

export function listEffectiveCreditProducts(
  companyId: string,
  params: CreditProductListParams = {}
): Promise<PaginatedResponse<CreditProduct>> {
  return apiClient<CreditsPaginatedApiResponse<CreditProduct>>(
    billingPath(
      companyId,
      `/credits/products/effective${buildQueryString(params)}`
    )
  ).then(normalizeCreditsPaginated)
}

export function getCreditProduct(
  companyId: string,
  id: string
): Promise<CreditProduct> {
  return apiClient<CreditProduct>(
    billingPath(companyId, `/credits/products/${id}`)
  )
}

export function createCreditProduct(
  companyId: string,
  body: Record<string, unknown>
): Promise<CreditProduct> {
  return apiClient<CreditProduct>(
    billingPath(companyId, "/credits/products"),
    { method: "POST", body: JSON.stringify(body) }
  )
}

export function updateCreditProduct(
  companyId: string,
  id: string,
  body: Record<string, unknown>
): Promise<CreditProduct> {
  return apiClient<CreditProduct>(
    billingPath(companyId, `/credits/products/${id}`),
    { method: "PUT", body: JSON.stringify(body) }
  )
}

export function toggleCreditProductActive(
  companyId: string,
  id: string
): Promise<CreditProduct> {
  return apiClient<CreditProduct>(
    billingPath(companyId, `/credits/products/${id}/toggle-active`),
    { method: "PUT" }
  )
}

export function restoreCreditProduct(
  companyId: string,
  id: string
): Promise<CreditProduct> {
  return apiClient<CreditProduct>(
    billingPath(companyId, `/credits/products/${id}/restore`),
    { method: "PUT" }
  )
}

export function deleteCreditProduct(
  companyId: string,
  id: string
): Promise<void> {
  return apiClient<void>(
    billingPath(companyId, `/credits/products/${id}`),
    { method: "DELETE" }
  )
}

export function listCreditLedger(
  companyId: string,
  params: CreditLedgerListParams = {}
): Promise<PaginatedResponse<CreditLedgerEntry>> {
  return apiClient<CreditsPaginatedApiResponse<CreditLedgerEntry>>(
    billingPath(companyId, `/credits/ledger${buildQueryString(params)}`)
  ).then(normalizeCreditsPaginated)
}

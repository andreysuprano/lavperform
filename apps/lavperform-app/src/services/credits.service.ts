import type {
  CreateDefaultProductPayload,
  CreateCreditProductPayload,
  CreateCreditTopupPayload,
  CreditBalance,
  CreditLedgerEntry,
  CreditLedgerListParams,
  CreditProduct,
  CreditProductListParams,
  CreditTopup,
  CreditTopupListParams,
  DefaultProduct,
  DefaultProductListParams,
  EffectiveProduct,
  EffectiveProductListParams,
  PaginatedCreditsResponse,
  UpdateDefaultProductPayload,
  UpdateCreditProductPayload,
  UpdateCreditTopupStatusPayload,
} from '@/types'

import { client } from './client'

const basePath = (companyId: string) => `/credits/${companyId}`
const defaultProductsPath = '/credits/default-products'

export const creditsService = {
  async listDefaultProducts(params?: DefaultProductListParams) {
    return await client.get<DefaultProduct[]>(defaultProductsPath, { params })
  },

  async createDefaultProduct(payload: CreateDefaultProductPayload) {
    return await client.post<DefaultProduct>(defaultProductsPath, payload)
  },

  async getDefaultProduct(defaultProductId: string) {
    return await client.get<DefaultProduct>(
      `${defaultProductsPath}/${defaultProductId}`
    )
  },

  async updateDefaultProduct(
    defaultProductId: string,
    payload: UpdateDefaultProductPayload
  ) {
    return await client.put<DefaultProduct>(
      `${defaultProductsPath}/${defaultProductId}`,
      payload
    )
  },

  async toggleDefaultProductActive(defaultProductId: string) {
    return await client.put<DefaultProduct>(
      `${defaultProductsPath}/${defaultProductId}/toggle-active`
    )
  },

  async deleteDefaultProduct(defaultProductId: string) {
    return await client.delete<void>(
      `${defaultProductsPath}/${defaultProductId}`
    )
  },

  async restoreDefaultProduct(defaultProductId: string) {
    return await client.put<DefaultProduct>(
      `${defaultProductsPath}/${defaultProductId}/restore`
    )
  },

  async listProducts(companyId: string, params?: CreditProductListParams) {
    return await client.get<PaginatedCreditsResponse<CreditProduct>>(
      `${basePath(companyId)}/products`,
      { params }
    )
  },

  async createProduct(companyId: string, payload: CreateCreditProductPayload) {
    return await client.post<CreditProduct>(
      `${basePath(companyId)}/products`,
      payload
    )
  },

  async getProduct(companyId: string, productId: string) {
    return await client.get<CreditProduct>(
      `${basePath(companyId)}/products/${productId}`
    )
  },

  async updateProduct(
    companyId: string,
    productId: string,
    payload: UpdateCreditProductPayload
  ) {
    return await client.put<CreditProduct>(
      `${basePath(companyId)}/products/${productId}`,
      payload
    )
  },

  async toggleProductActive(companyId: string, productId: string) {
    return await client.put<CreditProduct>(
      `${basePath(companyId)}/products/${productId}/toggle-active`
    )
  },

  async deleteProduct(companyId: string, productId: string) {
    return await client.delete<void>(
      `${basePath(companyId)}/products/${productId}`
    )
  },

  async restoreProduct(companyId: string, productId: string) {
    return await client.put<CreditProduct>(
      `${basePath(companyId)}/products/${productId}/restore`
    )
  },

  async listEffectiveProducts(
    companyId: string,
    params?: EffectiveProductListParams
  ) {
    return await client.get<PaginatedCreditsResponse<EffectiveProduct>>(
      `${basePath(companyId)}/products/effective`,
      { params }
    )
  },

  async createTopup(companyId: string, payload: CreateCreditTopupPayload) {
    return await client.post<CreditTopup>(
      `${basePath(companyId)}/topups`,
      payload
    )
  },

  async listTopups(companyId: string, params?: CreditTopupListParams) {
    return await client.get<PaginatedCreditsResponse<CreditTopup>>(
      `${basePath(companyId)}/topups`,
      { params }
    )
  },

  async getTopup(companyId: string, topupId: string) {
    return await client.get<CreditTopup>(
      `${basePath(companyId)}/topups/${topupId}`
    )
  },

  async updateTopupStatus(
    companyId: string,
    topupId: string,
    payload: UpdateCreditTopupStatusPayload
  ) {
    return await client.patch<CreditTopup>(
      `${basePath(companyId)}/topups/${topupId}/status`,
      payload
    )
  },

  async getBalance(companyId: string) {
    return await client.get<CreditBalance>(`${basePath(companyId)}/balance`)
  },

  async listLedger(companyId: string, params?: CreditLedgerListParams) {
    return await client.get<PaginatedCreditsResponse<CreditLedgerEntry>>(
      `${basePath(companyId)}/ledger`,
      { params }
    )
  },
}

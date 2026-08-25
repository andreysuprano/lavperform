import { apiClient } from "@/services/api-client"

import type {
  Company,
  CompanyListParams,
  CompanyStatus,
  CompanyUser,
  PaginatedResponse,
} from "./types"
import type { CreateCompanyInput, UpdateCompanyInput } from "./schemas"
import { onlyDigits } from "./utils"

function buildQueryString(params: CompanyListParams): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    search.set(key, String(value))
  })
  const qs = search.toString()
  return qs.length > 0 ? `?${qs}` : ""
}

export function listCompanies(
  params: CompanyListParams = {}
): Promise<PaginatedResponse<Company>> {
  return apiClient<PaginatedResponse<Company>>(
    `/admin/companies${buildQueryString(params)}`
  )
}

export function getCompany(id: string): Promise<Company> {
  return apiClient<Company>(`/admin/companies/${id}`)
}

function cleanup<T extends Record<string, unknown>>(input: T): T {
  const output = { ...input }
  Object.keys(output).forEach((key) => {
    const value = output[key]
    if (typeof value === "string" && value.trim() === "") {
      delete output[key]
    }
  })
  return output
}

export function createCompany(input: CreateCompanyInput): Promise<Company> {
  const body = cleanup({
    ...input,
    cnpj: onlyDigits(input.cnpj),
    zipCode: onlyDigits(input.zipCode),
    state: input.state.toUpperCase(),
  })
  return apiClient<Company>("/admin/companies", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function updateCompany(
  id: string,
  input: UpdateCompanyInput
): Promise<Company> {
  const { complement, ...addressFields } = input.address
  const address = {
    ...cleanup({
      ...addressFields,
      zipCode: onlyDigits(addressFields.zipCode),
      state: addressFields.state.toUpperCase(),
    }),
    // Vazio → null para limpar no banco; omitir quebrava a validação antiga
    complement: complement?.trim() ? complement.trim() : null,
  }

  const body = cleanup({
    ...input,
    cnpj: onlyDigits(input.cnpj),
    address,
  })
  return apiClient<Company>(`/admin/companies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export function deleteCompany(id: string): Promise<void> {
  return apiClient<void>(`/admin/companies/${id}`, { method: "DELETE" })
}

export function updateCompanyState(
  id: string,
  state: CompanyStatus
): Promise<Company> {
  return apiClient<Company>(`/admin/companies/${id}/state/${state}`, {
    method: "PATCH",
  })
}

export function listCompanyUsers(id: string): Promise<CompanyUser[]> {
  return apiClient<CompanyUser[]>(`/admin/companies/${id}/users`)
}

export type ValidateWhatsappResponse = {
  message: string
  companyId: string
  totalEnqueued: number
}

export function validateCompanyWhatsapp(
  id: string
): Promise<ValidateWhatsappResponse> {
  return apiClient<ValidateWhatsappResponse>(
    `/admin/companies/${id}/customers/validate-whatsapp`,
    { method: "POST" }
  )
}

export type ReprocessRfvResponse = {
  message: string
  companyId: string
}

export function reprocessCompanyRfv(id: string): Promise<ReprocessRfvResponse> {
  return apiClient<ReprocessRfvResponse>(
    `/admin/companies/${id}/rfv/reprocess`,
    { method: "POST" }
  )
}

export type DuplicateReviewCustomer = {
  id: string
  name: string
  phone: string | null
  cpf: string | null
  orderCount: number
  createdAt: string
}

export type DuplicateReviewGroup = {
  id: string
  source: "phone" | "cpf" | "cross"
  matchValue: string | null
  reviewId: string | null
  customers: DuplicateReviewCustomer[]
}

export type CustomerDuplicatesPreview = {
  companyId: string
  autoMergeGroups: number
  reviewGroups: number
  review: DuplicateReviewGroup[]
}

export type ScanCustomerDuplicatesResponse = {
  message: string
  jobId: string | null
  preview: {
    autoMergeGroups: number
    reviewGroups: number
  }
}

export function listCustomerDuplicates(
  companyId: string
): Promise<CustomerDuplicatesPreview> {
  return apiClient<CustomerDuplicatesPreview>(
    `/admin/customers/duplicates?companyId=${encodeURIComponent(companyId)}`
  )
}

export function scanCustomerDuplicates(
  companyId: string
): Promise<ScanCustomerDuplicatesResponse> {
  return apiClient<ScanCustomerDuplicatesResponse>(
    "/admin/customers/duplicates/scan",
    {
      method: "POST",
      body: JSON.stringify({ companyId }),
    }
  )
}

export function mergeCustomers(input: {
  companyId: string
  survivorId: string
  absorbedIds: string[]
}): Promise<{ survivorId: string; absorbedIds: string[] }> {
  return apiClient("/admin/customers/merge", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function keepSeparateCustomers(input: {
  companyId: string
  keepIdentifierOnCustomerId: string
  peerIds: string[]
}): Promise<{ keepIdentifierOnCustomerId: string; peerIds: string[] }> {
  return apiClient("/admin/customers/duplicates/keep-separate", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

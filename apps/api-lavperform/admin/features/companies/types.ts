export type CompanyStatus = "ACTIVE" | "INACTIVE" | "PENDING"

export const COMPANY_STATUS_VALUES: CompanyStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "PENDING",
]

export interface Address {
  id?: string
  zipCode: string
  street: string
  number: string
  complement?: string | null
  neighborhood: string
  city: string
  state: string
}

export interface Company {
  id: string
  name: string
  cnpj: string
  email: string
  phone: string | null
  avatarUrl: string | null
  slug: string | null
  state: CompanyStatus
  businessPartnerId: string | null
  addressId: string | null
  address?: Address | null
  createdAt: string
  updatedAt: string
}

export interface CompanyUser {
  id: string
  name: string
  email: string
  phone: string | null
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginationMeta
}

export interface CompanyListParams {
  page?: number
  limit?: number
  orderBy?: string
  orderDirection?: "asc" | "desc"
  id?: string
  name?: string
  state?: CompanyStatus
  startDate?: string
  endDate?: string
}

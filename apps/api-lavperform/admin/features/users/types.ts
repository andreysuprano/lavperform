export interface User {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface UserListParams {
  page?: number
  limit?: number
  orderBy?: string
  orderDirection?: "asc" | "desc"
  id?: string
  startDate?: string
  endDate?: string
}

export interface UserCompanyLink {
  id: string
  userId: string
  companyId: string
  createdAt: string
  updatedAt: string
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

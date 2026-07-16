export type AdminPanelRole =
  | "SUPER_ADMIN"
  | "SDR"
  | "CLOSER"
  | "REVOPS"
  | "CSM"
  | "CS"

export interface PanelAdministrator {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: AdminPanelRole | "ADMIN"
  isActive: boolean
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

export interface AdministratorListParams {
  page?: number
  limit?: number
  orderBy?: string
  orderDirection?: "asc" | "desc"
  name?: string
  email?: string
  role?: AdminPanelRole
  isActive?: boolean
  startDate?: string
  endDate?: string
}

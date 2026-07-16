export type OrderDirection = 'asc' | 'desc'

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface RedirectResponse {
  redirectUrl: string
}

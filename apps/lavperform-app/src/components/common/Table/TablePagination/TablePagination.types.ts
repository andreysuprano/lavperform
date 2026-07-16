export interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface Props<T> {
  data: T[]
  meta?: Meta
  handleLimitChange: (limit: number) => void
  handlePageChange: (page: number) => void
}

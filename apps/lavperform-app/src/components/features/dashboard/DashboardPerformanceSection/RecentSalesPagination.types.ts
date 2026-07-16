import type { PaginationMeta } from '@/types'

export interface Props {
  meta?: PaginationMeta
  onPageChange: (page: number) => void
}

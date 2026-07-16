import type { PropsWithChildren, ReactNode } from 'react'

import { TablePaginationProps } from './TablePagination/TablePagination'

export interface Props<T> extends PropsWithChildren, TablePaginationProps<T> {
  css?: object
  emptyStateMessage: string
  header: ReactNode
  isLoading: boolean
  maxHeight?: string | number
}

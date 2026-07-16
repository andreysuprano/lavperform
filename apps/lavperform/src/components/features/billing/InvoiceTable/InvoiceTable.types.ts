import { InvoiceItem } from '../InvoiceDetailsDrawer/InvoiceDetailsDrawer.types'

export interface Props {
  data: InvoiceItem[]
  isLoading: boolean
  onItemClick: (item: InvoiceItem) => void
  onLimitChange: (limit: number) => void
  onPageChange: (page: number) => void
}

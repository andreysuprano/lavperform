import type { Customer } from '@/types'

export type Props = {
  data: Customer | null
  isOpen: boolean
  onClose: () => void
}


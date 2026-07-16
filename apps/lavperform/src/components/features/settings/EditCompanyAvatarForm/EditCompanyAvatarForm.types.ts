import { Company } from '@/types'

export interface Props {
  company: Company
  onClose: () => void
  onSuccess: () => void
}

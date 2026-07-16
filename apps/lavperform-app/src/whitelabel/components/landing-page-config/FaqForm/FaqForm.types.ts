import type { FaqData } from '../../../types'

export interface Props {
  data: FaqData
  onChange: (data: FaqData) => void
}

import type { ServicesData } from '../../../types'

export interface Props {
  data: ServicesData
  onChange: (data: ServicesData) => void
}

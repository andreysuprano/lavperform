import type { LocationData } from '../../../types'

export interface Props {
  data: LocationData
  onChange: (data: LocationData) => void
}

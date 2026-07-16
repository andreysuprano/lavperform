import type { WeatherCondition } from '@/whitelabel/types'

export interface Props {
  conditions: WeatherCondition[]
  onConditionsChange: (conditions: WeatherCondition[]) => void
  disabled?: boolean
}

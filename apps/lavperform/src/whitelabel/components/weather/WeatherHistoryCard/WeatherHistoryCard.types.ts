import type { WeatherAlertHistory } from '@/whitelabel/types'

export interface Props {
  history?: WeatherAlertHistory[]
  isLoading?: boolean
  onAlertClick?: (alert: WeatherAlertHistory) => void
}

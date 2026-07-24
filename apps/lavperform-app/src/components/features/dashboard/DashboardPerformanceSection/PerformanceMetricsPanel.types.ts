import type { DashboardPerformanceData } from '@/types'

export interface Props {
  isError?: boolean
  isLoading?: boolean
  performance?: DashboardPerformanceData
  /** When false, only the chart is shown (daily KPI cards live elsewhere). */
  showDailyCards?: boolean
}

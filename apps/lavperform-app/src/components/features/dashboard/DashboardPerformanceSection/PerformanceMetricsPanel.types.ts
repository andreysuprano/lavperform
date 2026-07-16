import type { DashboardPerformanceData } from '@/types'

export interface Props {
  isError?: boolean
  isLoading?: boolean
  performance?: DashboardPerformanceData
}

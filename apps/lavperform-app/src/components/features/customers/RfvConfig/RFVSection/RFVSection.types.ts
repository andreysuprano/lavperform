import type { RFVLevel } from '@/types'

export interface Props {
  title: string
  description: string
  dimension: RFVLevel['dimension']
  levels: RFVLevel[]
  onLevelChange: (levelId: number, updated: Partial<RFVLevel>) => void
}


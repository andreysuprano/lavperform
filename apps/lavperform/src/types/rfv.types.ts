export type RFVDimension = 'RECENCY' | 'FREQUENCY' | 'MONETARY'

export interface RFVLevel {
  id: number
  dimension: RFVDimension
  label: string
  minValue: number | null
  maxValue: number | null
}

export interface RFVSettings {
  recencyLevels: RFVLevel[]
  frequencyLevels: RFVLevel[]
  monetaryLevels: RFVLevel[]
}

/** Shape real do endpoint /rfv-engine/configuration/{companyId} */
export interface RFVConfiguration {
  id: string
  companyId: string
  autoRecalculate: boolean
  recalculateFrequency: string
  recencyPeriodDays: number
  frequencyPeriodDays: number
  monetaryPeriodDays: number
  recencyThresholds: number[]
  frequencyThresholds: number[]
  monetaryThresholds: number[]
  createdAt: string
  updatedAt: string
}


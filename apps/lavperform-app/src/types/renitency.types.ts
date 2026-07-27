export interface RenitencyConfiguration {
  id: string
  companyId: string
  minDaysBetween: number
  createdAt: string
  updatedAt: string
}

export type UpdateRenitencyConfigurationPayload = {
  minDaysBetween: number
}

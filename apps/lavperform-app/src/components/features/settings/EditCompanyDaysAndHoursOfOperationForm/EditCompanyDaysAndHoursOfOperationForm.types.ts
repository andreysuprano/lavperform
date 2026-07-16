import type { CompanyOpeningHour } from '@/types'

export interface ScheduleData {
  operatingDays: CompanyOpeningHour[]
}

export type Props = {
  schedule: ScheduleData
  onClose: () => void
  onSuccess: (updatedData: ScheduleData) => Promise<void> | void
}

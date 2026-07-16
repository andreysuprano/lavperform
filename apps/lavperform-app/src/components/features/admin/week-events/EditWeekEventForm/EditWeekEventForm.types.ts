import type { WeekEvent } from '@/types'

export interface EditWeekEventFormData {
  title: string
  description: string
  coverImage: FileList | null
  ctaLabel: string
  ctaUrl: string
  isStream: boolean
  eventDate: string
}

export interface EditWeekEventFormProps {
  isOpen: boolean
  onClose: () => void
  event: WeekEvent
}

export interface CreateWeekEventFormData {
  title: string
  description: string
  coverImage: FileList | null
  ctaLabel: string
  ctaUrl: string
  isStream: boolean
  eventDate: string
}

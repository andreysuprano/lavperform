import type { CarrouselItem } from '@/types'

export interface CreateCarrouselItemFormData {
  title: string
  description: string
  videoUrl?: string
  thumbnailUrl: FileList | null
  ctaLabel: string
  ctaUrl: string
  order: number
  isStream: boolean
}

export interface CreateCarrouselItemFormProps {
  allItems?: CarrouselItem[]
}

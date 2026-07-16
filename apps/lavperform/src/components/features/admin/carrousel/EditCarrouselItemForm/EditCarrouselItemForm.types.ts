import type { CarrouselItem } from '@/types'

export interface EditCarrouselItemFormData {
  title: string
  description: string
  videoUrl?: string
  thumbnailUrl: FileList | null
  ctaLabel: string
  ctaUrl: string
  order: number
  isStream: boolean
}

export interface EditCarrouselItemFormProps {
  isOpen: boolean
  onClose: () => void
  item: CarrouselItem
  allItems?: CarrouselItem[]
}

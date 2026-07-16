import { ReactNode } from 'react'

export interface CarouselItem {
  id: string
  order?: number
}

export type Props<T extends CarouselItem> = {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  autoPlayInterval?: number
  showControls?: boolean
  showIndicators?: boolean
  onItemChange?: (index: number, item: T) => void
  height?: string | Record<string, string>
  pauseOnHover?: boolean
}

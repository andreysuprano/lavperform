import { ElementType, ReactNode } from 'react'

export type Props = {
  name: string
  icon: ElementType
  description: string
  badgeLabel?: string
  badgeColorPalette?: string
  action: ReactNode
  isAvailable?: boolean
}

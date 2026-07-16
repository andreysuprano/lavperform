import type { ElementType, ReactNode } from 'react'

export type Props = {
  name: string
  icon: ElementType
  badge?: ReactNode
  statusIndicator?: ReactNode
}

import type { ElementType, ReactNode } from 'react'

export type Props = {
  name: string
  icon: ElementType
  badge?: ReactNode
  /** Linha auxiliar abaixo do badge, como o número conectado. */
  subtitle?: ReactNode
  statusIndicator?: ReactNode
}

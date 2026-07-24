import type { ReactNode } from 'react'

export type Props = {
  children: ReactNode
  /** Título customizado exibido quando um erro é capturado. */
  fallbackTitle?: string
  /** Descrição customizada exibida quando um erro é capturado. */
  fallbackDescription?: string
}

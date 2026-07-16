import type { ReactNode } from 'react'

export interface Props {
  level: number
  value: number | null
  beforeInput?: ReactNode
  afterInput?: ReactNode
  step?: number
  onChange: (value: number | null) => void
}



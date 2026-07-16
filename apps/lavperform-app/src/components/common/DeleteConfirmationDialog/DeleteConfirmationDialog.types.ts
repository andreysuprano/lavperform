import { ReactNode } from 'react'

export type Props = {
  description?: string
  isLoading: boolean
  onClick: () => void | Promise<void>
  title: string
  trigger?: ReactNode
  confirmButton?: ReactNode
}

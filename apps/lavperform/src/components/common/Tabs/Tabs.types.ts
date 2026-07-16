import { ReactNode } from 'react'

export type TabItem = {
  element: ReactNode
  label: string
}

export type Props = {
  data: TabItem[]
}

import { PropsWithChildren } from 'react'

export type Props = PropsWithChildren & {
  title: string
  description?: string
  highlight?: string
}

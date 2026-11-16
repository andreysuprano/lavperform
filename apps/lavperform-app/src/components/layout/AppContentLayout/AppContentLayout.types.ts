import { PropsWithChildren } from 'react'

export interface Props extends PropsWithChildren {
  title: React.ReactNode
  icon: React.ReactNode
  iconBg?: string
  action?: React.ReactNode
}

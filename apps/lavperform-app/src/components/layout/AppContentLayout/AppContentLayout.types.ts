import { PropsWithChildren } from 'react'

export interface Props extends PropsWithChildren {
  title: React.ReactNode
  icon: React.ReactNode
  action?: React.ReactNode
}

import { PropsWithChildren } from 'react'

export type Props = PropsWithChildren & {}

export type PropsSubmenu = {
  currentMenuItem: {
    label: string
    icon: any
    links: { label: string; href: string; icon: any }[] | undefined
    href: string
  }
  open: boolean
  location: any
}

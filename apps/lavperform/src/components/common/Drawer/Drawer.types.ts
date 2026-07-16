import { DrawerRootProps } from '@chakra-ui/react'
import { PropsWithChildren, ReactNode } from 'react'

export type Props = PropsWithChildren &
  DrawerRootProps & {
    title?: string | ReactNode
    trigger?: ReactNode
    closeTrigger?: boolean
    footer?: ReactNode
    isOpen?: boolean
    onOpenChange?: (details: { open: boolean }) => void
  }

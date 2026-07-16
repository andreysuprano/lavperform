import { DialogRootProps } from '@chakra-ui/react'
import { ReactNode } from 'react'

export type Props = Omit<DialogRootProps, 'children'> & {
  closeTrigger?: boolean
  content?: ReactNode
  contentMaxW?: string | number
  description?: string | ReactNode
  footer?: ReactNode
  isOpen?: boolean
  onOpenChange?: (details: { open: boolean }) => void
  title?: string | ReactNode
  trigger?: ReactNode
}

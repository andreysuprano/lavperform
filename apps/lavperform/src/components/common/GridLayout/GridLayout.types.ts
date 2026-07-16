import { SimpleGridProps } from '@chakra-ui/react'
import { ReactNode } from 'react'

export interface Props<T> extends SimpleGridProps {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  gap?: number | string
}

import { ImageProps } from '@chakra-ui/react'

export interface Props extends ImageProps {
  src: string
  alt: string
  placeholderSrc?: string
  threshold?: number
}

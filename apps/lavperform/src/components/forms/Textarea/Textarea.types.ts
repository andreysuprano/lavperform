import { TextareaProps } from '@chakra-ui/react'

export type Props = TextareaProps & {
  name: string
  label: string
  control: any | undefined
  mask?: string
}

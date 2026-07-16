import { ListCollection, SelectRootProps } from '@chakra-ui/react'

export type Props<T> = SelectRootProps & {
  name: string
  control: any | undefined
  label: string
  placeholder: string
  collection: ListCollection<T>
  disabled?: boolean
  multiple?: boolean
}

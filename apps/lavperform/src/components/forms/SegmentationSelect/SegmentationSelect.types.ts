import { ListCollection, SelectRootProps } from '@chakra-ui/react'

export type Props = SelectRootProps & {
  name: string
  control: any | undefined
  label: string
  placeholder: string
  collection: ListCollection
  disabled?: boolean
  multiple?: boolean
}

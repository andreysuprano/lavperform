import { InputProps } from '@chakra-ui/react'
import { FieldValues, UseControllerProps } from 'react-hook-form'

export interface Props<T extends FieldValues>
  extends UseControllerProps<T>,
    Omit<InputProps, 'defaultValue' | 'name'> {
  label?: string
  mask?: string
}

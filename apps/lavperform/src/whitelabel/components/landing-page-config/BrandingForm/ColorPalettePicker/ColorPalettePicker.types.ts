import type { Control, FieldValues } from 'react-hook-form'

export interface Props<T extends FieldValues = FieldValues> {
  control: Control<T>
  primaryColorName: string
  secondaryColorName: string
  tertiaryColorName: string
}

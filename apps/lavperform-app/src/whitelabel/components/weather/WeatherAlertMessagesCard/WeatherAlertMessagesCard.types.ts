import type { Control, FieldValues, Path } from 'react-hook-form'

export interface Props<T extends FieldValues> {
  control: Control<T>
  disabled?: boolean
  name: Path<T>
}

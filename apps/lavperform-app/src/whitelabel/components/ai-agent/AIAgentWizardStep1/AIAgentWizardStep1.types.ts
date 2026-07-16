import type { Control } from 'react-hook-form'

export interface Step1FormData {
  name: string
  description: string
}

export interface Props {
  control: Control<Step1FormData>
}

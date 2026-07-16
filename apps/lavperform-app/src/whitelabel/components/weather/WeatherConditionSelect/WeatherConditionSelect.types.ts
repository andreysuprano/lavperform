import { FieldValues } from 'react-hook-form'
import type { WeatherConditionAPI } from '@/whitelabel/types'

export interface Props<T extends FieldValues> {
  name: keyof T & string
  control: any
  label?: string
  required?: boolean
  disabled?: boolean
}

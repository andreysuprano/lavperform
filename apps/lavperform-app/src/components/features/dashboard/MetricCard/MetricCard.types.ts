import { IconType } from 'react-icons'

export interface Props {
  change?: number
  icon: IconType
  inline?: boolean
  label: string
  size?: 'sm' | 'md'
  value: number | string
  valueType?: 'number' | 'percent' | 'currency' | 'currency-full' | 'text'
}

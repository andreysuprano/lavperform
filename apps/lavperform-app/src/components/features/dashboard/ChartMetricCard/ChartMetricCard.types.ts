import { IconType } from 'react-icons'

export type Props = {
  data?: Array<{ value: number }>
  icon?: IconType
  label: string
  value: string | number | React.ReactNode
  helpText?: string
  helpTextColor?: string
  maxValue?: number
  showTrend?: boolean
}

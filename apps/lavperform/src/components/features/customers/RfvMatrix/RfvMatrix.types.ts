import type { RfvMatrixData } from '@/types'
import type { RfvSegmentCategory } from '@/utils/constants/rfvMatrix/categories'

export interface Props {
  companyId?: string
  selectedCategories?: RfvSegmentCategory[]
  onCategoryToggle?: (categoryId: RfvSegmentCategory) => void
}

export interface CellProps {
  segmentKey: keyof RfvMatrixData
  label: string
  count: number
  percentage: number
  x: number
  y: number
  width: number
  height: number
  color: string
  zIndex?: number
}

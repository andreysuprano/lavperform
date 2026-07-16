import type { SegmentAttribution } from '@/types'

export interface Props {
  isOpen: boolean
  segment: SegmentAttribution | null
  onClose: () => void
}


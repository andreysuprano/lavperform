import type { SegmentAttribution } from '@/types'

export interface Props {
  segment: SegmentAttribution
  onClick: (segment: SegmentAttribution) => void
}

